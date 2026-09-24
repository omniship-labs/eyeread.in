//! Connected apps: a local HTTP API that lets other programs on this computer
//! (companion tools, Stream Deck / foot-pedal controllers, writing apps, …)
//! drive eyeread.in without any third-party code running inside the app.
//! Lives under Settings → Packs → Connected apps; it shares its permission
//! names with packs (`spec/packs/FORMAT.md`).
//!
//! Design, in short (full contract: docs/PACKS.md):
//!   • Off by default. Nothing listens until the user enables it in Settings.
//!   • Loopback only (127.0.0.1), and requests from web browsers are refused
//!     outright (see `http::read_request`), so web pages can't reach it.
//!   • Every app pairs once: the user sees its name + requested scopes and
//!     approves or denies. Approval mints a bearer token that only the app
//!     holds (we persist a SHA-256 of it, never the token itself). The user
//!     can revoke any app from Settings at any time.
//!   • Every endpoint needs a scope. Work that touches app state is handed to
//!     the owning window over an event ("RPC") and executed by the same code
//!     paths as the UI (library persistence, `showOverlay`, transport
//!     controls), so an app can never bypass share protection, window
//!     placement or the mic permission flow.

mod http;

use super::broker::{Broker, CallError, Caller};
use http::{read_request, write_json, write_sse_head, Request};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::io::Write;
use std::net::{Ipv4Addr, SocketAddr, TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering};
use std::sync::mpsc::{self, RecvTimeoutError, Sender, SyncSender};
use std::sync::{Arc, Mutex, MutexGuard};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_store::StoreExt;

pub const API_VERSION: u32 = 1;
pub const PORT: u16 = 17842;
const STORE_FILE: &str = "packs.json";
// packs.json is shared with the packs runtime, so connected-apps keys are prefixed.
const STORE_KEY_ENABLED: &str = "appsEnabled";
const STORE_KEY_GRANTS: &str = "appGrants";

pub const SCOPE_SCRIPTS_WRITE: &str = "scripts:write";
pub const SCOPE_PROMPTER_LOAD: &str = "prompter:load";
pub const SCOPE_PROMPTER_CONTROL: &str = "prompter:control";
pub const SCOPE_PROMPTER_EVENTS: &str = "prompter:events";
pub const SCOPES: [&str; 4] = [
    SCOPE_SCRIPTS_WRITE,
    SCOPE_PROMPTER_LOAD,
    SCOPE_PROMPTER_CONTROL,
    SCOPE_PROMPTER_EVENTS,
];

const MAX_CONNECTIONS: usize = 32;
const MAX_EVENT_STREAMS: usize = 8;
const IO_TIMEOUT: Duration = Duration::from_secs(10);
const PAIRING_TIMEOUT: Duration = Duration::from_secs(120);
const KEEPALIVE_EVERY: Duration = Duration::from_secs(15);

const MAX_NAME_CHARS: usize = 64;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Grant {
    id: String,
    name: String,
    scopes: Vec<String>,
    /// Hex SHA-256 of the bearer token. The token itself is never stored.
    token_hash: String,
    created_at: u64,
}

struct ServerHandle {
    stop: Arc<AtomicBool>,
}

struct EventStream {
    id: u64,
    grant_id: String,
    tx: Sender<String>,
}

struct Inner {
    enabled: bool,
    server: Option<ServerHandle>,
    /// Last start failure (e.g. "port_in_use"), shown in Settings.
    error: Option<String>,
    grants: Vec<Grant>,
    /// At most one pairing prompt at a time: (request id, decision channel).
    pairing: Option<(String, SyncSender<bool>)>,
    streams: Vec<EventStream>,
}

pub struct ConnectedApps {
    app: AppHandle,
    /// Grants, action routing and prompter state are shared with packs.
    broker: Arc<Broker>,
    inner: Mutex<Inner>,
    connections: AtomicUsize,
    next_stream_id: AtomicU64,
}

/// A routed response: either a complete JSON reply, or "upgrade this
/// connection to a Server-Sent Events stream for this grant".
enum Reply {
    Json(u16, Value),
    Events(String),
}

