//! Validating a whole pack, bundles included, in the spec's check order
//! (`spec/packs/FORMAT.md`, "Validation errors"). The same function backs
//! the installer, the launch-time re-check and Developer mode, so a pack gets
//! the same verdict everywhere.

use super::archive::{self, Entry, FILES_JSON, SIGNATURE_FILE};
use super::error::{PackError, PackResult};
use super::files_list::FilesList;
use super::manifest::{self, Manifest};
use serde_json::Value;
use std::collections::{BTreeMap, HashSet};
use std::path::Path;

pub const MAX_INCLUDED: usize = 32;
pub const MAX_DEPTH: usize = 4;
const MAX_LINE_CHARS: usize = 1000;
const MINIFIED_MIN_BYTES: usize = 2048;
const MINIFIED_BYTES_PER_LINE: usize = 200;
const LICENSE_FILES: [&str; 4] = ["LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING"];
const LICENSE_TEXT: &str = "gnu affero general public license";

/// One validated pack: its manifest, its own files, and its hashes.
#[derive(Debug, Clone)]
pub struct ValidatedPack {
    pub manifest: Manifest,
    /// This pack's files, with paths relative to the pack's own root.
    pub entries: Vec<Entry>,
    /// The file list computed from `entries` (the canonical `files.json`).
    pub files: FilesList,
    pub pack_hash: String,
    /// `files.json` exactly as shipped, if it was: the bytes a signature covers.
    pub shipped_files_json: Option<Vec<u8>>,
    /// `files.json.minisig`, if shipped.
    pub signature: Option<Vec<u8>>,
}

/// A pack and everything it includes, each validated.
#[derive(Debug, Clone)]
pub struct ValidatedBundle {
    pub top: ValidatedPack,
    /// Included packs, each once, in `includes` order, depth first.
    pub included: Vec<ValidatedPack>,
}

impl ValidatedBundle {
    pub fn all(&self) -> impl Iterator<Item = &ValidatedPack> {
        std::iter::once(&self.top).chain(self.included.iter())
    }
}

pub fn validate_zip_file(
    path: &Path,
    app_version: &semver::Version,
) -> PackResult<ValidatedBundle> {
    validate_entries(archive::read_zip_file(path)?, app_version)
}

/// Readable source rule: no line over 1000 characters, and a file of 2 KiB or
/// more must average at most 200 bytes per line.
pub fn looks_minified(bytes: &[u8]) -> bool {
    let text = String::from_utf8_lossy(bytes);
    let mut lines = 0usize;
    for line in text.lines() {
        lines += 1;
        if line.chars().count() > MAX_LINE_CHARS {
            return true;
        }
    }
    bytes.len() >= MINIFIED_MIN_BYTES && bytes.len() > MINIFIED_BYTES_PER_LINE * lines.max(1)
}

fn find<'a>(entries: &'a [Entry], path: &str) -> Option<&'a Entry> {
    entries.iter().find(|e| e.path == path)
}

/// Steps 2–8 for one pack, over its own files.
fn validate_pack(
    entries: Vec<Entry>,
    folder: &str,
    app_version: &semver::Version,
) -> PackResult<ValidatedPack> {
    let manifest_bytes = find(&entries, "pack.json")
        .ok_or_else(|| PackError::new("PACK_MANIFEST_MISSING", &[]))?
        .bytes
        .clone();
    let manifest = manifest::parse(&manifest_bytes, app_version)?;

    let has_license = LICENSE_FILES.iter().any(|name| {
        find(&entries, name).is_some_and(|e| {
            String::from_utf8_lossy(&e.bytes)
                .to_lowercase()
                .contains(LICENSE_TEXT)
        })
    });
    if !has_license {
        return Err(PackError::new("PACK_LICENSE_FILE", &[]));
    }
    if let Some(main) = &manifest.main {
        if find(&entries, main).is_none() {
            return Err(PackError::new(
                "PACK_MAIN_MISSING",
                &[("path", &format!("{folder}{main}"))],
            ));
        }
    }
    for e in &entries {
        let lower = e.path.to_ascii_lowercase();
        if (lower.ends_with(".js") || lower.ends_with(".mjs")) && looks_minified(&e.bytes) {
            return Err(PackError::new(
                "PACK_MINIFIED",
                &[("path", &format!("{folder}{}", e.path))],
            ));
        }
    }

    let files = FilesList::compute(&manifest.id, &manifest.version, &entries);
    let shipped_files_json = find(&entries, FILES_JSON).map(|e| e.bytes.clone());
    if let Some(bytes) = &shipped_files_json {
        let shipped = FilesList::parse(bytes, &manifest.id, &manifest.version)?;
        shipped.compare(&files, folder)?;
    }
    let signature = find(&entries, SIGNATURE_FILE).map(|e| e.bytes.clone());
    Ok(ValidatedPack {
        pack_hash: files.pack_hash(),
        files,
        manifest,
        entries,
        shipped_files_json,
        signature,
    })
}

/// What the bundle walk needs from an included pack's `pack.json`, read
/// leniently: full checks come later, in order.
struct Node {
    id: Option<String>,
    version: Option<String>,
    includes: Vec<(String, String)>,
}

