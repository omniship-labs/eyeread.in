//! Tauri commands for installing and managing packs (Settings → Packs).
//!
//! Install is two steps so the user approves exactly what gets installed:
//! `packs_inspect` validates the file and describes it for the install
//! prompt, including a `bundleHash`; `packs_install` validates it again and
//! refuses if that hash changed in between.

use super::broker::{Broker, Grant};
use super::error::{PackError, PackResult, INSTALL_CHANGED, INSTALL_NOT_FOUND};
use super::files_list::sha256_hex;
use super::manifest::{Author, Manifest, PERMISSIONS};
use super::net::{LogEntry, NetPolicy, NetProxy, ReqwestTransport};
use super::signature::{self, BundleVerification, Keyring, RevocationList, Verification};
use super::store::{InstalledPack, PackStatus, PackStore};
use super::validate::{self, ValidatedBundle, ValidatedPack};
use serde::Serialize;
use serde_json::{Map, Value};
use std::collections::{BTreeMap, BTreeSet};
use std::path::PathBuf;
use std::sync::{Arc, Mutex, MutexGuard};
use tauri::{AppHandle, Emitter, Manager, State};

pub struct Packs {
    app: AppHandle,
    broker: Arc<Broker>,
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
    /// This pack's own signature check.
    pub verification: Verification,
    /// ✓ Verified by eyeread.in: it and everything it includes verify.
    pub verified: bool,
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
    pub verified: bool,
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
            verified: p.verified,
            installed_at: p.installed_at,
        }
    }
}

impl NetPolicy for Packs {
    /// Sites the installed pack declares for `permission`; none while the
    /// pack is off or waiting for re-approval.
    fn declared_sites(&self, pack: &str, permission: &str) -> Vec<String> {
        let guard = self.store.lock().unwrap_or_else(|e| e.into_inner());
        guard
            .as_ref()
            .and_then(|s| s.get(pack))
            .filter(|p| p.enabled && !p.needs_approval())
            .and_then(|p| p.manifest.permissions.get(permission))
            .map(|d| d.network.clone())
            .unwrap_or_default()
    }

