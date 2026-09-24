//! Developer mode: run an unpacked pack straight from a folder, reload it when
//! its files change, and validate, build or scaffold packs from the app.
//!
//! A dev pack is validated by the same code as the installer (so errors read
//! exactly like an install's, and like the CLI's: both come from
//! spec/packs/errors.json), runs in the same sandboxes, and starts with every
//! permission off like any other pack. It's never signed: it shows a Dev
//! badge.

use super::archive::{self, Entry, FILES_JSON, SIGNATURE_FILE};
use super::error::{PackError, PackResult, INSTALL_CONFLICT, INSTALL_IO};
use super::manifest::Manifest;
use super::validate::{validate_entries, ValidatedBundle};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

const LICENSE_TEXT: &str = include_str!("../../../LICENSE");

/// A folder loaded in Developer mode.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DevPack {
    pub folder: PathBuf,
    /// The last good manifest; `None` until the folder first validates.
    pub manifest: Option<Manifest>,
    /// Why the folder doesn't validate right now.
    pub error: Option<PackError>,
    /// Bumped on every reload, so the host restarts the pack's sandboxes.
    pub revision: u64,
    #[serde(skip)]
    snapshot: Vec<(String, u64, Option<SystemTime>)>,
}

/// What's persisted: whether Developer mode is on, and the loaded folders.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DevSettings {
    pub enabled: bool,
    pub folders: Vec<PathBuf>,
}

/// Paths, sizes and modification times of a folder's files: cheap to take
/// every second, and changes whenever a file is saved, added or removed.
fn snapshot(folder: &Path) -> Vec<(String, u64, Option<SystemTime>)> {
    let mut out = Vec::new();
    let mut stack = vec![folder.to_path_buf()];
    while let Some(dir) = stack.pop() {
        for item in fs::read_dir(&dir).into_iter().flatten().flatten() {
            let Ok(meta) = fs::symlink_metadata(item.path()) else {
                continue;
            };
            if meta.is_dir() {
                stack.push(item.path());
            } else {
                out.push((
                    item.path().to_string_lossy().into_owned(),
                    meta.len(),
                    meta.modified().ok(),
                ));
            }
        }
    }
    out.sort();
    out
}

/// Validate an unpacked pack folder, exactly as the installer would.
pub fn validate_folder(
    folder: &Path,
    app_version: &semver::Version,
) -> PackResult<ValidatedBundle> {
    validate_entries(archive::read_folder(folder)?, app_version)
}

impl DevPack {
    pub fn load(folder: PathBuf, app_version: &semver::Version) -> Self {
        let mut pack = DevPack {
            folder,
            manifest: None,
            error: None,
            revision: 0,
            snapshot: Vec::new(),
        };
        pack.refresh(app_version);
        pack
    }

    pub fn id(&self) -> Option<&str> {
        self.manifest.as_ref().map(|m| m.id.as_str())
    }

    /// Re-read the folder. Returns true if anything changed.
    pub fn refresh(&mut self, app_version: &semver::Version) -> bool {
        let now = snapshot(&self.folder);
        if !self.snapshot.is_empty() && now == self.snapshot {
            return false;
        }
        self.snapshot = now;
        self.revision += 1;
        match validate_folder(&self.folder, app_version) {
            Ok(bundle) => {
                self.manifest = Some(bundle.top.manifest);
                self.error = None;
            }
            // Keep the last good manifest (so the pack keeps its screen);
            // it doesn't run while there's an error.
            Err(e) => self.error = Some(e),
        }
        true
    }

    /// The version the host keys sandboxes by: a reload restarts them.
    pub fn run_version(&self) -> String {
        let version = self
            .manifest
            .as_ref()
            .map_or("0.0.0", |m| m.version.as_str());
        format!("{version}+dev.{}", self.revision)
    }
}

/// Refuse a folder whose pack id is already installed or already loaded.
pub fn check_id_free(id: &str, installed: bool, loaded_elsewhere: bool) -> PackResult<()> {
    if installed {
        return Err(PackError::install(
            INSTALL_CONFLICT,
            format!("{id} is installed. Uninstall it to work on it in Developer mode."),
        ));
    }
    if loaded_elsewhere {
        return Err(PackError::install(
            INSTALL_CONFLICT,
            format!("{id} is already loaded from another folder."),
        ));
    }
    Ok(())
}

