//! Tauri commands for installing and managing packs (Settings → Packs).
//!
//! Install is two steps so the user approves exactly what gets installed:
//! `packs_inspect` validates the file and describes it for the install
//! prompt, including a `bundleHash`; `packs_install` validates it again and
//! refuses if that hash changed in between.

use super::error::{PackError, PackResult, INSTALL_CHANGED};
use super::files_list::sha256_hex;
use super::manifest::{Author, Manifest, PERMISSIONS};
use super::store::{InstalledPack, PackStatus, PackStore};
use super::validate::{self, ValidatedBundle, ValidatedPack};
use serde::Serialize;
use std::collections::{BTreeMap, BTreeSet};
use std::path::PathBuf;
use std::sync::{Arc, Mutex, MutexGuard};
use tauri::{AppHandle, Emitter, Manager, State};

pub struct Packs {
    app: AppHandle,
    app_version: semver::Version,
    store: Mutex<Option<PackStore>>,
}

impl Packs {
    fn store(&self) -> PackResult<MutexGuard<'_, Option<PackStore>>> {
        let guard = self.store.lock().unwrap_or_else(|e| e.into_inner());
        if guard.is_none() {
            return Err(PackError::install(
                super::error::INSTALL_IO,
                "The packs folder isn't available.",
            ));
        }
        Ok(guard)
    }

    fn emit_changed(&self) {
        let _ = self.app.emit("packs:changed", ());
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionSummary {
    pub permission: String,
    pub network: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledInfo {
    pub version: String,
    pub same_files: bool,
}

/// One pack, as the install prompt shows it.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackSummary {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub author: Author,
    pub license: String,
    pub permissions: Vec<PermissionSummary>,
    pub settings: usize,
    pub includes: Vec<String>,
    /// A signature file is present. Whether it verifies is #121's check.
    pub signed: bool,
    pub installed: Option<InstalledInfo>,
}

/// A permission across the pack and everything it includes.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CombinedPermission {
    pub permission: String,
    pub packs: Vec<String>,
    pub network: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectResult {
    pub bundle_hash: String,
    pub pack: PackSummary,
    pub included: Vec<PackSummary>,
    pub permissions: Vec<CombinedPermission>,
    /// Set when the pack is valid but can't be installed next to what's
    /// already installed (a version conflict).
    pub conflict: Option<PackError>,
}

/// An installed pack, for Settings.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackListItem {
    pub id: String,
    pub version: String,
    pub manifest: Manifest,
    pub enabled: bool,
    pub top_level: bool,
    pub used_by: BTreeSet<String>,
    pub status: PackStatus,
    pub status_reason: Option<String>,
    pub installed_at: u64,
}

impl From<InstalledPack> for PackListItem {
    fn from(p: InstalledPack) -> Self {
        PackListItem {
            id: p.id,
            version: p.version,
            manifest: p.manifest,
            enabled: p.enabled,
            top_level: p.top_level,
            used_by: p.used_by,
            status: p.status,
            status_reason: p.status_reason,
            installed_at: p.installed_at,
        }
    }
}

/// Identifies exactly what `packs_inspect` showed: every pack and its hash.
pub fn bundle_hash(bundle: &ValidatedBundle) -> String {
    let lines: String = bundle
        .all()
        .map(|p| format!("{}@{} {}\n", p.manifest.id, p.manifest.version, p.pack_hash))
        .collect();
    sha256_hex(lines.as_bytes())
}

fn summarize(pack: &ValidatedPack, store: &PackStore) -> PackSummary {
    let m = &pack.manifest;
    PackSummary {
        id: m.id.clone(),
        name: m.name.clone(),
        version: m.version.clone(),
        description: m.description.clone(),
        author: m.author.clone(),
        license: m.license.clone(),
        permissions: m
            .permission_names()
            .into_iter()
            .map(|p| PermissionSummary {
                permission: p.into(),
                network: m.permissions[p].network.clone(),
            })
            .collect(),
        settings: m.settings.len(),
        includes: m.includes.iter().map(|i| i.id.clone()).collect(),
        signed: pack.signature.is_some(),
        installed: store.get(&m.id).map(|i| InstalledInfo {
            version: i.version.clone(),
            same_files: i.pack_hash == pack.pack_hash,
        }),
    }
}

