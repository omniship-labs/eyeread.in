//! Reading a pack's files safely, from a `.zip` or (Developer mode) a folder.
//!
//! Everything is read into memory first (a pack is at most 20 MiB) and every
//! entry is checked before anything touches the disk: no path can escape the
//! pack, no link or device file gets through, and the limits are enforced on
//! the bytes actually read, not the sizes a zip claims. This is step 1 of the
//! spec's check order (`spec/packs/FORMAT.md`, "Validation errors").

use super::error::{mib, PackError, PackResult};
use std::collections::HashMap;
use std::fs;
use std::io::{Cursor, Read};
use std::path::Path;

pub const MAX_ZIP_BYTES: u64 = 20 * 1024 * 1024;
pub const MAX_TOTAL_BYTES: u64 = 20 * 1024 * 1024;
pub const MAX_FILE_BYTES: u64 = 5 * 1024 * 1024;
pub const MAX_FILES: usize = 500;
const MAX_PATH_BYTES: usize = 255;
const MAX_PATH_DEPTH: usize = 16;

const ALLOWED_EXTENSIONS: [&str; 12] = [
    "js", "mjs", "json", "md", "txt", "css", "svg", "png", "jpg", "jpeg", "gif", "webp",
];
const ALLOWED_BARE_NAMES: [&str; 6] = [
    "LICENSE",
    "COPYING",
    "NOTICE",
    "README",
    "AUTHORS",
    "CHANGELOG",
];
pub const FILES_JSON: &str = "files.json";
pub const SIGNATURE_FILE: &str = "files.json.minisig";

/// One regular file of a pack: its path inside the pack (always `/`) and bytes.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Entry {
    pub path: String,
    pub bytes: Vec<u8>,
}

/// What an entry claims to be, before its checks run.
enum Kind {
    File,
    Dir,
    /// Symlink, hard link, device, FIFO… anything but a file or directory.
    Special,
}

struct RawEntry {
    name: Result<String, Vec<u8>>,
    kind: Kind,
    bytes: Vec<u8>,
}

/// `__MACOSX/…` and `.DS_Store` are Finder noise: never extracted or hashed.
fn is_skipped(path: &str) -> bool {
    path == "__MACOSX"
        || path.starts_with("__MACOSX/")
        || path.rsplit('/').next() == Some(".DS_Store")
}

/// The spec's path rule: relative, `/`-separated, no `.`/`..`/empty segments,
/// no backslash or control characters, bounded length and depth.
pub fn path_is_safe(path: &str) -> bool {
    let trimmed = path.strip_suffix('/').unwrap_or(path);
    if trimmed.is_empty()
        || trimmed.len() > MAX_PATH_BYTES
        || trimmed.starts_with('/')
        || trimmed.contains('\\')
        || trimmed.chars().any(char::is_control)
    {
        return false;
    }
    // A drive letter ("C:…") would be absolute on Windows.
    let bytes = trimmed.as_bytes();
    if bytes.len() >= 2 && bytes[1] == b':' && bytes[0].is_ascii_alphabetic() {
        return false;
    }
    let segments: Vec<&str> = trimmed.split('/').collect();
    segments.len() <= MAX_PATH_DEPTH
        && segments
            .iter()
            .all(|s| !s.is_empty() && *s != "." && *s != "..")
}

pub fn file_type_allowed(path: &str) -> bool {
    let name = path.rsplit('/').next().unwrap_or(path);
    if name == SIGNATURE_FILE {
        return true;
    }
    match name.rsplit_once('.') {
        Some((stem, ext)) if !stem.is_empty() => {
            ALLOWED_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str())
        }
        _ => ALLOWED_BARE_NAMES.contains(&name),
    }
}

/// Read a bounded amount from `reader`; the entry and running totals are
/// checked against what was actually read.
fn read_limited(reader: impl Read, path: &str, total: &mut u64) -> PackResult<Vec<u8>> {
    let mut bytes = Vec::new();
    reader
        .take(MAX_FILE_BYTES + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| PackError::new("PACK_ZIP_INVALID", &[]))?;
    if bytes.len() as u64 > MAX_FILE_BYTES {
        return Err(PackError::new(
            "PACK_FILE_TOO_LARGE",
            &[("path", path), ("limit", &mib(MAX_FILE_BYTES))],
        ));
    }
    *total += bytes.len() as u64;
    if *total > MAX_TOTAL_BYTES {
        return Err(too_large());
    }
    Ok(bytes)
}

