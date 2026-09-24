//! The pack host: runs enabled packs in sandboxes and routes their calls.
//!
//! **Isolation.** Each sandbox is its own hidden webview window: separate
//! top-level contexts can't reference each other, which sibling iframes in one
//! page always can. Every sandbox document is served with a CSP whose
//! `sandbox allow-scripts` directive gives it an opaque origin (no storage, no
//! BroadcastChannel, no pop-ups, forms or navigation), and whose only allowed
//! connections are the sandbox's own `init`, `rpc` and `events` URLs. The
//! windows are in no capability, and the app's commands are behind an ACL
//! (build.rs), so they have no Tauri access at all.
//!
//! **Per-permission split** (spec/packs/API.md, "Sandboxes"). Each allowed
//! permission that declares `network` gets its own sandbox with `net`; all
//! allowed offline permissions share one sandbox without it. A sandbox is
//! identified by an unguessable token in its URL; Rust checks every call
//! against that sandbox's permissions and the user's grants.
//!
//! **Lifecycle.** Sandboxes follow the installed packs, their on/off state and
//! grants (`reconcile`). A sandbox that fails to load, or stops polling for
//! events for 10 seconds, is restarted; 3 crashes in 5 minutes disable the
//! pack with the reason.

use super::broker::{Broker, CallError, Caller, Grant};
use super::commands::Packs;
use super::manifest::Manifest;
use super::net::{NetProxy, NetRequest};
use super::store::{InstalledPack, PackStatus};
use serde_json::{json, Value};
use std::collections::{BTreeMap, HashMap, VecDeque};
use std::path::PathBuf;
use std::sync::{Arc, Condvar, Mutex, MutexGuard};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::http::{Request, Response, StatusCode};
use tauri::{AppHandle, Emitter, Listener, Manager, UriSchemeContext, UriSchemeResponder};

pub const SCHEME: &str = "packhost";
const CSP_TEMPLATE: &str = include_str!("host/csp.txt");
const BOOTSTRAP_JS: &str = include_str!("host/bootstrap.js");
const INDEX_HTML: &str = include_str!("host/index.html");

// A live sandbox is always either waiting on a poll or starting the next
// one, so it checks in at least every POLL_WAIT; one that doesn't for
// HANG_AFTER is hung (a busy loop can't start a new poll).
const POLL_WAIT: Duration = Duration::from_secs(5);
const HANG_AFTER: Duration = Duration::from_secs(10);
const WATCHDOG_EVERY: Duration = Duration::from_secs(2);
const MAX_CRASHES: usize = 3;
const CRASH_WINDOW: Duration = Duration::from_secs(5 * 60);
const MAX_QUEUED_EVENTS: usize = 256;
const LOG_LIMIT: usize = 1000;
const MAX_RPC_BYTES: usize = 8 * 1024 * 1024;

// ---- planning (pure) -------------------------------------------------------------

/// One sandbox a pack should have: the permissions it activates, and the
/// network permission it serves `net` for (network sandboxes hold exactly one).
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct SandboxPlan {
    pub permissions: Vec<String>,
    pub network: Option<String>,
}

/// Split a pack into sandboxes by its manifest and the user's grants. Only
/// allowed permissions are included; a sandbox with none isn't started.
pub fn plan(manifest: &Manifest, grants: &BTreeMap<String, Grant>) -> Vec<SandboxPlan> {
    let allowed = |p: &str| grants.get(p).is_some_and(|g| g.allowed);
    let mut offline = Vec::new();
    let mut plans = Vec::new();
    for p in manifest.permission_names() {
        if !allowed(p) {
            continue;
        }
        if manifest.permissions[p].network.is_empty() {
            offline.push(p.to_string());
        } else {
            plans.push(SandboxPlan {
                permissions: vec![p.to_string()],
                network: Some(p.to_string()),
            });
        }
    }
    if !offline.is_empty() {
        plans.insert(
            0,
            SandboxPlan {
                permissions: offline,
                network: None,
            },
        );
    }
    plans
}

/// Every sandbox that should be running: enabled packs in good standing,
/// split by their grants.
pub fn desired(
    installed: &[InstalledPack],
    grants_for: impl Fn(&str) -> BTreeMap<String, Grant>,
) -> Vec<(InstalledPack, SandboxPlan)> {
    installed
        .iter()
        .filter(|p| p.enabled && p.status == PackStatus::Ok && p.manifest.main.is_some())
        .flat_map(|p| {
            plan(&p.manifest, &grants_for(&p.id))
                .into_iter()
                .map(move |pl| (p.clone(), pl))
        })
        .collect()
}

/// A running sandbox, as `changes` sees it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RunningKey {
    pub token: String,
    pub label: String,
    pub pack: String,
    pub version: String,
    pub plan: SandboxPlan,
}