/// Every permission any pack in the bundle asks for, with the sites combined.
pub fn combine_permissions(bundle: &ValidatedBundle) -> Vec<CombinedPermission> {
    let mut out: BTreeMap<&str, (Vec<String>, BTreeSet<String>)> = BTreeMap::new();
    for pack in bundle.all() {
        for p in pack.manifest.permission_names() {
            let (packs, sites) = out.entry(p).or_default();
            packs.push(pack.manifest.id.clone());
            sites.extend(pack.manifest.permissions[p].network.iter().cloned());
        }
    }
    PERMISSIONS
        .iter()
        .filter_map(|p| {
            let (packs, sites) = out.remove(p)?;
            Some(CombinedPermission {
                permission: (*p).into(),
                packs,
                network: sites.into_iter().collect(),
            })
        })
        .collect()
}

pub fn init(app: &AppHandle) {
    let app_version = semver::Version::parse(&app.package_info().version.to_string())
        .unwrap_or_else(|_| semver::Version::new(0, 0, 0));
    let store = match app.path().app_data_dir() {
        Ok(dir) => match PackStore::open(dir.join("packs")) {
            Ok(mut store) => {
                let disabled = store.verify_all();
                if !disabled.is_empty() {
                    eprintln!(
                        "[packs] disabled after files changed: {}",
                        disabled.join(", ")
                    );
                }
                Some(store)
            }
            Err(e) => {
                eprintln!("[packs] {e}");
                None
            }
        },
        Err(e) => {
            eprintln!("[packs] no app data folder: {e}");
            None
        }
    };
    app.manage(Arc::new(Packs {
        app: app.clone(),
        app_version,
        store: Mutex::new(store),
    }));
}

type PacksState<'a> = State<'a, Arc<Packs>>;

#[tauri::command]
pub fn packs_inspect(packs: PacksState<'_>, path: String) -> PackResult<InspectResult> {
    let bundle = validate::validate_zip_file(&PathBuf::from(path), &packs.app_version)?;
    let guard = packs.store()?;
    let store = guard.as_ref().expect("checked in store()");
    Ok(InspectResult {
        bundle_hash: bundle_hash(&bundle),
        pack: summarize(&bundle.top, store),
        included: bundle
            .included
            .iter()
            .map(|p| summarize(p, store))
            .collect(),
        permissions: combine_permissions(&bundle),
        conflict: store.check_install(&bundle).err(),
    })
}

#[tauri::command]
pub fn packs_install(
    packs: PacksState<'_>,
    path: String,
    bundle_hash: String,
) -> PackResult<Vec<PackListItem>> {
    let bundle = validate::validate_zip_file(&PathBuf::from(path), &packs.app_version)?;
    if self::bundle_hash(&bundle) != bundle_hash {
        return Err(PackError::install(
            INSTALL_CHANGED,
            "The pack file changed after you reviewed it. Open it again to review the new version.",
        ));
    }
    let list = {
        let mut guard = packs.store()?;
        let store = guard.as_mut().expect("checked in store()");
        store.install(&bundle)?;
        store.list()
    };
    packs.emit_changed();
    Ok(list.into_iter().map(PackListItem::from).collect())
}

#[tauri::command]
pub fn packs_uninstall(packs: PacksState<'_>, id: String) -> PackResult<Vec<String>> {
    let removed = packs
        .store()?
        .as_mut()
        .expect("checked in store()")
        .uninstall(&id)?;
    packs.emit_changed();
    Ok(removed)
}

#[tauri::command]
pub fn packs_list(packs: PacksState<'_>) -> PackResult<Vec<PackListItem>> {
    let guard = packs.store()?;
    let list = guard.as_ref().expect("checked in store()").list();
    Ok(list.into_iter().map(PackListItem::from).collect())
}

#[tauri::command]
pub fn packs_set_enabled(
    packs: PacksState<'_>,
    id: String,
    enabled: bool,
) -> PackResult<PackListItem> {
    let result = packs
        .store()?
        .as_mut()
        .expect("checked in store()")
        .set_enabled(&id, enabled);
    // A failed enable can still have changed state (marked for re-approval).
    packs.emit_changed();
    result.map(PackListItem::from)
}