fn too_large() -> PackError {
    PackError::new("PACK_TOO_LARGE", &[("limit", &mib(MAX_TOTAL_BYTES))])
}

fn too_many_files() -> PackError {
    PackError::new("PACK_TOO_MANY_FILES", &[("limit", &MAX_FILES.to_string())])
}

fn display_name(name: &Result<String, Vec<u8>>) -> String {
    match name {
        Ok(s) => s.clone(),
        Err(raw) => String::from_utf8_lossy(raw).into_owned(),
    }
}

/// Run the entry checks in the spec's order, over everything read, then keep
/// only the regular files that belong to the pack.
fn check_entries(raw: Vec<RawEntry>) -> PackResult<Vec<Entry>> {
    // Path rule, for every entry (skipped ones too: nothing unsafe gets a pass).
    for e in &raw {
        match &e.name {
            Ok(name) if path_is_safe(name) => {}
            _ => {
                return Err(PackError::new(
                    "PACK_PATH_UNSAFE",
                    &[("path", &display_name(&e.name))],
                ))
            }
        }
    }
    let raw: Vec<(String, RawEntry)> = raw
        .into_iter()
        .filter_map(|e| {
            let name = e.name.clone().ok()?;
            (!is_skipped(&name)).then_some((name, e))
        })
        .collect();

    for (name, e) in &raw {
        if matches!(e.kind, Kind::Special) {
            return Err(PackError::new("PACK_LINK_NOT_ALLOWED", &[("path", name)]));
        }
    }

    let files: Vec<(String, Vec<u8>)> = raw
        .into_iter()
        .filter(|(_, e)| matches!(e.kind, Kind::File))
        .map(|(name, e)| (name, e.bytes))
        .collect();
    if files.len() > MAX_FILES {
        return Err(too_many_files());
    }

    // Case-insensitive clashes, and a file that is also used as a folder.
    let mut seen: HashMap<String, &str> = HashMap::new();
    for (name, _) in &files {
        if seen.insert(name.to_lowercase(), name).is_some() {
            return Err(PackError::new("PACK_PATH_DUPLICATE", &[("path", name)]));
        }
    }
    for (name, _) in &files {
        let lower = name.to_lowercase();
        let mut prefix = lower.as_str();
        while let Some((parent, _)) = prefix.rsplit_once('/') {
            if seen.contains_key(parent) {
                return Err(PackError::new("PACK_PATH_DUPLICATE", &[("path", name)]));
            }
            prefix = parent;
        }
    }

    for (name, _) in &files {
        if !file_type_allowed(name) {
            return Err(PackError::new("PACK_FILE_TYPE", &[("path", name)]));
        }
    }

    let mut entries: Vec<Entry> = files
        .into_iter()
        .map(|(path, bytes)| Entry { path, bytes })
        .collect();
    entries.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(entries)
}

/// Read a pack from zip bytes.
pub fn read_zip(bytes: &[u8]) -> PackResult<Vec<Entry>> {
    if bytes.len() as u64 > MAX_ZIP_BYTES {
        return Err(too_large());
    }
    let mut zip = zip::ZipArchive::new(Cursor::new(bytes))
        .map_err(|_| PackError::new("PACK_ZIP_INVALID", &[]))?;
    // Directories and Finder noise don't count towards the file limit, but a
    // zip with far more entries than a pack could hold is refused up front.
    if zip.len() > MAX_FILES * 4 {
        return Err(too_many_files());
    }
    let mut total = 0u64;
    let mut raw = Vec::with_capacity(zip.len());
    for i in 0..zip.len() {
        let file = zip
            .by_index(i)
            .map_err(|_| PackError::new("PACK_ZIP_INVALID", &[]))?;
        if file.encrypted() {
            return Err(PackError::new("PACK_ZIP_INVALID", &[]));
        }
        let name = String::from_utf8(file.name_raw().to_vec()).map_err(|e| e.into_bytes());
        let mode = file.unix_mode().map(|m| m & 0o170000);
        let kind = if file.is_dir() && matches!(mode, None | Some(0) | Some(0o040000)) {
            Kind::Dir
        } else if matches!(mode, None | Some(0) | Some(0o100000)) && !file.is_dir() {
            Kind::File
        } else {
            Kind::Special
        };
        let shown = display_name(&name);
        let bytes = match kind {
            Kind::File => read_limited(file, &shown, &mut total)?,
            _ => Vec::new(),
        };
        raw.push(RawEntry { name, kind, bytes });
    }
    check_entries(raw)
}