/// What to stop and what to start so the running sandboxes match `wanted`.
/// A sandbox is kept only if its pack, version and plan are all unchanged:
/// switching a pack off, revoking a grant or updating the pack restarts it.
pub fn changes<'a>(
    running: &[RunningKey],
    wanted: &'a [(InstalledPack, SandboxPlan)],
) -> (Vec<RunningKey>, Vec<(&'a InstalledPack, &'a SandboxPlan)>) {
    let same = |r: &RunningKey, (p, pl): &(InstalledPack, SandboxPlan)| {
        r.pack == p.id && r.version == p.version && r.plan == *pl
    };
    let stop = running
        .iter()
        .filter(|r| !wanted.iter().any(|w| same(r, w)))
        .cloned()
        .collect();
    let start = wanted
        .iter()
        .filter(|w| !running.iter().any(|r| same(r, w)))
        .map(|(p, pl)| (p, pl))
        .collect();
    (stop, start)
}

/// The CSP for everything served under one sandbox's base URL.
pub fn csp(base: &str) -> String {
    CSP_TEMPLATE.trim().replace("{base}", base)
}

fn random_token() -> String {
    let mut buf = [0u8; 16];
    getrandom::getrandom(&mut buf).expect("OS random source unavailable");
    buf.iter().map(|b| format!("{b:02x}")).collect()
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// Where sandbox `token`'s pages live. Windows and Android serve custom
/// protocols as `http://<scheme>.localhost`.
pub fn sandbox_url(token: &str) -> String {
    if cfg!(any(windows, target_os = "android")) {
        format!("http://{SCHEME}.localhost/{token}/index.html")
    } else {
        format!("{SCHEME}://localhost/{token}/index.html")
    }
}

fn content_type(path: &str) -> &'static str {
    match path
        .rsplit('.')
        .next()
        .map(str::to_ascii_lowercase)
        .as_deref()
    {
        Some("js") | Some("mjs") => "text/javascript; charset=utf-8",
        Some("json") => "application/json",
        Some("css") => "text/css",
        Some("svg") => "image/svg+xml",
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("md") | Some("txt") => "text/plain; charset=utf-8",
        _ => "application/octet-stream",
    }
}

// ---- state -----------------------------------------------------------------------

/// A running sandbox.
struct Sandbox {
    token: String,
    label: String,
    pack: String,
    version: String,
    name: String,
    main: String,
    dir: PathBuf,
    plan: SandboxPlan,
    events: VecDeque<Value>,
    subscribed: bool,
    last_seen: Instant,
}

/// One line of a pack's log (console, errors, denials), for Developer mode.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogLine {
    pub time: u64,
    pub level: String,
    pub sandbox: String,
    pub message: String,
}

#[derive(Default)]
struct Inner {
    sandboxes: HashMap<String, Sandbox>,
    crashes: HashMap<String, Vec<Instant>>,
    logs: HashMap<String, VecDeque<LogLine>>,
    next_label: u64,
}

pub struct Host {
    app: AppHandle,
    packs: Arc<Packs>,
    broker: Arc<Broker>,
    net: Arc<NetProxy>,
    inner: Mutex<Inner>,
    changed: Condvar,
}

enum Reply {
    Now(Response<Vec<u8>>),
    /// Answer later, from another thread (long poll or blocking call).
    Later,
}

fn response(status: StatusCode, content_type: &str, body: Vec<u8>) -> Response<Vec<u8>> {
    Response::builder()
        .status(status)
        .header("Content-Type", content_type)
        .header("Cache-Control", "no-store")
        // Sandbox documents have an opaque origin, so their own requests are
        // cross-origin; everything under a token belongs to that sandbox.
        .header("Access-Control-Allow-Origin", "*")
        .header("X-Content-Type-Options", "nosniff")
        .body(body)
        .expect("valid response")
}

fn json_response(value: &Value) -> Response<Vec<u8>> {
    response(
        StatusCode::OK,
        "application/json",
        value.to_string().into_bytes(),
    )
}

fn not_found() -> Response<Vec<u8>> {
    response(StatusCode::NOT_FOUND, "text/plain", b"not found".to_vec())
}

fn call_error(code: &str, message: &str) -> Value {
    json!({ "v": 1, "type": "result", "ok": false, "error": { "code": code, "message": message } })
}

impl Host {
    pub fn new(
        app: AppHandle,
        packs: Arc<Packs>,
        broker: Arc<Broker>,
        net: Arc<NetProxy>,
    ) -> Arc<Self> {
        let host = Arc::new(Host {
            app,
            packs,
            broker,
            net,
            inner: Mutex::new(Inner::default()),
            changed: Condvar::new(),
        });
        host.watch();
        host
    }