    /// The user's per-permission internet switch, from the broker.
    fn internet_allowed(&self, pack: &str, permission: &str) -> bool {
        self.broker.internet_allowed(pack, permission)
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

fn summarize(pack: &ValidatedPack, store: &PackStore, checks: &BundleVerification) -> PackSummary {
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
        verification: checks.packs[&m.id].clone(),
        verified: checks.is_verified(&m.id),
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

pub fn init(app: &AppHandle, broker: Arc<Broker>) {
    let app_version = semver::Version::parse(&app.package_info().version.to_string())
        .unwrap_or_else(|_| semver::Version::new(0, 0, 0));
    let store = match app.path().app_data_dir() {
        Ok(dir) => match PackStore::open(dir.join("packs")) {
            Ok(mut store) => {
                match store.apply_revocations(RevocationList::embedded()) {
                    Ok(ids) if !ids.is_empty() => eprintln!("[packs] revoked: {}", ids.join(", ")),
                    Err(e) => eprintln!("[packs] {e}"),
                    _ => {}
                }
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
    let packs = Arc::new(Packs {
        app: app.clone(),
        broker,
        app_version,
        store: Mutex::new(store),
    });
    let user_agent = format!("eyeread.in/{} (packs)", app.package_info().version);
    let net = NetProxy::new(packs.clone(), Arc::new(ReqwestTransport::new(user_agent)));
    app.manage(packs);
    app.manage(Arc::new(net));
}

type PacksState<'a> = State<'a, Arc<Packs>>;

/// Validate a pack file and run the signature and revocation step.
fn check(packs: &Packs, path: String) -> PackResult<(ValidatedBundle, BundleVerification)> {
    let bundle = validate::validate_zip_file(&PathBuf::from(path), &packs.app_version)?;
    let checks = signature::check_bundle(&bundle, Keyring::embedded(), RevocationList::embedded())?;
    Ok((bundle, checks))
}

#[tauri::command]
pub fn packs_inspect(packs: PacksState<'_>, path: String) -> PackResult<InspectResult> {
    let (bundle, checks) = check(&packs, path)?;
    let guard = packs.store()?;
    let store = guard.as_ref().expect("checked in store()");
    Ok(InspectResult {
        bundle_hash: bundle_hash(&bundle),
        pack: summarize(&bundle.top, store, &checks),
        included: bundle
            .included
            .iter()
            .map(|p| summarize(p, store, &checks))
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
    let (bundle, checks) = check(&packs, path)?;
    if self::bundle_hash(&bundle) != bundle_hash {
        return Err(PackError::install(
            INSTALL_CHANGED,
            "The pack file changed after you reviewed it. Open it again to review the new version.",
        ));
    }
    let list = {
        let mut guard = packs.store()?;
        let store = guard.as_mut().expect("checked in store()");
        let verified: BTreeSet<String> = bundle
            .all()
            .map(|p| p.manifest.id.clone())
            .filter(|id| checks.is_verified(id))
            .collect();
        store.install(&bundle, &verified)?;
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
    for id in &removed {
        packs.broker.forget_pack(id);
    }
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

/// The pack's network log, for its Settings screen: time, permission,
/// method, host, status and bytes. Never bodies.
#[tauri::command]
pub fn packs_net_log(net: State<'_, Arc<NetProxy>>, id: String) -> Vec<LogEntry> {
    net.log(&id)
}

#[tauri::command]
pub fn packs_net_clear_log(net: State<'_, Arc<NetProxy>>, id: String) {
    net.clear_log(&id);
}

// ---- broker: window answers, prompter state, grants and settings ------------

/// A window's answer to a call the broker routed to it.
#[tauri::command]
pub fn packs_rpc_result(
    broker: State<'_, Arc<Broker>>,
    id: String,
    result: Option<Value>,
    error: Option<String>,
) {
    broker.rpc_result(&id, result, error);
}

/// The overlay reports its reading state here (throttled on the JS side).
#[tauri::command]
pub fn packs_prompter_state(broker: State<'_, Arc<Broker>>, state: Value) {
    broker.set_prompter_state(state);
}

/// One row of a pack's Allow / Internet grid.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionGrant {
    pub permission: String,
    /// Sites declared for this permission; empty means it has no internet.
    pub network: Vec<String>,
    pub allowed: bool,
    pub internet: bool,
}

fn installed_manifest(packs: &Packs, id: &str) -> PackResult<Manifest> {
    packs
        .store()?
        .as_ref()
        .expect("checked in store()")
        .get(id)
        .map(|p| p.manifest.clone())
        .ok_or_else(|| PackError::install(INSTALL_NOT_FOUND, format!("{id} isn't installed.")))
}

fn grant_rows(packs: &Packs, id: &str, manifest: &Manifest) -> Vec<PermissionGrant> {
    manifest
        .permission_names()
        .into_iter()
        .map(|p| {
            let g = packs.broker.grant(id, p);
            PermissionGrant {
                permission: p.into(),
                network: manifest.permissions[p].network.clone(),
                allowed: g.allowed,
                internet: g.internet,
            }
        })
        .collect()
}

/// The pack's declared permissions and the user's grant for each. Every
/// grant starts off.
#[tauri::command]
pub fn packs_grants(packs: PacksState<'_>, id: String) -> PackResult<Vec<PermissionGrant>> {
    let manifest = installed_manifest(&packs, &id)?;
    Ok(grant_rows(&packs, &id, &manifest))
}

/// Switch a permission (and its internet access) on or off. Only declared
/// permissions can be granted, and internet only where sites are declared.
#[tauri::command]
pub fn packs_set_grant(
    packs: PacksState<'_>,
    id: String,
    permission: String,
    allowed: bool,
    internet: bool,
) -> PackResult<Vec<PermissionGrant>> {
    let manifest = installed_manifest(&packs, &id)?;
    let decl = manifest
        .permissions
        .get(&permission)
        .ok_or_else(|| PackError::new("E_PERMISSION", &[("permission", &permission)]))?;
    let internet = internet && !decl.network.is_empty();
    packs
        .broker
        .set_grant(&id, &permission, Grant { allowed, internet });
    Ok(grant_rows(&packs, &id, &manifest))
}

/// Every declared setting's value, defaults filled in.
fn effective_settings(manifest: &Manifest, stored: &Map<String, Value>) -> Map<String, Value> {
    manifest
        .settings
        .iter()
        .map(|s| {
            let value = stored
                .get(&s.key)
                .and_then(|v| s.check_value(v).ok())
                .unwrap_or_else(|| s.default_value());
            (s.key.clone(), value)
        })
        .collect()
}

#[tauri::command]
pub fn packs_settings_get(packs: PacksState<'_>, id: String) -> PackResult<Map<String, Value>> {
    let manifest = installed_manifest(&packs, &id)?;
    Ok(effective_settings(&manifest, &packs.broker.settings(&id)))
}

/// Change some of a pack's declared settings. Each value is checked against
/// its declaration; the pack's sandboxes get the new values.
#[tauri::command]
pub fn packs_settings_set(
    packs: PacksState<'_>,
    id: String,
    values: Map<String, Value>,
) -> PackResult<Map<String, Value>> {
    let manifest = installed_manifest(&packs, &id)?;
    let mut stored = packs.broker.settings(&id);
    for (key, value) in values {
        let setting = manifest
            .settings
            .iter()
            .find(|s| s.key == key)
            .ok_or_else(|| {
                PackError::new(
                    "E_INVALID_ARGUMENT",
                    &[("detail", &format!("{key} isn't a setting of this pack"))],
                )
            })?;
        let value = setting.check_value(&value).map_err(|why| {
            PackError::new(
                "E_INVALID_ARGUMENT",
                &[("detail", &format!("{key}: {why}"))],
            )
        })?;
        stored.insert(key, value);
    }
    // Keys the manifest no longer declares are dropped.
    stored.retain(|k, _| manifest.settings.iter().any(|s| s.key == *k));
    let effective = effective_settings(&manifest, &stored);
    packs
        .broker
        .set_settings(&id, stored, Value::Object(effective.clone()));
    Ok(effective)
}
