//! The permission broker: one grant model for packs and connected apps, and
//! the one route every action takes into the app.
//!
//! - **Grants.** Per pack and permission, `{ allowed, internet }`, all off
//!   until the user turns them on; per connected app, the scopes it was paired
//!   with. Every call is checked here at the moment it's made, so revoking
//!   takes effect on the very next call.
//! - **Actions.** `call()` validates a request and hands it to the window that
//!   owns the state (the library in `main`, transport in `overlay`), so it runs
//!   through the same code as the UI. Each call carries its caller, which the
//!   windows use for attribution ("Paused by Foot Pedal", a script's source).
//! - **Declared settings.** Values per pack, with a change event for the
//!   pack's sandboxes.

use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::collections::{BTreeMap, HashMap, HashSet};
use std::sync::mpsc::{self, RecvTimeoutError, SyncSender};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::Duration;

pub const PERMISSION_SCRIPTS_WRITE: &str = "scripts:write";
pub const PERMISSION_PROMPTER_LOAD: &str = "prompter:load";
pub const PERMISSION_PROMPTER_CONTROL: &str = "prompter:control";
pub const PERMISSION_PROMPTER_EVENTS: &str = "prompter:events";
pub const PERMISSION_FILES_IMPORT: &str = "files:import";

const CONTROL_ACTIONS: [&str; 6] = ["play", "pause", "toggle", "restart", "seek", "close"];
const MAX_TITLE_CHARS: usize = 200;
const MAX_TEXT_BYTES: usize = 1024 * 1024;
pub const MAX_IMPORT_BYTES: u64 = 10 * 1024 * 1024;
const MAX_ACCEPT: usize = 16;
const RPC_TIMEOUT: Duration = Duration::from_secs(10);
/// The user may take a while to pick a file.
const IMPORT_TIMEOUT: Duration = Duration::from_secs(15 * 60);

const STORE_KEY_GRANTS: &str = "packGrants";
const STORE_KEY_SETTINGS: &str = "packSettings";

/// Which permission each action needs.
pub fn permission_for(method: &str) -> Option<&'static str> {
    Some(match method {
        "scripts.add" => PERMISSION_SCRIPTS_WRITE,
        "prompter.load" => PERMISSION_PROMPTER_LOAD,
        "prompter.control" => PERMISSION_PROMPTER_CONTROL,
        "prompter.getState" => PERMISSION_PROMPTER_EVENTS,
        "files.import" => PERMISSION_FILES_IMPORT,
        _ => return None,
    })
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Grant {
    pub allowed: bool,
    /// Only meaningful with `allowed`, and only for permissions that declare
    /// `network`.
    pub internet: bool,
}