fn read_node(entries: &[Entry], folder: &str) -> PackResult<Node> {
    let bytes = &find(entries, "pack.json")
        .ok_or_else(|| PackError::new("PACK_MANIFEST_MISSING", &[]).in_folder(folder))?
        .bytes;
    let value: Value = serde_json::from_slice(bytes).map_err(|e| {
        PackError::new("PACK_MANIFEST_INVALID_JSON", &[("detail", &e.to_string())])
            .in_folder(folder)
    })?;
    let text = |v: &Value, key: &str| v.get(key).and_then(Value::as_str).map(String::from);
    Ok(Node {
        id: text(&value, "id"),
        version: text(&value, "version"),
        includes: value
            .get("includes")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(|inc| Some((text(inc, "id")?, text(inc, "version")?)))
            .collect(),
    })
}

struct Walk<'a> {
    groups: &'a BTreeMap<String, Vec<Entry>>,
    nodes: BTreeMap<String, Node>,
    /// Included pack ids, in `includes` order, depth first.
    order: Vec<String>,
}

impl Walk<'_> {
    fn visit(&mut self, includes: &[(String, String)], stack: &mut Vec<String>) -> PackResult<()> {
        let mut seen = HashSet::new();
        for (id, _) in includes {
            if !seen.insert(id) {
                return Err(PackError::new("PACK_INCLUDE_DUPLICATE", &[("id", id)]));
            }
        }
        for (id, version) in includes {
            if stack.contains(id) {
                let mut cycle = stack.clone();
                cycle.push(id.clone());
                return Err(PackError::new(
                    "PACK_INCLUDE_CYCLE",
                    &[("cycle", &cycle.join(" → "))],
                ));
            }
            let missing =
                || PackError::new("PACK_INCLUDE_MISSING", &[("id", id), ("version", version)]);
            let entries = self.groups.get(id).ok_or_else(missing)?;
            if !self.nodes.contains_key(id) {
                let node = read_node(entries, &format!("packs/{id}/"))?;
                self.nodes.insert(id.clone(), node);
            }
            let node = &self.nodes[id];
            if node.id.as_deref() != Some(id.as_str()) {
                return Err(missing());
            }
            if node.version.as_deref() != Some(version.as_str()) {
                let found = node.version.clone().unwrap_or_else(|| "none".into());
                return Err(PackError::new(
                    "PACK_INCLUDE_VERSION",
                    &[("id", id), ("version", version), ("found", &found)],
                ));
            }
            if self.order.contains(id) {
                continue; // shared by two packs in the bundle; walked already
            }
            self.order.push(id.clone());
            if self.order.len() > MAX_INCLUDED || stack.len() > MAX_DEPTH {
                return Err(PackError::new(
                    "PACK_INCLUDE_LIMIT",
                    &[
                        ("limit", &MAX_INCLUDED.to_string()),
                        ("depth", &MAX_DEPTH.to_string()),
                    ],
                ));
            }
            let child = self.nodes[id].includes.clone();
            stack.push(id.clone());
            self.visit(&child, stack)?;
            stack.pop();
        }
        Ok(())
    }
}

/// Validate a pack from its checked entries (step 1 already done): the
/// top-level pack, then the bundle graph, then each included pack.
pub fn validate_entries(
    entries: Vec<Entry>,
    app_version: &semver::Version,
) -> PackResult<ValidatedBundle> {
    let mut own = Vec::new();
    let mut groups: BTreeMap<String, Vec<Entry>> = BTreeMap::new();
    let mut strays: Vec<String> = Vec::new();
    for e in entries {
        let Some(rest) = e.path.strip_prefix("packs/") else {
            own.push(e);
            continue;
        };
        match rest.split_once('/') {
            Some((id, inner)) if !inner.starts_with("packs/") => {
                let inner = inner.to_string();
                groups.entry(id.into()).or_default().push(Entry {
                    path: inner,
                    bytes: e.bytes,
                });
            }
            Some((id, _)) => strays.push(format!("{id}/packs")),
            None => strays.push(rest.into()),
        }
    }

    let top = validate_pack(own, "", app_version)?;

    let mut walk = Walk {
        groups: &groups,
        nodes: BTreeMap::new(),
        order: Vec::new(),
    };
    let includes: Vec<(String, String)> = top
        .manifest
        .includes
        .iter()
        .map(|i| (i.id.clone(), i.version.clone()))
        .collect();
    walk.visit(&includes, &mut vec![top.manifest.id.clone()])?;
    let order = walk.order;

    let mut unused: Vec<&String> = groups.keys().filter(|id| !order.contains(id)).collect();
    unused.extend(strays.iter());
    unused.sort();
    if let Some(id) = unused.first() {
        return Err(PackError::new("PACK_INCLUDE_UNUSED", &[("id", id)]));
    }

    let mut included = Vec::with_capacity(order.len());
    for id in &order {
        let folder = format!("packs/{id}/");
        let pack = validate_pack(groups[id].clone(), &folder, app_version)
            .map_err(|e| e.in_folder(&folder))?;
        included.push(pack);
    }
    Ok(ValidatedBundle { top, included })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn minified_rule() {
        assert!(!looks_minified(b"const a = 1;\nconst b = 2;\n"));
        assert!(looks_minified("x".repeat(1001).as_bytes()));
        // 2 KiB in 5 lines: ~400 bytes per line.
        let dense = format!("{}\n", "a = 1; ".repeat(60)).repeat(5);
        assert!(dense.len() >= 2048);
        assert!(looks_minified(dense.as_bytes()));
        // Same size spread over many lines is fine.
        let spread = "let a = 1;\n".repeat(300);
        assert!(!looks_minified(spread.as_bytes()));
    }
}
