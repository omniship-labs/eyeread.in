//! Installed packs on disk: `<app data>/packs/<id>/<version>/…`, plus a
//! registry (`installed.json`) that is the source of truth for what's
//! installed, enabled, and which bundles use which packs.
//!
//! Installs are staged in `.staging/` inside the same folder and moved into
//! place with a rename, so a pack's folder is either complete or absent.
//! Before a pack is loaded, and at every launch, its files are re-hashed
//! against the list recorded at install: any change, missing or extra file
//! disables the pack until the user approves it again (reinstalls it).

use super::archive::{self, Entry};
use super::error::{
    PackError, PackResult, INSTALL_CONFLICT, INSTALL_NEEDS_APPROVAL, INSTALL_NOT_FOUND,
};
use super::files_list::FilesList;
use super::manifest::Manifest;
use super::signature::RevocationList;
use super::validate::{ValidatedBundle, ValidatedPack};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const REGISTRY_FILE: &str = "installed.json";
const STAGING_DIR: &str = ".staging";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PackStatus {
    Ok,
    /// Files changed after install. Disabled until approved again.
    Tampered,
    /// On eyeread.in's revocation list. Disabled for good.
    Revoked,
    /// Stopped by the pack host after repeated crashes or hangs. The user
    /// can switch it back on.
    Crashed,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledPack {
    pub id: String,
    pub version: String,
    pub pack_hash: String,
    pub manifest: Manifest,
    /// Path → SHA-256, as validated at install.
    pub files: BTreeMap<String, String>,
    pub enabled: bool,
    /// Installed by the user directly (not only as part of a bundle).
    pub top_level: bool,
    /// Top-level packs whose bundles contain this pack.
    pub used_by: BTreeSet<String>,
    pub status: PackStatus,
    /// ✓ Verified by eyeread.in: it and everything it includes are signed.
    #[serde(default)]
    pub verified: bool,
    /// Why the pack is disabled, when it isn't `Ok`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status_reason: Option<String>,
    pub installed_at: u64,
}

impl InstalledPack {
    /// Tampered or revoked: can't be switched on until reinstalled.
    pub fn needs_approval(&self) -> bool {
        matches!(self.status, PackStatus::Tampered | PackStatus::Revoked)
    }
}

#[derive(Debug, Default, Serialize, Deserialize)]
struct Registry {
    format: u32,
    packs: BTreeMap<String, InstalledPack>,
}

pub struct PackStore {
    root: PathBuf,
    registry: Registry,
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn random_name() -> String {
    let mut buf = [0u8; 8];
    getrandom::getrandom(&mut buf).expect("OS random source unavailable");
    buf.iter().map(|b| format!("{b:02x}")).collect()
}

fn write_entries(dir: &Path, entries: &[Entry]) -> PackResult<()> {
    for e in entries {
        // Paths passed the spec's path rule, so joining them segment by
        // segment can't leave `dir`.
        let mut path = dir.to_path_buf();
        path.extend(e.path.split('/'));
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .map_err(|err| PackError::io("Couldn't install the pack", err))?;
        }
        fs::write(&path, &e.bytes)
            .map_err(|err| PackError::io("Couldn't install the pack", err))?;
    }
    Ok(())
}

impl PackStore {
    /// Open (or create) the store at `root`, dropping anything on disk the
    /// registry doesn't know about (an interrupted install, say).
    pub fn open(root: impl Into<PathBuf>) -> PackResult<Self> {
        let root = root.into();
        fs::create_dir_all(&root)
            .map_err(|e| PackError::io("Couldn't create the packs folder", e))?;
        let registry = match fs::read(root.join(REGISTRY_FILE)) {
            Ok(bytes) => serde_json::from_slice(&bytes).unwrap_or_else(|e| {
                eprintln!("[packs] {REGISTRY_FILE} is unreadable, starting empty: {e}");
                Registry::default()
            }),
            Err(_) => Registry::default(),
        };
        let store = PackStore { root, registry };
        store.remove_strays();
        Ok(store)
    }

    fn remove_strays(&self) {
        let _ = fs::remove_dir_all(self.root.join(STAGING_DIR));
        let Ok(listing) = fs::read_dir(&self.root) else {
            return;
        };
        for item in listing.flatten() {
            let name = item.file_name().to_string_lossy().into_owned();
            let path = item.path();
            if !path.is_dir() {
                continue;
            }
            match self.registry.packs.get(&name) {
                None => {
                    let _ = fs::remove_dir_all(&path);
                }
                Some(pack) => {
                    // Keep only the installed version's folder.
                    for version in fs::read_dir(&path).into_iter().flatten().flatten() {
                        if version.file_name().to_string_lossy() != pack.version {
                            let _ = fs::remove_dir_all(version.path());
                        }
                    }
                }
            }
        }
    }

    fn save(&self) -> PackResult<()> {
        let tmp = self.root.join(format!("{REGISTRY_FILE}.tmp"));
        let bytes = serde_json::to_vec_pretty(&self.registry).expect("registry serializes");
        fs::write(&tmp, bytes).map_err(|e| PackError::io("Couldn't save installed packs", e))?;
        fs::rename(&tmp, self.root.join(REGISTRY_FILE))
            .map_err(|e| PackError::io("Couldn't save installed packs", e))
    }

    /// Where a pack picked in the app (not dropped from disk) is kept while
    /// the user reviews it. Cleared at every start, like any folder the
    /// registry doesn't know.
    pub fn incoming_dir(&self) -> PathBuf {
        self.root.join(".incoming")
    }

    pub fn pack_dir(&self, id: &str, version: &str) -> PathBuf {
        self.root.join(id).join(version)
    }

    pub fn get(&self, id: &str) -> Option<&InstalledPack> {
        self.registry.packs.get(id)
    }

    pub fn list(&self) -> Vec<InstalledPack> {
        self.registry.packs.values().cloned().collect()
    }

    /// What installing `bundle` would do to an already-installed pack, or why
    /// it can't be installed.
    fn plan<'b>(&self, bundle: &'b ValidatedBundle) -> PackResult<Vec<(bool, &'b ValidatedPack)>> {
        let top_id = &bundle.top.manifest.id;
        let mut plan = Vec::new();
        for pack in bundle.all() {
            let is_top = std::ptr::eq(pack, &bundle.top);
            let write = match self.registry.packs.get(&pack.manifest.id) {
                None => true,
                Some(existing) if existing.version == pack.manifest.version => {
                    if existing.pack_hash != pack.pack_hash {
                        return Err(PackError::install(
                            INSTALL_CONFLICT,
                            format!(
                                "{} {} is already installed with different files.",
                                pack.manifest.name, pack.manifest.version
                            ),
                        ));
                    }
                    // Same pack: share it, but rewrite it if its files were changed.
                    existing.status != PackStatus::Ok
                }
                Some(existing) => {
                    // Another version: it can be replaced only if nothing else
                    // pins it (an upgrade of this bundle or of this pack).
                    let others: Vec<&String> =
                        existing.used_by.iter().filter(|u| *u != top_id).collect();
                    if !others.is_empty() || (existing.top_level && !is_top) {
                        let by = others
                            .first()
                            .and_then(|o| self.registry.packs.get(*o))
                            .map(|p| p.manifest.name.clone())
                            .unwrap_or_else(|| "you".into());
                        return Err(PackError::install(
                            INSTALL_CONFLICT,
                            format!(
                                "{} {} is installed and used by {}; this pack needs version {}.",
                                existing.manifest.name, existing.version, by, pack.manifest.version
                            ),
                        ));
                    }
                    true
                }
            };
            plan.push((write, pack));
        }
        Ok(plan)
    }

    /// Whether `bundle` can be installed next to what's installed now.
    pub fn check_install(&self, bundle: &ValidatedBundle) -> PackResult<()> {
        self.plan(bundle).map(|_| ())
    }

    /// Install a validated pack and the packs it includes. `verified` holds
    /// the ids that get the Verified badge (see `signature::check_bundle`).
    /// Returns the ids written or updated.
    pub fn install(
        &mut self,
        bundle: &ValidatedBundle,
        verified: &BTreeSet<String>,
    ) -> PackResult<Vec<String>> {
        let plan = self.plan(bundle)?;
        let top_id = bundle.top.manifest.id.clone();

        // Stage everything first, so a failed write leaves the store as it was.
        let staging = self.root.join(STAGING_DIR).join(random_name());
        for (write, pack) in &plan {
            if *write {
                write_entries(&staging.join(&pack.manifest.id), &pack.entries)?;
            }
        }
        let mut changed = Vec::new();
        for (write, pack) in &plan {
            let id = &pack.manifest.id;
            if *write {
                let id_dir = self.root.join(id);
                let target = id_dir.join(&pack.manifest.version);
                fs::create_dir_all(&id_dir)
                    .map_err(|e| PackError::io("Couldn't install the pack", e))?;
                if target.exists() {
                    fs::remove_dir_all(&target)
                        .map_err(|e| PackError::io("Couldn't replace the pack", e))?;
                }
                fs::rename(staging.join(id), &target)
                    .map_err(|e| PackError::io("Couldn't install the pack", e))?;
                // Drop any other version's folder.
                for other in fs::read_dir(&id_dir).into_iter().flatten().flatten() {
                    if other.file_name().to_string_lossy() != pack.manifest.version {
                        let _ = fs::remove_dir_all(other.path());
                    }
                }
            }
            let previous = self.registry.packs.get(id);
            let entry = InstalledPack {
                id: id.clone(),
                version: pack.manifest.version.clone(),
                pack_hash: pack.pack_hash.clone(),
                manifest: pack.manifest.clone(),
                files: pack.files.files.clone(),
                // A fresh install is on (its permissions still start off); a
                // reinstall keeps the user's choice.
                enabled: previous.is_none_or(|p| p.enabled || p.needs_approval()),
                top_level: previous.is_some_and(|p| p.top_level) || *id == top_id,
                used_by: previous.map(|p| p.used_by.clone()).unwrap_or_default(),
                status: PackStatus::Ok,
                verified: verified.contains(id),
                status_reason: None,
                installed_at: if *write {
                    now_ms()
                } else {
                    previous.map_or_else(now_ms, |p| p.installed_at)
                },
            };
            self.registry.packs.insert(id.clone(), entry);
            if *write {
                changed.push(id.clone());
            }
        }
        let _ = fs::remove_dir_all(self.root.join(STAGING_DIR));

        // This bundle now uses exactly its current included packs.
        let included: BTreeSet<&String> = bundle.included.iter().map(|p| &p.manifest.id).collect();
        for pack in self.registry.packs.values_mut() {
            if included.contains(&pack.id) {
                pack.used_by.insert(top_id.clone());
            } else {
                pack.used_by.remove(&top_id);
            }
        }
        self.collect_garbage();
        self.save()?;
        Ok(changed)
    }

    /// Remove packs nobody installed directly and no bundle uses.
    fn collect_garbage(&mut self) -> Vec<String> {
        let orphans: Vec<String> = self
            .registry
            .packs
            .values()
            .filter(|p| !p.top_level && p.used_by.is_empty())
            .map(|p| p.id.clone())
            .collect();
        for id in &orphans {
            self.registry.packs.remove(id);
            let _ = fs::remove_dir_all(self.root.join(id));
            for pack in self.registry.packs.values_mut() {
                pack.used_by.remove(id);
            }
        }
        orphans
    }

    /// Uninstall a pack the user installed. Packs its bundle included are
    /// removed too, unless something else still uses them. Returns the ids
    /// removed.
    pub fn uninstall(&mut self, id: &str) -> PackResult<Vec<String>> {
        let pack = self
            .registry
            .packs
            .get_mut(id)
            .filter(|p| p.top_level)
            .ok_or_else(|| {
                PackError::install(INSTALL_NOT_FOUND, format!("{id} isn't installed."))
            })?;
        pack.top_level = false;
        for other in self.registry.packs.values_mut() {
            other.used_by.remove(id);
        }
        let mut removed = Vec::new();
        loop {
            let round = self.collect_garbage();
            if round.is_empty() {
                break;
            }
            removed.extend(round);
        }
        self.save()?;
        Ok(removed)
    }

    pub fn set_enabled(&mut self, id: &str, enabled: bool) -> PackResult<InstalledPack> {
        if enabled {
            // Also catches a pack whose files changed while it was off.
            self.verify(id)?;
        }
        let pack = self.registry.packs.get_mut(id).ok_or_else(|| {
            PackError::install(INSTALL_NOT_FOUND, format!("{id} isn't installed."))
        })?;
        pack.enabled = enabled;
        if enabled && pack.status == PackStatus::Crashed {
            // Switching a crashed pack back on gives it a fresh start.
            pack.status = PackStatus::Ok;
            pack.status_reason = None;
        }
        let pack = pack.clone();
        self.save()?;
        Ok(pack)
    }

    /// Re-hash an installed pack's files against the list recorded at
    /// install. `Err` carries the first difference, in the spec's words.
    fn check_files(&self, pack: &InstalledPack) -> PackResult<()> {
        let dir = self.pack_dir(&pack.id, &pack.version);
        let entries = archive::read_folder(&dir)?;
        let actual = FilesList::compute(&pack.id, &pack.version, &entries);
        let expected = FilesList {
            format: 1,
            id: pack.id.clone(),
            version: pack.version.clone(),
            files: pack.files.clone(),
        };
        expected.compare(&actual, "")?;
        if actual.pack_hash() != pack.pack_hash {
            return Err(PackError::new(
                "PACK_FILES_MISMATCH",
                &[("path", "files.json"), ("detail", "pack hash changed")],
            ));
        }
        Ok(())
    }

    /// The launch check for one pack, run before it's loaded: if its files
    /// changed, it's disabled and marked for re-approval.
    pub fn verify(&mut self, id: &str) -> PackResult<()> {
        let pack = self.registry.packs.get(id).ok_or_else(|| {
            PackError::install(INSTALL_NOT_FOUND, format!("{id} isn't installed."))
        })?;
        if pack.needs_approval() {
            return Err(PackError::install(
                INSTALL_NEEDS_APPROVAL,
                pack.status_reason.clone().unwrap_or_default(),
            ));
        }
        if let Err(err) = self.check_files(pack) {
            let pack = self.registry.packs.get_mut(id).expect("checked above");
            pack.status = PackStatus::Tampered;
            pack.status_reason = Some(err.message.clone());
            pack.enabled = false;
            self.save()?;
            return Err(PackError::install(INSTALL_NEEDS_APPROVAL, err.message));
        }
        Ok(())
    }

    /// The pack host gave up on a pack (repeated crashes or hangs).
    pub fn mark_crashed(&mut self, id: &str, reason: &str) -> PackResult<()> {
        if let Some(pack) = self.registry.packs.get_mut(id) {
            pack.status = PackStatus::Crashed;
            pack.status_reason = Some(reason.to_string());
            pack.enabled = false;
            self.save()?;
        }
        Ok(())
    }

    /// Disable every installed pack on the revocation list. Returns their ids.
    pub fn apply_revocations(&mut self, list: &RevocationList) -> PackResult<Vec<String>> {
        let mut revoked = Vec::new();
        for pack in self.registry.packs.values_mut() {
            if let Some(r) = list.find(&pack.pack_hash) {
                if pack.status != PackStatus::Revoked {
                    pack.status = PackStatus::Revoked;
                    pack.status_reason = Some(r.reason.clone());
                    pack.enabled = false;
                    pack.verified = false;
                    revoked.push(pack.id.clone());
                }
            }
        }
        if !revoked.is_empty() {
            self.save()?;
        }
        Ok(revoked)
    }

    /// Run the launch check on every enabled pack. Returns the ids that were
    /// disabled because their files changed.
    pub fn verify_all(&mut self) -> Vec<String> {
        let ids: Vec<String> = self
            .registry
            .packs
            .values()
            .filter(|p| p.enabled)
            .map(|p| p.id.clone())
            .collect();
        ids.into_iter()
            .filter(|id| self.verify(id).is_err())
            .collect()
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use crate::packs::validate::validate_entries;

    const LICENSE: &str = "GNU AFFERO GENERAL PUBLIC LICENSE\n";

    pub(crate) fn pack_entries(
        id: &str,
        version: &str,
        includes: &[(&str, &str)],
        main_js: &str,
    ) -> Vec<Entry> {
        let includes: Vec<serde_json::Value> = includes
            .iter()
            .map(|(i, v)| serde_json::json!({ "id": i, "version": v }))
            .collect();
        let mut manifest = serde_json::json!({
            "apiVersion": 1, "id": id, "name": id, "version": version,
            "author": { "name": "T" }, "license": "AGPL-3.0-only", "main": "main.js",
        });
        if !includes.is_empty() {
            manifest["includes"] = includes.into();
        }
        vec![
            Entry {
                path: "LICENSE".into(),
                bytes: LICENSE.into(),
            },
            Entry {
                path: "main.js".into(),
                bytes: main_js.as_bytes().to_vec(),
            },
            Entry {
                path: "pack.json".into(),
                bytes: serde_json::to_vec(&manifest).unwrap(),
            },
        ]
    }

    /// A bundle: `top` includes `parts`, each a simple pack.
    fn bundle(top: (&str, &str), parts: &[(&str, &str)]) -> ValidatedBundle {
        let mut entries = pack_entries(top.0, top.1, parts, "// top\n");
        for (id, version) in parts {
            for e in pack_entries(id, version, &[], &format!("// {id}\n")) {
                entries.push(Entry {
                    path: format!("packs/{id}/{}", e.path),
                    bytes: e.bytes,
                });
            }
        }
        validate_entries(entries, &semver::Version::new(1, 0, 0)).unwrap()
    }

    pub(crate) fn none() -> BTreeSet<String> {
        BTreeSet::new()
    }

    fn store() -> (tempfile::TempDir, PackStore) {
        let dir = tempfile::tempdir().unwrap();
        let store = PackStore::open(dir.path().join("packs")).unwrap();
        (dir, store)
    }

    #[test]
    fn installs_and_lists() {
        let (_dir, mut store) = store();
        let changed = store
            .install(&bundle(("com.example.a", "1.0.0"), &[]), &none())
            .unwrap();
        assert_eq!(changed, vec!["com.example.a"]);
        let a = store.get("com.example.a").unwrap();
        assert!(a.enabled && a.top_level && a.status == PackStatus::Ok);
        assert!(store
            .pack_dir("com.example.a", "1.0.0")
            .join("main.js")
            .is_file());
        assert!(store.verify("com.example.a").is_ok());
    }

    #[test]
    fn shared_packs_are_installed_once_and_reference_counted() {
        let (_dir, mut store) = store();
        store
            .install(
                &bundle(
                    ("com.example.one", "1.0.0"),
                    &[("com.example.shared", "1.0.0")],
                ),
                &none(),
            )
            .unwrap();
        let changed = store
            .install(
                &bundle(
                    ("com.example.two", "1.0.0"),
                    &[("com.example.shared", "1.0.0")],
                ),
                &none(),
            )
            .unwrap();
        assert_eq!(
            changed,
            vec!["com.example.two"],
            "shared pack isn't rewritten"
        );
        let shared = store.get("com.example.shared").unwrap();
        assert_eq!(shared.used_by.len(), 2);
        assert!(!shared.top_level);

        assert_eq!(
            store.uninstall("com.example.one").unwrap(),
            vec!["com.example.one"]
        );
        assert!(
            store.get("com.example.shared").is_some(),
            "still used by two"
        );
        let removed = store.uninstall("com.example.two").unwrap();
        assert_eq!(removed, vec!["com.example.shared", "com.example.two"]);
        assert!(store.list().is_empty());
        assert!(!store.pack_dir("com.example.shared", "1.0.0").exists());
    }

    #[test]
    fn included_packs_cant_be_uninstalled_alone() {
        let (_dir, mut store) = store();
        store
            .install(
                &bundle(("com.example.b", "1.0.0"), &[("com.example.p", "1.0.0")]),
                &none(),
            )
            .unwrap();
        assert_eq!(
            store.uninstall("com.example.p").unwrap_err().code,
            INSTALL_NOT_FOUND
        );
    }

    #[test]
    fn same_version_with_different_files_conflicts() {
        let (_dir, mut store) = store();
        store
            .install(&bundle(("com.example.a", "1.0.0"), &[]), &none())
            .unwrap();
        let other = validate_entries(
            pack_entries("com.example.a", "1.0.0", &[], "// changed\n"),
            &semver::Version::new(1, 0, 0),
        )
        .unwrap();
        assert_eq!(
            store.install(&other, &none()).unwrap_err().code,
            INSTALL_CONFLICT
        );
    }

    #[test]
    fn upgrade_replaces_the_old_version_and_drops_unused_includes() {
        let (_dir, mut store) = store();
        store
            .install(
                &bundle(("com.example.b", "1.0.0"), &[("com.example.x", "1.0.0")]),
                &none(),
            )
            .unwrap();
        store.set_enabled("com.example.b", false).unwrap();
        store
            .install(&bundle(("com.example.b", "2.0.0"), &[]), &none())
            .unwrap();
        let b = store.get("com.example.b").unwrap();
        assert_eq!(b.version, "2.0.0");
        assert!(!b.enabled, "the user's choice survives an upgrade");
        assert!(store.get("com.example.x").is_none());
        assert!(!store.pack_dir("com.example.b", "1.0.0").exists());
        assert!(store.pack_dir("com.example.b", "2.0.0").exists());
    }

    #[test]
    fn a_pinned_include_blocks_a_conflicting_version() {
        let (_dir, mut store) = store();
        store
            .install(
                &bundle(
                    ("com.example.one", "1.0.0"),
                    &[("com.example.lib", "1.0.0")],
                ),
                &none(),
            )
            .unwrap();
        let err = store
            .install(
                &bundle(
                    ("com.example.two", "1.0.0"),
                    &[("com.example.lib", "2.0.0")],
                ),
                &none(),
            )
            .unwrap_err();
        assert_eq!(err.code, INSTALL_CONFLICT);
        assert!(store.get("com.example.two").is_none());
    }

    #[test]
    fn tampering_disables_the_pack_after_restart() {
        let (dir, mut store) = store();
        store
            .install(&bundle(("com.example.a", "1.0.0"), &[]), &none())
            .unwrap();
        let file = store.pack_dir("com.example.a", "1.0.0").join("main.js");
        fs::write(&file, "fetch('https://evil.example')\n").unwrap();
        drop(store);

        // "Restart": a fresh store over the same folder, then the launch check.
        let mut store = PackStore::open(dir.path().join("packs")).unwrap();
        assert_eq!(store.verify_all(), vec!["com.example.a"]);
        let a = store.get("com.example.a").unwrap();
        assert!(!a.enabled);
        assert_eq!(a.status, PackStatus::Tampered);
        assert_eq!(
            a.status_reason.as_deref(),
            Some("main.js: contents don't match files.json")
        );
        assert_eq!(
            store.set_enabled("com.example.a", true).unwrap_err().code,
            INSTALL_NEEDS_APPROVAL
        );

        // It survives another restart, and reinstalling approves it again.
        let mut store = PackStore::open(dir.path().join("packs")).unwrap();
        assert!(store.get("com.example.a").unwrap().needs_approval());
        store
            .install(&bundle(("com.example.a", "1.0.0"), &[]), &none())
            .unwrap();
        assert!(store.verify("com.example.a").is_ok());
        assert!(store.get("com.example.a").unwrap().enabled);
    }

    #[test]
    fn extra_and_missing_files_count_as_tampering() {
        let (_dir, mut store) = store();
        store
            .install(&bundle(("com.example.a", "1.0.0"), &[]), &none())
            .unwrap();
        let dir = store.pack_dir("com.example.a", "1.0.0");
        fs::write(dir.join("extra.js"), "// sneaky\n").unwrap();
        assert_eq!(
            store.verify("com.example.a").unwrap_err().message,
            "extra.js: not listed in files.json"
        );

        let (_d2, mut store) = self::store();
        store
            .install(&bundle(("com.example.a", "1.0.0"), &[]), &none())
            .unwrap();
        fs::remove_file(store.pack_dir("com.example.a", "1.0.0").join("LICENSE")).unwrap();
        assert_eq!(
            store.verify("com.example.a").unwrap_err().message,
            "LICENSE: listed in files.json but missing from the pack"
        );
    }

    #[test]
    fn a_crashed_pack_can_be_switched_back_on() {
        let (_dir, mut store) = store();
        store
            .install(&bundle(("com.example.a", "1.0.0"), &[]), &none())
            .unwrap();
        store
            .mark_crashed("com.example.a", "Stopped responding.")
            .unwrap();
        let a = store.get("com.example.a").unwrap();
        assert!(!a.enabled && a.status == PackStatus::Crashed && !a.needs_approval());
        let a = store.set_enabled("com.example.a", true).unwrap();
        assert!(a.enabled && a.status == PackStatus::Ok && a.status_reason.is_none());
    }

    #[test]
    fn open_removes_interrupted_installs() {
        let (dir, mut store) = store();
        store
            .install(&bundle(("com.example.a", "1.0.0"), &[]), &none())
            .unwrap();
        let root = dir.path().join("packs");
        fs::create_dir_all(root.join(".staging/abc/com.example.z")).unwrap();
        fs::create_dir_all(root.join("com.example.ghost/1.0.0")).unwrap();
        fs::create_dir_all(root.join("com.example.a/0.9.0")).unwrap();
        drop(store);
        let store = PackStore::open(&root).unwrap();
        assert!(!root.join(".staging").exists());
        assert!(!root.join("com.example.ghost").exists());
        assert!(!root.join("com.example.a/0.9.0").exists());
        assert!(store.pack_dir("com.example.a", "1.0.0").exists());
    }
}
