//! Packs: installable, sandboxed JS packages (spec/packs/), plus Connected
//! apps, the local HTTP API for external programs. Both share one set of
//! permission names and one permission broker.

pub mod archive;
pub mod broker;
#[cfg(test)]
mod broker_tests;
pub mod commands;
pub mod connected_apps;
pub mod dev;
pub mod error;
pub mod files_list;
#[cfg(test)]
mod fixture_tests;
pub mod host;
pub mod manifest;
pub mod net;
#[cfg(test)]
mod net_tests;
pub mod signature;
#[cfg(test)]
mod signature_tests;
#[cfg(any(test, feature = "pack-signing"))]
pub mod signer;
pub mod store;
pub mod validate;

use broker::{Broker, Bus};
use serde_json::Value;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_store::StoreExt;

/// Grants and settings live in `packs.json`, next to Connected apps' state.
const STORE_FILE: &str = "packs.json";

/// The broker's way into the app: Tauri events and the store.
struct AppBus(AppHandle);

impl Bus for AppBus {
    fn emit(&self, window: Option<&str>, event: &str, payload: Value) -> bool {
        match window {
            Some(label) => self.0.emit_to(label, event, payload).is_ok(),
            None => self.0.emit(event, payload).is_ok(),
        }
    }

    fn save(&self, key: &str, value: Value) {
        match self.0.store(STORE_FILE) {
            Ok(store) => {
                store.set(key, value);
                if let Err(e) = store.save() {
                    eprintln!("[packs] failed to save {STORE_FILE}: {e}");
                }
            }
            Err(e) => eprintln!("[packs] failed to open {STORE_FILE}: {e}"),
        }
    }
}

fn load<T: serde::de::DeserializeOwned + Default>(app: &AppHandle, key: &str) -> T {
    app.store(STORE_FILE)
        .ok()
        .and_then(|s| s.get(key))
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

/// Start packs: the broker, then Connected apps and the pack store on top.
pub fn init(app: &AppHandle) {
    let broker = Arc::new(Broker::new(
        Arc::new(AppBus(app.clone())),
        load(app, Broker::STORE_KEY_GRANTS),
        load(app, Broker::STORE_KEY_SETTINGS),
    ));
    // Windows answer routed calls through `packs_rpc_result`, which needs it.
    app.manage(broker.clone());
    connected_apps::init(app, broker.clone());
    commands::init(app, broker);
}