/// Build pack: validate the folder, then write `<id>-<version>.zip` next to
/// it, with each pack's canonical `files.json` (unsigned; OmniShip signs
/// Verified packs). Returns the zip's path.
pub fn build(folder: &Path, app_version: &semver::Version) -> PackResult<PathBuf> {
    let entries: Vec<Entry> = archive::read_folder(folder)?
        .into_iter()
        // Old lists and signatures are replaced; a signature can't survive a build.
        .filter(|e| {
            let name = e.path.rsplit('/').next().unwrap_or(&e.path);
            name != FILES_JSON && name != SIGNATURE_FILE
        })
        .collect();
    let bundle = validate_entries(entries.clone(), app_version)?;
    let mut out = entries;
    for pack in bundle.all() {
        let folder = if std::ptr::eq(pack, &bundle.top) {
            String::new()
        } else {
            format!("packs/{}/", pack.manifest.id)
        };
        out.push(Entry {
            path: format!("{folder}{FILES_JSON}"),
            bytes: pack.files.canonical_bytes(),
        });
    }
    let m = &bundle.top.manifest;
    let parent = folder.parent().unwrap_or(folder);
    let path = parent.join(format!("{}-{}.zip", m.id, m.version));
    fs::write(&path, archive::write_zip(&out))
        .map_err(|e| PackError::io("Couldn't write the pack", e))?;
    Ok(path)
}

/// A lowercase slug for folder names and ids: `My Pedal!` → `my-pedal`.
pub fn slug(name: &str) -> String {
    let mut out = String::new();
    for c in name.chars().flat_map(char::to_lowercase) {
        if c.is_ascii_alphanumeric() {
            out.push(c);
        } else if !out.ends_with('-') && !out.is_empty() {
            out.push('-');
        }
    }
    let out = out.trim_matches('-').to_string();
    if out.is_empty() {
        "my-pack".into()
    } else {
        out
    }
}

/// New pack: scaffold a folder in `parent` with a manifest, a commented
/// main.js, the AGPL LICENSE, a README and an example setting. Returns it.
pub fn scaffold(parent: &Path, name: &str, author: &str) -> PackResult<PathBuf> {
    let name = name.trim();
    let name = if name.is_empty() { "My pack" } else { name };
    let slug = slug(name);
    let folder = parent.join(&slug);
    if folder.exists() {
        return Err(PackError::install(
            INSTALL_CONFLICT,
            format!("{} already exists.", folder.display()),
        ));
    }
    let author = if author.trim().is_empty() {
        "You"
    } else {
        author.trim()
    };
    let manifest = serde_json::json!({
        "$schema": "https://github.com/omniship-labs/eyeread.in/blob/main/spec/packs/pack.schema.json",
        "apiVersion": 1,
        "id": format!("com.example.{slug}"),
        "name": name,
        "version": "0.1.0",
        "description": "A pack for eyeread.in.",
        "author": { "name": author },
        "license": "AGPL-3.0-or-later",
        "main": "main.js",
        "permissions": { "prompter:control": {} },
        "settings": [
            { "key": "pauseOnStart", "type": "toggle", "label": "Pause as soon as reading starts", "default": false }
        ],
    });
    let main_js = r#"// Your pack's code. It runs in a sandbox: no network, no app internals,
// only what `eyeread` offers for the permissions the user allows.
// The API: https://github.com/omniship-labs/eyeread.in/blob/main/spec/packs/API.md

// Runs once the user allows "Control playback" for this pack
// (Settings → Packs → this pack).
eyeread.on('prompter:control', async ({ prompter, settings }) => {
  const { pauseOnStart } = await settings.get();
  console.log('Ready. pauseOnStart is', pauseOnStart);

  // Settings changes arrive while the pack runs.
  settings.onChange((values) => console.log('Settings changed:', values));

  if (pauseOnStart) {
    try {
      await prompter.pause();
    } catch (err) {
      // E_NO_SESSION: the prompter isn't open yet.
      console.warn('Nothing to pause:', err.code);
    }
  }
});
"#;
    let readme = format!(
        "# {name}\n\nA pack for [eyeread.in](https://get.eyeread.in).\n\n\
         - Load this folder in Settings → Packs → Developer mode to try it; it reloads as you save.\n\
         - Edit `pack.json` to change what it asks for, and `main.js` for what it does.\n\
         - Build pack writes a `.zip` you can share, next to this folder.\n\n\
         Licensed under the GNU AGPL (see LICENSE), like eyeread.in.\n"
    );
    fs::create_dir_all(&folder).map_err(|e| PackError::io("Couldn't create the folder", e))?;
    let write = |file: &str, text: &str| {
        fs::write(folder.join(file), text).map_err(|e| PackError::io("Couldn't write the pack", e))
    };
    write(
        "pack.json",
        &(serde_json::to_string_pretty(&manifest).expect("manifest") + "\n"),
    )?;
    write("main.js", main_js)?;
    write("LICENSE", LICENSE_TEXT)?;
    write("README.md", &readme)?;
    Ok(folder)
}

/// Where Developer mode's state lives in packs.json.
pub const STORE_KEY: &str = "devMode";