/// Who is asking. Windows show `name` for attribution.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Caller {
    App {
        id: String,
        name: String,
    },
    // Built by the pack host (#122) for calls from a sandbox.
    #[cfg_attr(not(test), allow(dead_code))]
    Pack {
        id: String,
        name: String,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CallError {
    /// Not granted, revoked, or the method isn't this permission's.
    Denied(String),
    /// Bad arguments; the code names the field (`text_required`, …).
    Invalid(&'static str),
    /// The window answered with an error code (`no_active_session`, …).
    Window(String),
    /// Another file picker from this pack is open.
    Busy,
    /// The window didn't answer in time.
    Timeout,
    /// No window to send to.
    Unavailable,
}

impl CallError {
    /// The spec's runtime error code, for packs (sent by the host, #122).
    #[cfg_attr(not(test), allow(dead_code))]
    pub fn runtime_code(&self) -> &'static str {
        match self {
            CallError::Denied(_) => "E_PERMISSION",
            CallError::Invalid(_) => "E_INVALID_ARGUMENT",
            CallError::Window(c) if c == "no_active_session" => "E_NO_SESSION",
            CallError::Window(c) if c == "invalid_params" => "E_INVALID_ARGUMENT",
            CallError::Busy => "E_BUSY",
            CallError::Window(_) | CallError::Timeout | CallError::Unavailable => "E_INTERNAL",
        }
    }
}

/// How the broker reaches the app: window events and persistence. The app
/// implements it over Tauri; tests use a fake.
pub trait Bus: Send + Sync {
    /// Emit to one window (`Some(label)`) or to all of them (`None`).
    fn emit(&self, window: Option<&str>, event: &str, payload: Value) -> bool;
    fn save(&self, key: &str, value: Value);
}

type StateListener = Box<dyn Fn(&Value) + Send + Sync>;

struct Inner {
    pack_grants: BTreeMap<String, BTreeMap<String, Grant>>,
    app_scopes: HashMap<String, Vec<String>>,
    settings: BTreeMap<String, Map<String, Value>>,
    rpc: HashMap<String, SyncSender<Result<Value, String>>>,
    importing: HashSet<String>,
    prompter: Value,
}

pub struct Broker {
    bus: Arc<dyn Bus>,
    inner: Mutex<Inner>,
    listeners: Mutex<Vec<StateListener>>,
    rpc_timeout: Duration,
}

pub fn idle_prompter_state() -> Value {
    json!({
        "sessionActive": false,
        "playing": false,
        "scriptId": null,
        "title": null,
        "wordIndex": 0,
        "wordCount": 0,
    })
}

fn random_id() -> String {
    let mut buf = [0u8; 16];
    getrandom::getrandom(&mut buf).expect("OS random source unavailable");
    buf.iter().map(|b| format!("{b:02x}")).collect()
}

// ---- argument validation (pure) -----------------------------------------------

/// A script for the library or prompter. The title defaults to the caller's
/// name: `From <app>` for connected apps, the pack's name for packs.
pub fn validate_script(params: &Value, caller: &Caller) -> Result<Value, &'static str> {
    let text = params
        .get("text")
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or("");
    if text.is_empty() {
        return Err("text_required");
    }
    if text.len() > MAX_TEXT_BYTES {
        return Err("text_too_long");
    }
    let title = match params.get("title") {
        None | Some(Value::Null) => match caller {
            Caller::App { name, .. } => format!("From {name}"),
            Caller::Pack { name, .. } => name.clone(),
        },
        Some(Value::String(t))
            if !t.trim().is_empty() && t.trim().chars().count() <= MAX_TITLE_CHARS =>
        {
            t.trim().to_string()
        }
        _ => return Err("invalid_title"),
    };
    let language = match params.get("language") {
        None | Some(Value::Null) => Value::Null,
        Some(Value::String(l))
            if (2..=16).contains(&l.len())
                && l.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') =>
        {
            Value::String(l.clone())
        }
        _ => return Err("invalid_language"),
    };
    Ok(json!({ "title": title, "text": text, "language": language }))
}

pub fn validate_control(params: &Value) -> Result<Value, &'static str> {
    let action = params
        .get("action")
        .and_then(Value::as_str)
        .filter(|a| CONTROL_ACTIONS.contains(a))
        .ok_or("invalid_action")?;
    if action == "seek" {
        let idx = params
            .get("wordIndex")
            .and_then(Value::as_u64)
            .ok_or("invalid_word_index")?;
        return Ok(json!({ "action": action, "wordIndex": idx }));
    }
    Ok(json!({ "action": action }))
}

/// `files.import` options: extensions like `.md` (up to 16), and a size cap
/// of at most 10 MiB.
pub fn validate_import(params: &Value) -> Result<Value, &'static str> {
    let accept = match params.get("accept") {
        None | Some(Value::Null) => Vec::new(),
        Some(Value::Array(items)) if items.len() <= MAX_ACCEPT => items
            .iter()
            .map(|i| {
                i.as_str()
                    .filter(|e| {
                        e.len() >= 2
                            && e.len() <= 11
                            && e.starts_with('.')
                            && e[1..].chars().all(|c| c.is_ascii_alphanumeric())
                    })
                    .map(str::to_ascii_lowercase)
                    .ok_or("invalid_accept")
            })
            .collect::<Result<_, _>>()?,
        _ => return Err("invalid_accept"),
    };
    let max_bytes = match params.get("maxBytes") {
        None | Some(Value::Null) => MAX_IMPORT_BYTES,
        Some(v) => v
            .as_u64()
            .filter(|n| (1..=MAX_IMPORT_BYTES).contains(n))
            .ok_or("invalid_max_bytes")?,
    };
    Ok(json!({ "accept": accept, "maxBytes": max_bytes }))
}

/// What a pack gets back from `files.import`: exactly name, type, size and
/// contents (base64), whatever else the window sent. `null` if cancelled.
fn sanitize_import(result: Value, max_bytes: u64) -> Result<Value, CallError> {
    if result.is_null() {
        return Ok(Value::Null);
    }
    let text = |key: &str| result.get(key).and_then(Value::as_str).map(String::from);
    let (Some(name), Some(data)) = (text("name"), text("data")) else {
        return Err(CallError::Window("invalid_file".into()));
    };
    // Base64 is 4 characters per 3 bytes.
    let size =
        (data.len() as u64 / 4) * 3 - data.bytes().rev().take_while(|b| *b == b'=').count() as u64;
    if size > max_bytes {
        return Err(CallError::Window("file_too_large".into()));
    }
    let name = name
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or_default()
        .to_string();
    Ok(json!({
        "name": name,
        "type": text("type").unwrap_or_default(),
        "size": size,
        "data": data,
    }))
}