    fn lock(&self) -> MutexGuard<'_, Inner> {
        self.inner.lock().unwrap_or_else(|e| e.into_inner())
    }

    // ---- lifecycle ----

    /// Start and stop sandboxes so they match the installed packs, their
    /// on/off state and the user's grants. Safe to call any time.
    pub fn reconcile(self: &Arc<Self>) {
        let installed = self.packs.installed();
        let wanted = desired(&installed, |id| self.broker.grants_for(id));
        let running: Vec<RunningKey> = self
            .lock()
            .sandboxes
            .values()
            .map(|s| RunningKey {
                token: s.token.clone(),
                label: s.label.clone(),
                pack: s.pack.clone(),
                version: s.version.clone(),
                plan: s.plan.clone(),
            })
            .collect();
        let (stop, start) = changes(&running, &wanted);
        for r in stop {
            self.stop(&r.token, &r.label);
        }
        // Start what's missing, after re-checking the pack's files.
        let mut verified: HashMap<String, bool> = HashMap::new();
        for (pack, plan) in start {
            let ok = *verified
                .entry(pack.id.clone())
                .or_insert_with(|| self.packs.verify(&pack.id).is_ok());
            if !ok {
                let _ = self.app.emit("packs:changed", ());
                continue;
            }
            self.start(pack, plan.clone());
        }
    }

    fn start(self: &Arc<Self>, pack: &InstalledPack, plan: SandboxPlan) {
        let token = random_token();
        let label = {
            let mut inner = self.lock();
            inner.next_label += 1;
            format!("packhost-{}", inner.next_label)
        };
        let sandbox = Sandbox {
            token: token.clone(),
            label: label.clone(),
            pack: pack.id.clone(),
            version: pack.version.clone(),
            name: pack.manifest.name.clone(),
            main: pack.manifest.main.clone().unwrap_or_default(),
            dir: self.packs.pack_dir(&pack.id, &pack.version),
            plan,
            events: VecDeque::new(),
            subscribed: false,
            last_seen: Instant::now(),
        };
        self.lock().sandboxes.insert(token.clone(), sandbox);

        let url = sandbox_url(&token);
        let prefix = url.trim_end_matches("index.html").to_string();
        let Ok(parsed) = url.parse() else { return };
        let built = tauri::WebviewWindowBuilder::new(
            &self.app,
            &label,
            tauri::WebviewUrl::CustomProtocol(parsed),
        )
        .title("eyeread.in pack")
        .visible(false)
        .focused(false)
        .skip_taskbar(true)
        .inner_size(1.0, 1.0)
        .incognito(true)
        .background_throttling(tauri::utils::config::BackgroundThrottlingPolicy::Disabled)
        .disable_drag_drop_handler()
        // Stay on this sandbox's own pages; no new windows or downloads.
        .on_navigation(move |u| u.as_str().starts_with(&prefix))
        .on_new_window(|_, _| tauri::webview::NewWindowResponse::Deny)
        .on_download(|_, _| false)
        .build();
        if let Err(e) = built {
            eprintln!("[packs/host] couldn't start a sandbox for {}: {e}", pack.id);
            self.lock().sandboxes.remove(&token);
        }
    }

    fn stop(&self, token: &str, label: &str) {
        self.lock().sandboxes.remove(token);
        self.changed.notify_all();
        if let Some(window) = self.app.get_webview_window(label) {
            let _ = window.destroy();
        }
    }

    /// A sandbox crashed or hung: stop it, and disable its pack after too many.
    fn crashed(self: &Arc<Self>, token: &str, reason: &str) {
        let Some((pack, label)) = self
            .lock()
            .sandboxes
            .get(token)
            .map(|s| (s.pack.clone(), s.label.clone()))
        else {
            return;
        };
        self.log(&pack, "error", token, &format!("Sandbox stopped: {reason}"));
        self.stop(token, &label);
        let give_up = {
            let mut inner = self.lock();
            let times = inner.crashes.entry(pack.clone()).or_default();
            let now = Instant::now();
            times.retain(|t| now.duration_since(*t) < CRASH_WINDOW);
            times.push(now);
            times.len() >= MAX_CRASHES
        };
        if give_up {
            self.lock().crashes.remove(&pack);
            self.packs.mark_crashed(&pack, reason);
            let _ = self.app.emit("packs:changed", ());
        }
        let host = Arc::clone(self);
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_secs(1));
            host.reconcile();
        });
    }

    /// Watchdog: a sandbox that stops polling for events is hung.
    fn watch(self: &Arc<Self>) {
        let weak = Arc::downgrade(self);
        let _ = std::thread::Builder::new()
            .name("eyeread-packs-watchdog".into())
            .spawn(move || loop {
                std::thread::sleep(WATCHDOG_EVERY);
                let Some(host) = weak.upgrade() else { return };
                let hung: Vec<String> = host
                    .lock()
                    .sandboxes
                    .values()
                    .filter(|s| s.last_seen.elapsed() > HANG_AFTER)
                    .map(|s| s.token.clone())
                    .collect();
                for token in hung {
                    host.crashed(&token, "stopped responding for 10 seconds");
                }
            });
    }

    // ---- events for sandboxes ----

    fn push_event(&self, filter: impl Fn(&Sandbox) -> bool, name: &str, data: &Value) {
        let mut inner = self.lock();
        for s in inner.sandboxes.values_mut().filter(|s| filter(s)) {
            s.events
                .push_back(json!({ "v": 1, "type": "event", "name": name, "data": data }));
            while s.events.len() > MAX_QUEUED_EVENTS {
                s.events.pop_front();
            }
        }
        drop(inner);
        self.changed.notify_all();
    }

    /// Hook the host up to the app: pack and grant changes, settings, and
    /// the prompter's state.
    pub fn listen(self: &Arc<Self>) {
        for event in ["packs:changed", "packs:grants-changed"] {
            let host = Arc::clone(self);
            self.app.listen_any(event, move |_| {
                let host = Arc::clone(&host);
                std::thread::spawn(move || host.reconcile());
            });
        }
        let host = Arc::clone(self);
        self.app.listen_any("packs:settings-changed", move |e| {
            if let Ok(p) = serde_json::from_str::<Value>(e.payload()) {
                let id = p["id"].as_str().unwrap_or_default().to_string();
                host.push_event(|s| s.pack == id, "settings.changed", &p["values"]);
            }
        });
        let weak = Arc::downgrade(self);
        self.broker.on_prompter_state(Box::new(move |state| {
            if let Some(host) = weak.upgrade() {
                host.push_event(
                    |s| s.subscribed && s.plan.permissions.iter().any(|p| p == "prompter:events"),
                    "prompter.state",
                    state,
                );
            }
        }));
    }

    // ---- logs ----

    fn log(&self, pack: &str, level: &str, token: &str, message: &str) {
        let sandbox = self
            .lock()
            .sandboxes
            .get(token)
            .map(|s| s.plan.permissions.join(", "))
            .unwrap_or_default();
        if cfg!(debug_assertions) {
            eprintln!("[pack {pack}] {level}: {message}");
        }
        let mut inner = self.lock();
        let log = inner.logs.entry(pack.to_string()).or_default();
        log.push_back(LogLine {
            time: now_ms(),
            level: level.into(),
            sandbox,
            message: message.chars().take(8192).collect(),
        });
        while log.len() > LOG_LIMIT {
            log.pop_front();
        }
    }

    pub fn logs(&self, pack: &str) -> Vec<LogLine> {
        self.lock()
            .logs
            .get(pack)
            .map(|l| l.iter().cloned().collect())
            .unwrap_or_default()
    }

    // ---- the protocol ----

    /// Serve one request for `packhost:`. Paths are `/<token>/<resource>`.
    fn handle(self: &Arc<Self>, request: Request<Vec<u8>>, responder: UriSchemeResponder) {
        if let (Reply::Now(response), Some(responder)) = self.route(&request, responder) {
            responder.respond(response);
        }
    }

    fn route(
        self: &Arc<Self>,
        request: &Request<Vec<u8>>,
        responder: UriSchemeResponder,
    ) -> (Reply, Option<UriSchemeResponder>) {
        let uri = request.uri();
        let path = uri.path().trim_start_matches('/');
        let (token, rest) = path.split_once('/').unwrap_or((path, ""));
        let known = {
            let mut inner = self.lock();
            match inner.sandboxes.get_mut(token) {
                Some(s) => {
                    s.last_seen = Instant::now();
                    true
                }
                None => false,
            }
        };
        if !known {
            return (Reply::Now(not_found()), Some(responder));
        }
        let origin = match (uri.scheme_str(), uri.authority()) {
            (Some(scheme), Some(authority)) => format!("{scheme}://{authority}"),
            _ => format!("{SCHEME}://localhost"),
        };
        let base = format!("{origin}/{token}");
        let with_csp = |mut r: Response<Vec<u8>>| {
            if let Ok(v) = csp(&base).parse() {
                r.headers_mut().insert("Content-Security-Policy", v);
            }
            r
        };

        match (request.method().as_str(), rest) {
            ("GET", "index.html") => (
                Reply::Now(with_csp(response(
                    StatusCode::OK,
                    "text/html; charset=utf-8",
                    INDEX_HTML.into(),
                ))),
                Some(responder),
            ),
            ("GET", "__eyeread.js") => (
                Reply::Now(with_csp(response(
                    StatusCode::OK,
                    "text/javascript; charset=utf-8",
                    BOOTSTRAP_JS.into(),
                ))),
                Some(responder),
            ),
            ("GET", "init") => (
                Reply::Now(json_response(&self.init_message(token))),
                Some(responder),
            ),
            ("GET", "events") => {
                self.long_poll(token.to_string(), responder);
                (Reply::Later, None)
            }
            ("POST", "rpc") => {
                if request.body().len() > MAX_RPC_BYTES {
                    return (
                        Reply::Now(json_response(&call_error(
                            "E_TOO_LARGE",
                            "The message is too large.",
                        ))),
                        Some(responder),
                    );
                }
                let message: Value = serde_json::from_slice(request.body()).unwrap_or(Value::Null);
                let host = Arc::clone(self);
                let token = token.to_string();
                // Calls can block (a window answering, the user picking a
                // file, the network), so answer from a worker thread.
                std::thread::spawn(move || {
                    let reply = host.rpc(&token, &message);
                    responder.respond(json_response(&reply));
                });
                (Reply::Later, None)
            }
            ("GET", file) if file.starts_with("pack/") => (
                Reply::Now(with_csp(self.pack_file(token, &file["pack/".len()..]))),
                Some(responder),
            ),
            _ => (Reply::Now(not_found()), Some(responder)),
        }
    }

    /// A file of this sandbox's own pack, and nothing else.
    fn pack_file(&self, token: &str, rel: &str) -> Response<Vec<u8>> {
        let rel = percent_decode(rel);
        if !super::archive::path_is_safe(&rel) || !super::archive::file_type_allowed(&rel) {
            return not_found();
        }
        let Some(dir) = self.lock().sandboxes.get(token).map(|s| s.dir.clone()) else {
            return not_found();
        };
        let mut path = dir;
        path.extend(rel.split('/'));
        // Never follow a link, even though installs contain none.
        match std::fs::symlink_metadata(&path) {
            Ok(m) if m.file_type().is_file() => {}
            _ => return not_found(),
        }
        match std::fs::read(&path) {
            Ok(bytes) => response(StatusCode::OK, content_type(&rel), bytes),
            Err(_) => not_found(),
        }
    }

    fn init_message(&self, token: &str) -> Value {
        let inner = self.lock();
        let Some(s) = inner.sandboxes.get(token) else {
            return Value::Null;
        };
        let (pack, version, name, main) = (
            s.pack.clone(),
            s.version.clone(),
            s.name.clone(),
            s.main.clone(),
        );
        let (permissions, network) = (s.plan.permissions.clone(), s.plan.network.is_some());
        drop(inner);
        json!({
            "v": 1,
            "type": "init",
            "apiVersion": 1,
            "pack": { "id": pack, "version": version, "name": name },
            "sandbox": { "id": token, "permissions": permissions, "network": network },
            "settings": self.packs.effective_settings(&pack).unwrap_or_default(),
            "main": main,
        })
    }

    fn long_poll(self: &Arc<Self>, token: String, responder: UriSchemeResponder) {
        let host = Arc::clone(self);
        std::thread::spawn(move || {
            let deadline = Instant::now() + POLL_WAIT;
            let mut inner = host.lock();
            loop {
                match inner.sandboxes.get_mut(&token) {
                    None => break,
                    Some(s) if !s.events.is_empty() => {
                        let events: Vec<Value> = s.events.drain(..).collect();
                        s.last_seen = Instant::now();
                        drop(inner);
                        responder.respond(json_response(&Value::Array(events)));
                        return;
                    }
                    Some(s) => s.last_seen = Instant::now(),
                }
                let left = deadline.saturating_duration_since(Instant::now());
                if left.is_zero() {
                    break;
                }
                inner = host
                    .changed
                    .wait_timeout(inner, left)
                    .unwrap_or_else(|e| e.into_inner())
                    .0;
            }
            if let Some(s) = inner.sandboxes.get_mut(&token) {
                s.last_seen = Instant::now();
            }
            drop(inner);
            responder.respond(json_response(&json!([])));
        });
    }

    /// Handle one message from a sandbox. Every call is checked here: the
    /// permission must belong to this sandbox, and the broker checks the grant.
    fn rpc(self: &Arc<Self>, token: &str, message: &Value) -> Value {
        let Some((pack, name, plan)) = self
            .lock()
            .sandboxes
            .get(token)
            .map(|s| (s.pack.clone(), s.name.clone(), s.plan.clone()))
        else {
            return call_error("E_PERMISSION", "This sandbox isn't running.");
        };
        let id = message["id"].clone();
        let result = |value: Result<Value, (&str, String)>| match value {
            Ok(v) => json!({ "v": 1, "type": "result", "id": id, "ok": true, "value": v }),
            Err((code, msg)) => {
                json!({ "v": 1, "type": "result", "id": id, "ok": false, "error": { "code": code, "message": msg } })
            }
        };
        match message["type"].as_str() {
            Some("ready") => {
                let handlers: Vec<&str> = message["handlers"]
                    .as_array()
                    .map(|h| h.iter().filter_map(Value::as_str).collect())
                    .unwrap_or_default();
                let activate: Vec<&String> = plan
                    .permissions
                    .iter()
                    .filter(|p| handlers.contains(&p.as_str()))
                    .collect();
                json!({ "activate": activate })
            }
            Some("log") => {
                let level = message["level"].as_str().unwrap_or("info");
                let level = if ["debug", "info", "warn", "error"].contains(&level) {
                    level
                } else {
                    "info"
                };
                let text: Vec<&str> = message["args"]
                    .as_array()
                    .map(|a| a.iter().take(32).filter_map(Value::as_str).collect())
                    .unwrap_or_default();
                self.log(&pack, level, token, &text.join(" "));
                json!({ "ok": true })
            }
            Some("error") => {
                let text = message["message"].as_str().unwrap_or("Unknown error");
                self.log(&pack, "error", token, text);
                if message["fatal"].as_bool() == Some(true) {
                    self.crashed(token, text);
                }
                json!({ "ok": true })
            }
            Some("call") => {
                let permission = message["permission"].as_str();
                let method = message["method"].as_str().unwrap_or_default();
                let params = &message["params"];
                let reply = self.call(&pack, &name, &plan, token, permission, method, params);
                if let Err((code, msg)) = &reply {
                    if *code == "E_PERMISSION" || *code == "E_NETWORK_DENIED" {
                        self.log(&pack, "warn", token, &format!("{method}: {msg}"));
                    }
                }
                result(reply)
            }
            _ => call_error("E_UNSUPPORTED", "Unknown message."),
        }
    }

    #[allow(clippy::too_many_arguments)]
    fn call(
        &self,
        pack: &str,
        name: &str,
        plan: &SandboxPlan,
        token: &str,
        permission: Option<&str>,
        method: &str,
        params: &Value,
    ) -> Result<Value, (&'static str, String)> {
        let denied = |p: &str| {
            (
                "E_PERMISSION",
                format!("This sandbox doesn't have the {p} permission."),
            )
        };
        match method {
            "settings.get" => Ok(Value::Object(
                self.packs.effective_settings(pack).unwrap_or_default(),
            )),
            "net.fetch" => {
                let Some(net_permission) =
                    plan.network.as_deref().filter(|n| permission == Some(*n))
                else {
                    return Err(denied(permission.unwrap_or("net")));
                };
                let req = net_request(params).map_err(|m| ("E_INVALID_ARGUMENT", m))?;
                let out = tauri::async_runtime::block_on(self.net.fetch(pack, net_permission, req))
                    .map_err(|e| (runtime_code(&e.code), e.message))?;
                use base64_engine as b64;
                Ok(json!({
                    "status": out.status,
                    "url": out.url,
                    "headers": out.headers,
                    "body": b64::encode(&out.body),
                }))
            }
            "prompter.subscribe" | "prompter.unsubscribe" => {
                let p = "prompter:events";
                if permission != Some(p)
                    || !plan.permissions.iter().any(|x| x == p)
                    || !self.broker.grant(pack, p).allowed
                {
                    return Err(denied(p));
                }
                if let Some(s) = self.lock().sandboxes.get_mut(token) {
                    s.subscribed = method == "prompter.subscribe";
                }
                Ok(Value::Null)
            }
            _ => {
                let Some(p) = permission.filter(|p| plan.permissions.iter().any(|x| x == p)) else {
                    return Err(denied(permission.unwrap_or(method)));
                };
                let caller = Caller::Pack {
                    id: pack.into(),
                    name: name.into(),
                };
                self.broker.call(&caller, p, method, params).map_err(|e| {
                    let code = e.runtime_code();
                    let message = match &e {
                        CallError::Denied(p) => format!("The {p} permission is off."),
                        CallError::Invalid(field) => field.to_string(),
                        CallError::Window(c) => c.clone(),
                        CallError::Busy => "A file picker from this pack is already open.".into(),
                        CallError::Timeout | CallError::Unavailable => {
                            "eyeread.in didn't answer.".into()
                        }
                    };
                    (code, message)
                })
            }
        }
    }
}