pub fn io_error(message: impl Into<String>) -> PackError {
    PackError::install(INSTALL_IO, message)
}

/// Loaded dev packs by folder.
pub type DevPacks = BTreeMap<PathBuf, DevPack>;

#[cfg(test)]
mod tests {
    use super::*;

    fn app() -> semver::Version {
        semver::Version::new(1, 0, 0)
    }

    #[test]
    fn scaffold_builds_a_valid_pack() {
        let tmp = tempfile::tempdir().unwrap();
        let folder = scaffold(tmp.path(), "My Foot Pedal!", "Ada").unwrap();
        assert!(folder.ends_with("my-foot-pedal"));
        let bundle = validate_folder(&folder, &app()).unwrap();
        let m = &bundle.top.manifest;
        assert_eq!(
            (m.id.as_str(), m.name.as_str()),
            ("com.example.my-foot-pedal", "My Foot Pedal!")
        );
        assert_eq!(m.settings.len(), 1);
        // A second scaffold with the same name doesn't overwrite it.
        assert_eq!(
            scaffold(tmp.path(), "My Foot Pedal!", "Ada")
                .unwrap_err()
                .code,
            INSTALL_CONFLICT
        );
    }

    #[test]
    fn build_writes_an_installable_zip_with_files_json() {
        let tmp = tempfile::tempdir().unwrap();
        let folder = scaffold(tmp.path(), "Pedal", "").unwrap();
        let zip = build(&folder, &app()).unwrap();
        assert_eq!(zip, tmp.path().join("com.example.pedal-0.1.0.zip"));
        let entries = archive::read_zip_file(&zip).unwrap();
        assert!(entries.iter().any(|e| e.path == FILES_JSON));
        // It installs: the list matches, and it's canonical.
        let bundle = validate_entries(entries.clone(), &app()).unwrap();
        let shipped = &entries.iter().find(|e| e.path == FILES_JSON).unwrap().bytes;
        assert_eq!(*shipped, bundle.top.files.canonical_bytes());
    }

    #[test]
    fn build_reports_validation_errors_in_the_spec_wording() {
        let tmp = tempfile::tempdir().unwrap();
        let folder = scaffold(tmp.path(), "Pedal", "").unwrap();
        fs::write(folder.join("main.js"), "x".repeat(1200)).unwrap();
        let err = build(&folder, &app()).unwrap_err();
        assert_eq!(err.code, "PACK_MINIFIED");
        assert_eq!(
            err.message,
            "main.js: code looks minified or obfuscated; packs must include readable source."
        );
        assert!(!tmp.path().join("com.example.pedal-0.1.0.zip").exists());
    }

    #[test]
    fn reload_notices_edits_and_keeps_the_last_good_manifest() {
        let tmp = tempfile::tempdir().unwrap();
        let folder = scaffold(tmp.path(), "Pedal", "").unwrap();
        let mut pack = DevPack::load(folder.clone(), &app());
        assert!(pack.error.is_none());
        let first = pack.run_version();
        assert!(!pack.refresh(&app()), "nothing changed");

        // A broken edit: reported, last good manifest kept.
        fs::write(folder.join("pack.json"), "{ nope").unwrap();
        assert!(pack.refresh(&app()));
        assert_eq!(
            pack.error.as_ref().unwrap().code,
            "PACK_MANIFEST_INVALID_JSON"
        );
        assert_eq!(pack.id(), Some("com.example.pedal"));

        // Fixed: runs again, with a new run version so sandboxes restart.
        fs::write(
            folder.join("main.js"),
            "// changed\neyeread.on('prompter:control', () => {});\n",
        )
        .unwrap();
        let manifest = scaffold_manifest_again(&tmp);
        fs::write(folder.join("pack.json"), manifest).unwrap();
        assert!(pack.refresh(&app()));
        assert!(pack.error.is_none());
        assert_ne!(pack.run_version(), first);
    }

    fn scaffold_manifest_again(tmp: &tempfile::TempDir) -> String {
        let other = scaffold(&tmp.path().join("again"), "Pedal", "").unwrap();
        fs::read_to_string(other.join("pack.json")).unwrap()
    }

    #[test]
    fn ids_must_be_free() {
        assert!(check_id_free("a.b", false, false).is_ok());
        assert_eq!(
            check_id_free("a.b", true, false).unwrap_err().code,
            INSTALL_CONFLICT
        );
        assert_eq!(
            check_id_free("a.b", false, true).unwrap_err().code,
            INSTALL_CONFLICT
        );
    }

    #[test]
    fn slugs() {
        assert_eq!(slug("My Foot Pedal!"), "my-foot-pedal");
        assert_eq!(slug("  --  "), "my-pack");
        assert_eq!(slug("Notion → Script"), "notion-script");
    }
}