// ---- the broker ---------------------------------------------------------------

impl Broker {
    pub fn new(
        bus: Arc<dyn Bus>,
        pack_grants: BTreeMap<String, BTreeMap<String, Grant>>,
        settings: BTreeMap<String, Map<String, Value>>,
    ) -> Self {
        Broker {
            bus,
            inner: Mutex::new(Inner {
                pack_grants,
                app_scopes: HashMap::new(),
                settings,
                rpc: HashMap::new(),
                importing: HashSet::new(),
                prompter: idle_prompter_state(),
            }),
            listeners: Mutex::new(Vec::new()),
            rpc_timeout: RPC_TIMEOUT,
        }
    }

    #[cfg(test)]
    pub fn with_rpc_timeout(mut self, timeout: Duration) -> Self {
        self.rpc_timeout = timeout;
        self
    }

    pub const STORE_KEY_GRANTS: &'static str = STORE_KEY_GRANTS;
    pub const STORE_KEY_SETTINGS: &'static str = STORE_KEY_SETTINGS;

    fn lock(&self) -> MutexGuard<'_, Inner> {
        self.inner.lock().unwrap_or_else(|e| e.into_inner())
    }

    // ---- grants ----

    pub fn grant(&self, pack: &str, permission: &str) -> Grant {
        self.lock()
            .pack_grants
            .get(pack)
            .and_then(|g| g.get(permission))
            .copied()
            .unwrap_or_default()
    }

    /// Set a pack's grant for one permission. Internet can only be on while
    /// the permission is allowed. Tells every window (the pack host restarts
    /// the affected sandbox).
    pub fn set_grant(&self, pack: &str, permission: &str, grant: Grant) -> Grant {
        let grant = Grant {
            allowed: grant.allowed,
            internet: grant.allowed && grant.internet,
        };
        let snapshot = {
            let mut inner = self.lock();
            inner
                .pack_grants
                .entry(pack.to_string())
                .or_default()
                .insert(permission.to_string(), grant);
            serde_json::to_value(&inner.pack_grants).unwrap_or(Value::Null)
        };
        self.bus.save(STORE_KEY_GRANTS, snapshot);
        self.bus
            .emit(None, "packs:grants-changed", json!({ "id": pack }));
        grant
    }

    /// Drop everything stored for an uninstalled pack.
    pub fn forget_pack(&self, pack: &str) {
        let (grants, settings) = {
            let mut inner = self.lock();
            inner.pack_grants.remove(pack);
            inner.settings.remove(pack);
            (
                serde_json::to_value(&inner.pack_grants).unwrap_or(Value::Null),
                serde_json::to_value(&inner.settings).unwrap_or(Value::Null),
            )
        };
        self.bus.save(STORE_KEY_GRANTS, grants);
        self.bus.save(STORE_KEY_SETTINGS, settings);
    }

    /// Connected apps' grants are their paired scopes; the HTTP API keeps
    /// the broker in sync on pair, revoke and start-up.
    pub fn set_app_scopes(&self, app: &str, scopes: Vec<String>) {
        self.lock().app_scopes.insert(app.to_string(), scopes);
    }

    pub fn remove_app(&self, app: &str) {
        self.lock().app_scopes.remove(app);
    }

    pub fn allowed(&self, caller: &Caller, permission: &str) -> bool {
        let inner = self.lock();
        match caller {
            Caller::App { id, .. } => inner
                .app_scopes
                .get(id)
                .is_some_and(|s| s.iter().any(|p| p == permission)),
            Caller::Pack { id, .. } => inner
                .pack_grants
                .get(id)
                .and_then(|g| g.get(permission))
                .is_some_and(|g| g.allowed),
        }
    }

    pub fn internet_allowed(&self, pack: &str, permission: &str) -> bool {
        let g = self.grant(pack, permission);
        g.allowed && g.internet
    }

    // ---- declared settings ----

    /// Values the user set for a pack (without defaults).
    pub fn settings(&self, pack: &str) -> Map<String, Value> {
        self.lock().settings.get(pack).cloned().unwrap_or_default()
    }

    /// Store a pack's values (already validated against its manifest) and
    /// tell its sandboxes.
    pub fn set_settings(&self, pack: &str, values: Map<String, Value>, effective: Value) {
        let snapshot = {
            let mut inner = self.lock();
            inner.settings.insert(pack.to_string(), values);
            serde_json::to_value(&inner.settings).unwrap_or(Value::Null)
        };
        self.bus.save(STORE_KEY_SETTINGS, snapshot);
        self.bus.emit(
            None,
            "packs:settings-changed",
            json!({ "id": pack, "values": effective }),
        );
    }

    // ---- prompter state ----

    pub fn prompter_state(&self) -> Value {
        self.lock().prompter.clone()
    }

    /// The overlay reports its reading state here; listeners (event streams,
    /// sandboxes) get every update.
    pub fn set_prompter_state(&self, state: Value) {
        self.lock().prompter = state.clone();
        for listener in self
            .listeners
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .iter()
        {
            listener(&state);
        }
    }

    pub fn on_prompter_state(&self, listener: StateListener) {
        self.listeners
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .push(listener);
    }

    // ---- actions ----

    /// Run an action for `caller`: check its grant for `permission` now,
    /// validate the arguments, and hand it to the window that owns the state.
    pub fn call(
        &self,
        caller: &Caller,
        permission: &str,
        method: &str,
        params: &Value,
    ) -> Result<Value, CallError> {
        if permission_for(method) != Some(permission) || !self.allowed(caller, permission) {
            return Err(CallError::Denied(permission.to_string()));
        }
        match method {
            "scripts.add" => {
                let params = validate_script(params, caller).map_err(CallError::Invalid)?;
                self.rpc("main", "scripts.create", caller, params, self.rpc_timeout)
            }
            "prompter.load" => {
                let params = validate_script(params, caller).map_err(CallError::Invalid)?;
                self.rpc("main", "prompter.load", caller, params, self.rpc_timeout)
            }
            "prompter.control" => {
                let params = validate_control(params).map_err(CallError::Invalid)?;
                self.rpc(
                    "overlay",
                    "prompter.control",
                    caller,
                    params,
                    self.rpc_timeout,
                )
                .map(|_| Value::Null)
            }
            "prompter.getState" => Ok(self.prompter_state()),
            "files.import" => {
                // A connected app is an ordinary program: it reads files itself.
                let Caller::Pack { id, .. } = caller else {
                    return Err(CallError::Denied(permission.to_string()));
                };
                let params = validate_import(params).map_err(CallError::Invalid)?;
                if !self.lock().importing.insert(id.clone()) {
                    return Err(CallError::Busy);
                }
                let max = params["maxBytes"].as_u64().unwrap_or(MAX_IMPORT_BYTES);
                let result = self.rpc("main", "files.import", caller, params, IMPORT_TIMEOUT);
                self.lock().importing.remove(id);
                sanitize_import(result?, max)
            }
            _ => Err(CallError::Denied(permission.to_string())),
        }
    }

    /// Hand `method` to a window and wait for its answer (`rpc_result`). Each
    /// window listens on its own event name: a JS `listen()` receives events
    /// for every target, so a shared name would deliver main's calls to the
    /// overlay too.
    fn rpc(
        &self,
        window: &str,
        method: &str,
        caller: &Caller,
        params: Value,
        timeout: Duration,
    ) -> Result<Value, CallError> {
        let id = random_id();
        let (tx, rx) = mpsc::sync_channel(1);
        self.lock().rpc.insert(id.clone(), tx);
        let payload = json!({ "id": id, "method": method, "params": params, "caller": caller });
        if !self
            .bus
            .emit(Some(window), &format!("packs:rpc:{window}"), payload)
        {
            self.lock().rpc.remove(&id);
            return Err(CallError::Unavailable);
        }
        let outcome = rx.recv_timeout(timeout);
        self.lock().rpc.remove(&id);
        match outcome {
            Ok(Ok(value)) => Ok(value),
            Ok(Err(code)) => Err(CallError::Window(code)),
            Err(RecvTimeoutError::Timeout) => Err(CallError::Timeout),
            Err(RecvTimeoutError::Disconnected) => Err(CallError::Unavailable),
        }
    }

    /// A window's answer to an RPC.
    pub fn rpc_result(&self, id: &str, result: Option<Value>, error: Option<String>) {
        if let Some(tx) = self.lock().rpc.remove(id) {
            let _ = tx.send(match error {
                Some(code) => Err(code),
                None => Ok(result.unwrap_or(Value::Null)),
            });
        }
    }
}