/// Match a runtime code from the spec to a `&'static str`.
fn runtime_code(code: &str) -> &'static str {
    const CODES: [&str; 11] = [
        "E_PERMISSION",
        "E_NETWORK_DENIED",
        "E_NETWORK",
        "E_TIMEOUT",
        "E_TOO_LARGE",
        "E_RATE_LIMITED",
        "E_INVALID_ARGUMENT",
        "E_NO_SESSION",
        "E_BUSY",
        "E_UNSUPPORTED",
        "E_INTERNAL",
    ];
    CODES
        .iter()
        .find(|c| **c == code)
        .copied()
        .unwrap_or("E_INTERNAL")
}

fn net_request(params: &Value) -> Result<NetRequest, String> {
    let url = params["url"].as_str().ok_or("url is required")?.to_string();
    let mut headers = BTreeMap::new();
    if let Some(map) = params["headers"].as_object() {
        for (k, v) in map {
            headers.insert(
                k.clone(),
                v.as_str()
                    .ok_or("header values must be strings")?
                    .to_string(),
            );
        }
    }
    let body = match params["body"].as_str() {
        Some(b) => Some(base64_engine::decode(b).map_err(|_| "body isn't valid base64")?),
        None => None,
    };
    Ok(NetRequest {
        url,
        method: params["method"].as_str().map(String::from),
        headers,
        body,
        timeout_ms: params["timeoutMs"].as_u64(),
    })
}