/// Write a pack's files as a zip, in path order (Build pack, sign-pack).
pub fn write_zip(entries: &[Entry]) -> Vec<u8> {
    use std::io::Write;
    let mut zip = zip::ZipWriter::new(Cursor::new(Vec::new()));
    let mut sorted: Vec<&Entry> = entries.iter().collect();
    sorted.sort_by(|a, b| a.path.cmp(&b.path));
    for e in sorted {
        zip.start_file(e.path.as_str(), zip::write::SimpleFileOptions::default())
            .expect("zip entry");
        zip.write_all(&e.bytes).expect("zip write");
    }
    zip.finish().expect("zip finish").into_inner()
}

/// Read a pack from a `.zip` file on disk.
pub fn read_zip_file(path: &Path) -> PackResult<Vec<Entry>> {
    let meta = fs::metadata(path).map_err(|e| PackError::io("Couldn't open the pack", e))?;
    if meta.len() > MAX_ZIP_BYTES {
        return Err(too_large());
    }
    let bytes = fs::read(path).map_err(|e| PackError::io("Couldn't read the pack", e))?;
    read_zip(&bytes)
}

/// Read an unpacked pack folder (Developer mode), with the same checks.
pub fn read_folder(root: &Path) -> PackResult<Vec<Entry>> {
    let mut raw = Vec::new();
    let mut total = 0u64;
    let mut stack = vec![(root.to_path_buf(), String::new())];
    while let Some((dir, prefix)) = stack.pop() {
        let listing =
            fs::read_dir(&dir).map_err(|e| PackError::io("Couldn't read the folder", e))?;
        for item in listing {
            let item = item.map_err(|e| PackError::io("Couldn't read the folder", e))?;
            let name = item
                .file_name()
                .into_string()
                .map_err(|n| n.to_string_lossy().into_owned());
            let rel = match &name {
                Ok(n) => Ok(format!("{prefix}{n}")),
                Err(lossy) => Err(format!("{prefix}{lossy}").into_bytes()),
            };
            // symlink_metadata: never follow a link out of the folder.
            let meta = fs::symlink_metadata(item.path())
                .map_err(|e| PackError::io("Couldn't read the folder", e))?;
            let kind = if meta.file_type().is_dir() {
                Kind::Dir
            } else if meta.file_type().is_file() {
                Kind::File
            } else {
                Kind::Special
            };
            if raw.len() > MAX_FILES * 4 {
                return Err(too_many_files());
            }
            let bytes = match (&kind, &rel) {
                (Kind::File, Ok(path)) if !is_skipped(path) => {
                    let file = fs::File::open(item.path())
                        .map_err(|e| PackError::io("Couldn't read a file", e))?;
                    read_limited(file, path, &mut total)?
                }
                _ => Vec::new(),
            };
            if let (Kind::Dir, Ok(path)) = (&kind, &rel) {
                if !is_skipped(path) {
                    stack.push((item.path(), format!("{path}/")));
                }
            }
            raw.push(RawEntry {
                name: rel,
                kind,
                bytes,
            });
        }
    }
    check_entries(raw)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn path_rule() {
        for ok in ["main.js", "lib/a.js", "packs/com.example.a/pack.json", "a/"] {
            assert!(path_is_safe(ok), "{ok}");
        }
        for bad in [
            "",
            "/etc/passwd",
            "../x",
            "a/../b",
            "./a",
            "a//b",
            "a\\b",
            "C:x",
            "c:/x",
            "a\u{0}b",
            "a\nb",
        ] {
            assert!(!path_is_safe(bad), "{bad:?}");
        }
        assert!(!path_is_safe(&"a/".repeat(17)));
        assert!(!path_is_safe(&"x".repeat(256)));
    }

    #[test]
    fn file_types() {
        for ok in [
            "main.js",
            "a.MJS",
            "LICENSE",
            "README",
            "icon.svg",
            "files.json.minisig",
            "LICENSE.md",
        ] {
            assert!(file_type_allowed(ok), "{ok}");
        }
        for bad in [
            "engine.wasm",
            "index.html",
            "run.sh",
            "Makefile",
            ".env",
            "lib.so",
        ] {
            assert!(!file_type_allowed(bad), "{bad}");
        }
    }

    #[test]
    fn finder_noise_is_skipped() {
        assert!(is_skipped("__MACOSX/._main.js"));
        assert!(is_skipped("lib/.DS_Store"));
        assert!(!is_skipped("lib/main.js"));
    }
}