fn fail(status: u16, code: &str) -> Reply {
    Reply::Json(status, json!({ "ok": false, "error": code }))
}

/// The broker's view of a paired app.
fn caller(grant: &Grant) -> Caller {
    Caller::App {
        id: grant.id.clone(),
        name: grant.name.clone(),
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn random_hex(bytes: usize) -> String {
    let mut buf = vec![0u8; bytes];
    getrandom::getrandom(&mut buf).expect("OS random source unavailable");
    buf.iter().map(|b| format!("{b:02x}")).collect()
}

fn token_hash(token: &str) -> String {
    Sha256::digest(token.as_bytes())
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect()
}

fn ct_eq(a: &[u8], b: &[u8]) -> bool {
    a.len() == b.len() && a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

// ---- request validation (pure; unit-tested below) ----------------------------

fn parse_json_object(req: &Request) -> Result<Value, Reply> {
    if !req.is_json() {
        return Err(fail(415, "json_required"));
    }
    match serde_json::from_slice::<Value>(&req.body) {
        Ok(v) if v.is_object() => Ok(v),
        _ => Err(fail(400, "invalid_json")),
    }
}

fn validate_pairing(body: &Value) -> Result<(String, Vec<String>), &'static str> {
    let name = body
        .get("name")
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or("");
    if name.is_empty()
        || name.chars().count() > MAX_NAME_CHARS
        || name.chars().any(char::is_control)
    {
        return Err("invalid_name");
    }
    let requested = body
        .get("scopes")
        .and_then(Value::as_array)
        .ok_or("invalid_scopes")?;
    let mut scopes: Vec<String> = Vec::new();
    for s in requested {
        let s = s.as_str().ok_or("invalid_scopes")?;
        if !SCOPES.contains(&s) {
            return Err("invalid_scopes");
        }
        if !scopes.iter().any(|x| x == s) {
            scopes.push(s.to_string());
        }
    }
    if scopes.is_empty() {
        return Err("invalid_scopes");
    }
    // Stable, canonical order so the approval prompt reads the same every time.
    scopes.sort_by_key(|s| SCOPES.iter().position(|x| x == s));
    Ok((name.to_string(), scopes))
}

/// The HTTP reply for a broker error. Codes are the API's documented ones.
fn call_error_reply(err: CallError) -> Reply {
    match err {
        CallError::Denied(scope) => Reply::Json(
            403,
            json!({ "ok": false, "error": "missing_scope", "scope": scope }),
        ),
        CallError::Invalid(code) => fail(422, code),
        CallError::Window(code) => fail(
            match code.as_str() {
                "no_active_session" => 409,
                "invalid_params" => 422,
                _ => 500,
            },
            &code,
        ),
        CallError::Busy => fail(409, "busy"),
        // Nothing answered: the window isn't loaded (or was closed).
        CallError::Timeout => fail(504, "app_not_responding"),
        CallError::Unavailable => fail(503, "app_unavailable"),
    }
}

// ---- state + lifecycle --------------------------------------------------------

impl ConnectedApps {
    fn lock(&self) -> MutexGuard<'_, Inner> {
        // A panic while holding the lock can't leave Inner logically broken
        // (every mutation is a single assignment/push/remove), so recover.
        self.inner.lock().unwrap_or_else(|e| e.into_inner())
    }

    fn persist(&self, inner: &Inner) {
        match self.app.store(STORE_FILE) {
            Ok(store) => {
                store.set(STORE_KEY_ENABLED, inner.enabled);
                store.set(
                    STORE_KEY_GRANTS,
                    serde_json::to_value(&inner.grants).unwrap_or(Value::Null),
                );
                if let Err(e) = store.save() {
                    eprintln!("[packs/apps] failed to save {STORE_FILE}: {e}");
                }
            }
            Err(e) => eprintln!("[packs/apps] failed to open {STORE_FILE}: {e}"),
        }
    }

    fn status(&self) -> Value {
        let inner = self.lock();
        let apps: Vec<Value> = inner
            .grants
            .iter()
            .map(|g| {
                json!({
                    "id": g.id,
                    "name": g.name,
                    "scopes": g.scopes,
                    "createdAt": g.created_at,
                })
            })
            .collect();
        json!({
            "enabled": inner.enabled,
            "running": inner.server.is_some(),
            "port": PORT,
            "apiVersion": API_VERSION,
            "error": inner.error,
            "apps": apps,
        })
    }

    fn emit_changed(&self) {
        let _ = self.app.emit_to("main", "packs:apps-changed", ());
    }

    fn start_server(self: &Arc<Self>, inner: &mut Inner) {
        if inner.server.is_some() {
            return;
        }
        match TcpListener::bind((Ipv4Addr::LOCALHOST, PORT)) {
            Ok(listener) => {
                let stop = Arc::new(AtomicBool::new(false));
                let apps = Arc::clone(self);
                let thread_stop = Arc::clone(&stop);
                let spawned = thread::Builder::new()
                    .name("eyeread-apps-accept".into())
                    .spawn(move || apps.accept_loop(listener, thread_stop));
                match spawned {
                    Ok(_) => {
                        inner.server = Some(ServerHandle { stop });
                        inner.error = None;
                    }
                    Err(e) => {
                        eprintln!("[packs/apps] failed to start: {e}");
                        inner.error = Some("start_failed".into());
                    }
                }
            }
            Err(e) => {
                eprintln!("[packs/apps] unable to bind 127.0.0.1:{PORT}: {e}");
                inner.error = Some(
                    if e.kind() == std::io::ErrorKind::AddrInUse {
                        "port_in_use"
                    } else {
                        "bind_failed"
                    }
                    .into(),
                );
            }
        }
    }

    fn stop_server(inner: &mut Inner) {
        if let Some(server) = inner.server.take() {
            server.stop.store(true, Ordering::SeqCst);
            // Unblock the accept() so the thread sees the flag and drops the
            // listener, freeing the port.
            let _ = TcpStream::connect_timeout(
                &SocketAddr::from((Ipv4Addr::LOCALHOST, PORT)),
                Duration::from_millis(250),
            );
        }
        // Dropping the senders wakes every waiting request: pending pairings
        // and RPCs fail fast, event streams end.
        inner.pairing = None;
        inner.streams.clear();
        inner.error = None;
    }

    fn accept_loop(self: Arc<Self>, listener: TcpListener, stop: Arc<AtomicBool>) {
        eprintln!("[packs/apps] listening on 127.0.0.1:{PORT}");
        for conn in listener.incoming() {
            if stop.load(Ordering::SeqCst) {
                break;
            }
            let Ok(stream) = conn else { continue };
            if self.connections.fetch_add(1, Ordering::SeqCst) >= MAX_CONNECTIONS {
                self.connections.fetch_sub(1, Ordering::SeqCst);
                continue; // dropping the stream closes it
            }
            let apps = Arc::clone(&self);
            let spawned = thread::Builder::new()
                .name("eyeread-apps-conn".into())
                .spawn(move || {
                    apps.handle_connection(stream);
                    apps.connections.fetch_sub(1, Ordering::SeqCst);
                });
            if spawned.is_err() {
                self.connections.fetch_sub(1, Ordering::SeqCst);
            }
        }
        eprintln!("[packs/apps] stopped");
    }

    fn handle_connection(&self, mut stream: TcpStream) {
        // Timeouts keep a slow or silent client from pinning a thread.
        let _ = stream.set_read_timeout(Some(IO_TIMEOUT));
        let _ = stream.set_write_timeout(Some(IO_TIMEOUT));
        let req = match read_request(&mut stream, PORT) {
            Ok(req) => req,
            Err(e) => {
                write_json(
                    &mut stream,
                    e.status(),
                    &json!({ "ok": false, "error": e.code() }),
                );
                return;
            }
        };
        match self.route(&req) {
            Reply::Json(status, body) => write_json(&mut stream, status, &body),
            Reply::Events(grant_id) => self.stream_events(&mut stream, grant_id),
        }
    }

    // ---- routing ------------------------------------------------------------

    fn route(&self, req: &Request) -> Reply {
        const KNOWN: [&str; 7] = [
            "/v1",
            "/v1/pair",
            "/v1/me",
            "/v1/scripts",
            "/v1/prompter/load",
            "/v1/prompter/control",
            "/v1/prompter/state",
        ];
        let result = match (req.method.as_str(), req.path.as_str()) {
            ("GET", "/v1") => Ok(Reply::Json(
                200,
                json!({
                    "ok": true,
                    "api": "eyeread.connected-apps",
                    "apiVersion": API_VERSION,
                    "appVersion": self.app.package_info().version.to_string(),
                    "scopes": SCOPES,
                }),
            )),
            ("POST", "/v1/pair") => self.pair(req),
            ("GET", "/v1/me") => self.authorize(req, None).map(|g| {
                Reply::Json(
                    200,
                    json!({ "ok": true, "id": g.id, "name": g.name, "scopes": g.scopes }),
                )
            }),
            ("POST", "/v1/scripts") => self.call(req, SCOPE_SCRIPTS_WRITE, "scripts.add"),
            ("POST", "/v1/prompter/load") => self.call(req, SCOPE_PROMPTER_LOAD, "prompter.load"),
            ("POST", "/v1/prompter/control") => {
                self.call(req, SCOPE_PROMPTER_CONTROL, "prompter.control")
            }
            ("GET", "/v1/prompter/state") => {
                self.authorize(req, Some(SCOPE_PROMPTER_EVENTS)).map(|_| {
                    let state = self.broker.prompter_state();
                    Reply::Json(200, json!({ "ok": true, "state": state }))
                })
            }
            ("GET", "/v1/prompter/events") => self
                .authorize(req, Some(SCOPE_PROMPTER_EVENTS))
                .map(|g| Reply::Events(g.id)),
            (_, path) if KNOWN.contains(&path) || path == "/v1/prompter/events" => {
                Ok(fail(405, "method_not_allowed"))
            }
            _ => Ok(fail(404, "not_found")),
        };
        result.unwrap_or_else(|reply| reply)
    }

    /// Resolve the bearer token to a grant and check it holds `scope`.
    fn authorize(&self, req: &Request, scope: Option<&str>) -> Result<Grant, Reply> {
        let token = req
            .bearer_token()
            .ok_or_else(|| fail(401, "unauthorized"))?;
        let hash = token_hash(token);
        let grant = self
            .lock()
            .grants
            .iter()
            .find(|g| ct_eq(g.token_hash.as_bytes(), hash.as_bytes()))
            .cloned()
            .ok_or_else(|| fail(401, "unauthorized"))?;
        if let Some(scope) = scope {
            if !self.broker.allowed(&caller(&grant), scope) {
                return Err(Reply::Json(
                    403,
                    json!({ "ok": false, "error": "missing_scope", "scope": scope }),
                ));
            }
        }
        Ok(grant)
    }

    /// Run an action through the broker, which checks the grant again,
    /// validates the body and routes it to the owning window.
    fn call(&self, req: &Request, scope: &str, method: &str) -> Result<Reply, Reply> {
        let grant = self.authorize(req, Some(scope))?;
        let body = parse_json_object(req)?;
        let result = self
            .broker
            .call(&caller(&grant), scope, method, &body)
            .map_err(call_error_reply)?;
        let mut out = json!({ "ok": true });
        if let (Some(out), Some(extra)) = (out.as_object_mut(), result.as_object()) {
            for (k, v) in extra {
                out.insert(k.clone(), v.clone());
            }
        }
        Ok(Reply::Json(200, out))
    }

    fn pair(&self, req: &Request) -> Result<Reply, Reply> {
        let body = parse_json_object(req)?;
        let (name, scopes) = validate_pairing(&body).map_err(|c| fail(422, c))?;

        let request_id = random_hex(8);
        let (tx, rx) = mpsc::sync_channel(1);
        {
            let mut inner = self.lock();
            if inner.pairing.is_some() {
                return Err(fail(409, "pairing_in_progress"));
            }
            inner.pairing = Some((request_id.clone(), tx));
        }

        let _ = self.app.emit_to(
            "main",
            "packs:apps-pair-request",
            json!({ "requestId": request_id, "name": name, "scopes": scopes }),
        );
        if let Some(win) = self.app.get_webview_window("main") {
            let _ = win.unminimize();
            let _ = win.show();
            let _ = win.set_focus();
        }

        let decision = rx.recv_timeout(PAIRING_TIMEOUT);
        {
            let mut inner = self.lock();
            if inner
                .pairing
                .as_ref()
                .is_some_and(|(id, _)| *id == request_id)
            {
                inner.pairing = None;
            }
        }

        match decision {
            Ok(true) => {
                let token = format!("era_{}", random_hex(32));
                let grant = Grant {
                    id: random_hex(8),
                    name,
                    scopes: scopes.clone(),
                    token_hash: token_hash(&token),
                    created_at: now_ms(),
                };
                let app_id = grant.id.clone();
                self.broker.set_app_scopes(&grant.id, grant.scopes.clone());
                {
                    let mut inner = self.lock();
                    inner.grants.push(grant);
                    self.persist(&inner);
                }
                self.emit_changed();
                Ok(Reply::Json(
                    201,
                    json!({
                        "ok": true,
                        "appId": app_id,
                        "token": token,
                        "scopes": scopes,
                    }),
                ))
            }
            Ok(false) => Ok(fail(403, "pairing_denied")),
            Err(e) => {
                let _ = self.app.emit_to(
                    "main",
                    "packs:apps-pair-cancelled",
                    json!({ "requestId": request_id }),
                );
                Ok(match e {
                    RecvTimeoutError::Timeout => fail(408, "pairing_timeout"),
                    RecvTimeoutError::Disconnected => fail(503, "api_disabled"),
                })
            }
        }
    }

    fn stream_events(&self, stream: &mut TcpStream, grant_id: String) {
        let id = self.next_stream_id.fetch_add(1, Ordering::SeqCst);
        let (tx, rx) = mpsc::channel::<String>();
        let snapshot = {
            let mut inner = self.lock();
            if inner.streams.len() >= MAX_EVENT_STREAMS {
                drop(inner);
                write_json(
                    stream,
                    429,
                    &json!({ "ok": false, "error": "too_many_streams" }),
                );
                return;
            }
            inner.streams.push(EventStream { id, grant_id, tx });
            self.broker.prompter_state().to_string()
        };

        let head_ok = write_sse_head(stream).is_ok();
        let mut send = |line: String| {
            stream
                .write_all(line.as_bytes())
                .and_then(|_| stream.flush())
        };
        let mut alive = head_ok && send(format!("event: state\ndata: {snapshot}\n\n")).is_ok();
        while alive {
            alive = match rx.recv_timeout(KEEPALIVE_EVERY) {
                Ok(state) => send(format!("event: state\ndata: {state}\n\n")).is_ok(),
                Err(RecvTimeoutError::Timeout) => send(": keepalive\n\n".into()).is_ok(),
                // Revoked, API disabled, or app shutting down.
                Err(RecvTimeoutError::Disconnected) => false,
            };
        }
        self.lock().streams.retain(|s| s.id != id);
    }
}

pub fn init(app: &AppHandle, broker: Arc<Broker>) {
    let (enabled, grants) = match app.store(STORE_FILE) {
        Ok(store) => (
            store
                .get(STORE_KEY_ENABLED)
                .and_then(|v| v.as_bool())
                .unwrap_or(false),
            store
                .get(STORE_KEY_GRANTS)
                .and_then(|v| serde_json::from_value::<Vec<Grant>>(v).ok())
                .unwrap_or_default(),
        ),
        Err(e) => {
            eprintln!("[packs/apps] failed to open {STORE_FILE}: {e}");
            (false, Vec::new())
        }
    };
    for g in &grants {
        broker.set_app_scopes(&g.id, g.scopes.clone());
    }
    let apps = Arc::new(ConnectedApps {
        app: app.clone(),
        broker: broker.clone(),
        inner: Mutex::new(Inner {
            enabled,
            server: None,
            error: None,
            grants,
            pairing: None,
            streams: Vec::new(),
        }),
        connections: AtomicUsize::new(0),
        next_stream_id: AtomicU64::new(0),
    });
    // Fan the overlay's reading state out to `prompter:events` streams.
    let weak = Arc::downgrade(&apps);
    broker.on_prompter_state(Box::new(move |state| {
        if let Some(apps) = weak.upgrade() {
            let line = state.to_string();
            apps.lock()
                .streams
                .retain(|s| s.tx.send(line.clone()).is_ok());
        }
    }));
    if enabled {
        let mut inner = apps.lock();
        apps.start_server(&mut inner);
    }
    app.manage(apps);
}

// ---- commands (called by the app's own windows) --------------------------------

type Apps<'a> = State<'a, Arc<ConnectedApps>>;

#[tauri::command]
pub fn packs_apps_status(apps: Apps<'_>) -> Value {
    apps.status()
}

#[tauri::command]
pub fn packs_apps_set_enabled(apps: Apps<'_>, enabled: bool) -> Value {
    {
        let mut inner = apps.lock();
        inner.enabled = enabled;
        if enabled {
            apps.start_server(&mut inner);
        } else {
            ConnectedApps::stop_server(&mut inner);
        }
        apps.persist(&inner);
    }
    apps.status()
}

#[tauri::command]
pub fn packs_apps_revoke(apps: Apps<'_>, id: String) -> Value {
    {
        let mut inner = apps.lock();
        inner.grants.retain(|g| g.id != id);
        apps.broker.remove_app(&id);
        // Ends that app's open event streams immediately.
        inner.streams.retain(|s| s.grant_id != id);
        apps.persist(&inner);
    }
    apps.emit_changed();
    apps.status()
}

#[tauri::command]
pub fn packs_apps_resolve_pairing(apps: Apps<'_>, request_id: String, approve: bool) {
    let mut inner = apps.lock();
    if inner
        .pairing
        .as_ref()
        .is_some_and(|(id, _)| *id == request_id)
    {
        if let Some((_, tx)) = inner.pairing.take() {
            let _ = tx.send(approve);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pairing_requires_name_and_known_scopes() {
        let ok = validate_pairing(&json!({
            "name": "  Stream Deck  ",
            "scopes": ["prompter:events", "prompter:control", "prompter:control"],
        }))
        .unwrap();
        assert_eq!(ok.0, "Stream Deck");
        // deduplicated and in canonical order
        assert_eq!(ok.1, vec!["prompter:control", "prompter:events"]);

        for bad in [
            json!({ "scopes": ["prompter:load"] }),
            json!({ "name": "", "scopes": ["prompter:load"] }),
            json!({ "name": "x".repeat(65), "scopes": ["prompter:load"] }),
            json!({ "name": "Bad\u{7}Bell", "scopes": ["prompter:load"] }),
        ] {
            assert_eq!(validate_pairing(&bad).unwrap_err(), "invalid_name");
        }
        for bad in [
            json!({ "name": "A" }),
            json!({ "name": "A", "scopes": [] }),
            json!({ "name": "A", "scopes": ["admin"] }),
            json!({ "name": "A", "scopes": [1] }),
        ] {
            assert_eq!(validate_pairing(&bad).unwrap_err(), "invalid_scopes");
        }
    }

    #[test]
    fn tokens_are_random_and_hashed() {
        let a = random_hex(32);
        assert_eq!(a.len(), 64);
        assert_ne!(a, random_hex(32));
        let h = token_hash("era_abc");
        assert_eq!(h.len(), 64);
        assert!(ct_eq(h.as_bytes(), token_hash("era_abc").as_bytes()));
        assert!(!ct_eq(h.as_bytes(), token_hash("era_abd").as_bytes()));
    }
}