fn percent_decode(s: &str) -> String {
    let hex = |b: u8| (b as char).to_digit(16);
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Some(h), Some(l)) = (hex(bytes[i + 1]), hex(bytes[i + 2])) {
                out.push((h * 16 + l) as u8);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

/// Minimal standard base64, for binary bodies over the JSON protocol.
mod base64_engine {
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    pub fn encode(bytes: &[u8]) -> String {
        let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
        for chunk in bytes.chunks(3) {
            let n = (chunk[0] as u32) << 16
                | (*chunk.get(1).unwrap_or(&0) as u32) << 8
                | *chunk.get(2).unwrap_or(&0) as u32;
            for i in 0..4 {
                if i <= chunk.len() {
                    out.push(ALPHABET[(n >> (18 - 6 * i) & 63) as usize] as char);
                } else {
                    out.push('=');
                }
            }
        }
        out
    }

    pub fn decode(text: &str) -> Result<Vec<u8>, ()> {
        let text = text.trim_end_matches('=');
        let mut out = Vec::with_capacity(text.len() * 3 / 4);
        let (mut acc, mut bits) = (0u32, 0u32);
        for c in text.bytes() {
            let v = ALPHABET.iter().position(|a| *a == c).ok_or(())? as u32;
            acc = acc << 6 | v;
            bits += 6;
            if bits >= 8 {
                bits -= 8;
                out.push((acc >> bits & 0xff) as u8);
            }
        }
        Ok(out)
    }
}

/// `packhost:` protocol entry point (registered in lib.rs).
pub fn protocol<R: tauri::Runtime>(
    ctx: UriSchemeContext<'_, R>,
    request: Request<Vec<u8>>,
    responder: UriSchemeResponder,
) {
    match ctx.app_handle().try_state::<Arc<Host>>() {
        Some(host) => host.handle(request, responder),
        None => responder.respond(not_found()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn manifest(perms: serde_json::Value) -> Manifest {
        serde_json::from_value(json!({
            "apiVersion": 1, "id": "com.example.p", "name": "P", "version": "1.0.0",
            "author": { "name": "A" }, "license": "AGPL-3.0-only", "main": "main.js",
            "permissions": perms,
        }))
        .unwrap()
    }

    fn grants(on: &[&str]) -> BTreeMap<String, Grant> {
        on.iter()
            .map(|p| {
                (
                    p.to_string(),
                    Grant {
                        allowed: true,
                        internet: false,
                    },
                )
            })
            .collect()
    }

    #[test]
    fn each_network_permission_gets_its_own_sandbox() {
        let m = manifest(json!({
            "scripts:write": { "network": ["https://api.notion.com"] },
            "files:import": { "network": ["https://files.example.com"] },
            "prompter:control": {},
            "prompter:events": {},
        }));
        let all = grants(&[
            "scripts:write",
            "files:import",
            "prompter:control",
            "prompter:events",
        ]);
        assert_eq!(
            plan(&m, &all),
            vec![
                SandboxPlan {
                    permissions: vec!["prompter:control".into(), "prompter:events".into()],
                    network: None
                },
                SandboxPlan {
                    permissions: vec!["scripts:write".into()],
                    network: Some("scripts:write".into())
                },
                SandboxPlan {
                    permissions: vec!["files:import".into()],
                    network: Some("files:import".into())
                },
            ]
        );
    }

    #[test]
    fn only_allowed_permissions_run() {
        let m = manifest(json!({
            "scripts:write": { "network": ["https://api.notion.com"] },
            "prompter:control": {},
        }));
        assert!(
            plan(&m, &BTreeMap::new()).is_empty(),
            "everything starts off"
        );
        assert_eq!(
            plan(&m, &grants(&["prompter:control"])),
            vec![SandboxPlan {
                permissions: vec!["prompter:control".into()],
                network: None
            }]
        );
    }

    fn installed(enabled: bool, version: &str) -> InstalledPack {
        InstalledPack {
            id: "com.example.p".into(),
            version: version.into(),
            pack_hash: String::new(),
            manifest: manifest(json!({
                "scripts:write": { "network": ["https://api.notion.com"] },
                "prompter:control": {},
            })),
            files: BTreeMap::new(),
            enabled,
            top_level: true,
            used_by: Default::default(),
            status: PackStatus::Ok,
            verified: false,
            status_reason: None,
            installed_at: 0,
        }
    }

    fn running(wanted: &[(InstalledPack, SandboxPlan)]) -> Vec<RunningKey> {
        wanted
            .iter()
            .enumerate()
            .map(|(i, (p, pl))| RunningKey {
                token: format!("t{i}"),
                label: format!("packhost-{i}"),
                pack: p.id.clone(),
                version: p.version.clone(),
                plan: pl.clone(),
            })
            .collect()
    }

    #[test]
    fn toggling_a_pack_off_and_on_unloads_and_reloads_it() {
        let all = || grants(&["scripts:write", "prompter:control"]);
        let on = desired(&[installed(true, "1.0.0")], |_| all());
        assert_eq!(on.len(), 2, "one offline and one network sandbox");
        let now = running(&on);
        // Nothing changes while nothing changes.
        let (stop, start) = changes(&now, &on);
        assert!(stop.is_empty() && start.is_empty());
        // Off: every sandbox of the pack stops.
        let off = desired(&[installed(false, "1.0.0")], |_| all());
        let (stop, start) = changes(&now, &off);
        assert_eq!(stop.len(), 2);
        assert!(start.is_empty());
        // Back on: both start again.
        let (stop, start) = changes(&[], &on);
        assert!(stop.is_empty());
        assert_eq!(start.len(), 2);
    }

    #[test]
    fn revoking_a_grant_stops_only_the_affected_sandbox() {
        let on = desired(&[installed(true, "1.0.0")], |_| {
            grants(&["scripts:write", "prompter:control"])
        });
        let now = running(&on);
        let revoked = desired(&[installed(true, "1.0.0")], |_| {
            grants(&["prompter:control"])
        });
        let (stop, start) = changes(&now, &revoked);
        assert_eq!(stop.len(), 1);
        assert_eq!(stop[0].plan.network.as_deref(), Some("scripts:write"));
        assert!(start.is_empty());
    }

    #[test]
    fn crashed_or_updated_packs_restart() {
        let all = || grants(&["prompter:control"]);
        let v1 = desired(&[installed(true, "1.0.0")], |_| all());
        let now = running(&v1);
        let v2 = desired(&[installed(true, "2.0.0")], |_| all());
        let (stop, start) = changes(&now, &v2);
        assert_eq!((stop.len(), start.len()), (1, 1));
        let mut crashed = installed(true, "1.0.0");
        crashed.status = PackStatus::Crashed;
        assert!(desired(&[crashed], |_| all()).is_empty());
    }

    #[test]
    fn csp_confines_a_sandbox_to_its_own_urls() {
        let policy = csp("packhost://localhost/abc");
        for part in [
            "default-src 'none'",
            "script-src packhost://localhost/abc/",
            "connect-src packhost://localhost/abc/rpc packhost://localhost/abc/events packhost://localhost/abc/init",
            "sandbox allow-scripts",
            "img-src 'none'",
            "frame-src 'none'",
            "form-action 'none'",
        ] {
            assert!(policy.contains(part), "{part} missing from {policy}");
        }
        assert!(!policy.contains("allow-same-origin") && !policy.contains("allow-popups"));
    }

    #[test]
    fn base64_round_trip() {
        for data in [
            &b""[..],
            b"h",
            b"he",
            b"hel",
            b"hello world",
            &[0u8, 255, 128, 7],
        ] {
            let text = base64_engine::encode(data);
            assert_eq!(base64_engine::decode(&text).unwrap(), data, "{text}");
        }
        assert_eq!(base64_engine::encode(b"hello"), "aGVsbG8=");
        assert!(base64_engine::decode("a$b").is_err());
    }

    #[test]
    fn percent_decoding() {
        assert_eq!(percent_decode("lib/a%20b.js"), "lib/a b.js");
        assert_eq!(percent_decode("..%2Fetc"), "../etc");
        assert_eq!(percent_decode("%zz"), "%zz");
    }

    #[test]
    fn net_request_from_params() {
        let r = net_request(&json!({
            "url": "https://api.notion.com/v1", "method": "POST",
            "headers": { "Authorization": "Bearer t" }, "body": "aGk=", "timeoutMs": 500,
        }))
        .unwrap();
        assert_eq!(r.body.as_deref(), Some(&b"hi"[..]));
        assert_eq!(r.headers["Authorization"], "Bearer t");
        assert!(net_request(&json!({ "url": "x", "headers": { "a": 1 } })).is_err());
    }
}
