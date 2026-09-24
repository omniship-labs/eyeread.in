//! `eyeread.net.fetch`: the only way a pack reaches the internet.
//!
//! Requests are made here, in Rust, on behalf of one (pack, permission)
//! sandbox, and only if the site is declared for that permission, the user
//! switched internet on for it, and the URL is plain `https://` to that exact
//! host. Redirects are followed only within the same origin, host names that
//! resolve to private or loopback addresses are refused, no cookies are kept,
//! and every request (allowed or not) is written to the pack's network log,
//! without bodies. Contract: `spec/packs/API.md`, `net.fetch`.

// `fetch` is called by the pack host (#122); until that lands only the tests
// and the log command use this module. Remove this allow with #122.
#![cfg_attr(not(test), allow(dead_code))]

use super::error::PackError;
use serde::Serialize;
use std::collections::{BTreeMap, HashMap, VecDeque};
use std::future::Future;
use std::net::{IpAddr, SocketAddr};
use std::pin::Pin;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use url::{Host, Url};

pub const DEFAULT_TIMEOUT_MS: u64 = 15_000;
pub const MAX_TIMEOUT_MS: u64 = 30_000;
pub const MAX_REQUEST_BYTES: usize = 1024 * 1024;
pub const MAX_RESPONSE_BYTES: usize = 5 * 1024 * 1024;
pub const RATE_LIMIT: usize = 60;
const RATE_WINDOW: Duration = Duration::from_secs(60);
pub const MAX_REDIRECTS: usize = 5;
const LOG_LIMIT: usize = 500;

const METHODS: [&str; 6] = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"];
const FORBIDDEN_HEADERS: [&str; 7] = [
    "cookie",
    "host",
    "origin",
    "referer",
    "connection",
    "content-length",
    "transfer-encoding",
];
const FORBIDDEN_HEADER_PREFIXES: [&str; 2] = ["proxy-", "sec-"];

/// What the proxy needs to know about packs: their declared sites and the
/// user's grants. Implemented by the app state; mocked in tests.
pub trait NetPolicy: Send + Sync {
    /// Sites `pack` declares for `permission` (empty if it declares none, or
    /// isn't installed).
    fn declared_sites(&self, pack: &str, permission: &str) -> Vec<String>;
    /// The user switched internet on for this permission (and the pack and
    /// permission are on). Checked before every request and redirect.
    fn internet_allowed(&self, pack: &str, permission: &str) -> bool;
}

/// A `net.fetch` call from a sandbox (protocol `params`, bodies as bytes).
#[derive(Debug, Clone, Default)]
pub struct NetRequest {
    pub url: String,
    pub method: Option<String>,
    pub headers: BTreeMap<String, String>,
    pub body: Option<Vec<u8>>,
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NetResponse {
    pub status: u16,
    pub url: String,
    /// Lowercase names; `set-cookie` removed.
    pub headers: BTreeMap<String, String>,
    pub body: Vec<u8>,
}

/// One line of a pack's network log. Never holds bodies or header values.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogEntry {
    pub time: u64,
    pub permission: String,
    pub method: String,
    pub host: String,
    pub status: Option<u16>,
    pub bytes_out: usize,
    pub bytes_in: usize,
    /// `"ok"`, or the error code the pack got.
    pub outcome: String,
}

// ---- transport ---------------------------------------------------------------

pub type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

pub struct HttpRequest {
    pub url: Url,
    pub method: String,
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

pub struct HttpResponse {
    pub status: u16,
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

#[derive(Debug)]
pub enum TransportError {
    /// The response body passed the limit it was given.
    TooLarge,
    Network(String),
}

/// Sends one HTTP request without following redirects, reading at most
/// `max_body` bytes of the response. The policy lives in `NetProxy`.
pub trait Transport: Send + Sync {
    fn send<'a>(
        &'a self,
        pack: &'a str,
        request: HttpRequest,
        max_body: usize,
    ) -> BoxFuture<'a, Result<HttpResponse, TransportError>>;
}

// ---- policy helpers (pure) ----------------------------------------------------

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// `https://host[:port]`, the form sites are declared in.
pub fn origin(url: &Url) -> String {
    let host = url.host_str().unwrap_or_default();
    match url.port() {
        Some(port) => format!("{}://{host}:{port}", url.scheme()),
        None => format!("{}://{host}", url.scheme()),
    }
}

/// Only public unicast addresses: nothing on this machine or the local network.
pub fn ip_is_public(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            let [a, b, ..] = v4.octets();
            !(v4.is_loopback()
                || v4.is_private()
                || v4.is_link_local()
                || v4.is_unspecified()
                || v4.is_broadcast()
                || v4.is_multicast()
                || v4.is_documentation()
                || a == 0
                || (a == 100 && (64..128).contains(&b)) // shared address space (CGNAT)
                || (a == 198 && (b == 18 || b == 19)) // benchmarking
                || a >= 240)
        }
        IpAddr::V6(v6) => {
            if let Some(v4) = v6.to_ipv4_mapped() {
                return ip_is_public(IpAddr::V4(v4));
            }
            let first = v6.segments()[0];
            !(v6.is_loopback()
                || v6.is_unspecified()
                || v6.is_multicast()
                || (first & 0xfe00) == 0xfc00 // unique local
                || (first & 0xffc0) == 0xfe80 // link local
                || first == 0x2001 && v6.segments()[1] == 0x0db8) // documentation
        }
    }
}

fn header_forbidden(name: &str) -> bool {
    let name = name.to_ascii_lowercase();
    FORBIDDEN_HEADERS.contains(&name.as_str())
        || FORBIDDEN_HEADER_PREFIXES
            .iter()
            .any(|p| name.starts_with(p))
}

/// Why a URL may not be fetched by this sandbox, before any policy lookup:
/// only a plain `https://` URL to a DNS name.
fn check_url_shape(url: &Url, allow_http: bool) -> Result<(), &'static str> {
    let scheme_ok = url.scheme() == "https" || (allow_http && url.scheme() == "http");
    if !scheme_ok {
        return Err("only https:// URLs are allowed");
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err("URLs can't carry a user name or password");
    }
    match url.host() {
        Some(Host::Domain(d)) => {
            let d = d.trim_end_matches('.');
            if d == "localhost" || d.ends_with(".localhost") || !d.contains('.') {
                return Err("local host names aren't allowed");
            }
            Ok(())
        }
        Some(Host::Ipv4(_)) | Some(Host::Ipv6(_)) => Err("IP addresses aren't allowed"),
        None => Err("the URL has no host"),
    }
}

// ---- the proxy ----------------------------------------------------------------

pub struct NetProxy {
    policy: Arc<dyn NetPolicy>,
    transport: Arc<dyn Transport>,
    logs: Mutex<HashMap<String, VecDeque<LogEntry>>>,
    sent: Mutex<HashMap<String, VecDeque<Instant>>>,
    /// Tests talk plain HTTP to a local server; the app never does.
    allow_http: bool,
}

struct Denied {
    error: PackError,
    status: Option<u16>,
    bytes_in: usize,
}

impl From<PackError> for Denied {
    fn from(error: PackError) -> Self {
        Denied {
            error,
            status: None,
            bytes_in: 0,
        }
    }
}

impl NetProxy {
    pub fn new(policy: Arc<dyn NetPolicy>, transport: Arc<dyn Transport>) -> Self {
        NetProxy {
            policy,
            transport,
            logs: Mutex::new(HashMap::new()),
            sent: Mutex::new(HashMap::new()),
            allow_http: false,
        }
    }

    #[cfg(test)]
    pub fn allowing_http_for_tests(mut self) -> Self {
        self.allow_http = true;
        self
    }

    /// The pack's network log, newest last.
    pub fn log(&self, pack: &str) -> Vec<LogEntry> {
        let logs = self.logs.lock().unwrap_or_else(|e| e.into_inner());
        logs.get(pack)
            .map(|l| l.iter().cloned().collect())
            .unwrap_or_default()
    }

    pub fn clear_log(&self, pack: &str) {
        self.logs
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .remove(pack);
    }

    fn write_log(&self, pack: &str, entry: LogEntry) {
        let mut logs = self.logs.lock().unwrap_or_else(|e| e.into_inner());
        let log = logs.entry(pack.to_string()).or_default();
        log.push_back(entry);
        while log.len() > LOG_LIMIT {
            log.pop_front();
        }
    }

    /// Count a request against the pack's rate limit; `false` if it's over.
    fn take_rate_slot(&self, pack: &str) -> bool {
        let mut sent = self.sent.lock().unwrap_or_else(|e| e.into_inner());
        let times = sent.entry(pack.to_string()).or_default();
        let now = Instant::now();
        while times
            .front()
            .is_some_and(|t| now.duration_since(*t) >= RATE_WINDOW)
        {
            times.pop_front();
        }
        if times.len() >= RATE_LIMIT {
            return false;
        }
        times.push_back(now);
        true
    }

    fn denied(host: &str, permission: &str) -> PackError {
        PackError::new(
            "E_NETWORK_DENIED",
            &[("host", host), ("permission", permission)],
        )
    }

    fn invalid(detail: &str) -> PackError {
        PackError::new("E_INVALID_ARGUMENT", &[("detail", detail)])
    }

    /// Everything that must hold for `url` to be fetched right now.
    fn check_allowed(&self, pack: &str, permission: &str, url: &Url) -> Result<(), PackError> {
        let host = url.host_str().unwrap_or_default();
        if check_url_shape(url, self.allow_http).is_err() {
            return Err(Self::denied(host, permission));
        }
        let declared = self.policy.declared_sites(pack, permission);
        if !declared.iter().any(|site| *site == origin(url)) {
            return Err(Self::denied(host, permission));
        }
        if !self.policy.internet_allowed(pack, permission) {
            return Err(Self::denied(host, permission));
        }
        Ok(())
    }

    /// Run `net.fetch` for the sandbox of `pack`'s `permission`.
    pub async fn fetch(
        &self,
        pack: &str,
        permission: &str,
        request: NetRequest,
    ) -> Result<NetResponse, PackError> {
        let method = request
            .method
            .clone()
            .unwrap_or_else(|| "GET".into())
            .to_ascii_uppercase();
        let host = Url::parse(&request.url)
            .ok()
            .and_then(|u| u.host_str().map(String::from))
            .unwrap_or_default();
        let bytes_out = request.body.as_ref().map_or(0, Vec::len);
        let result = self.run(pack, permission, &method, request).await;
        let (status, bytes_in, outcome) = match &result {
            Ok(r) => (Some(r.status), r.body.len(), "ok".to_string()),
            Err(d) => (d.status, d.bytes_in, d.error.code.clone()),
        };
        self.write_log(
            pack,
            LogEntry {
                time: now_ms(),
                permission: permission.into(),
                method,
                host,
                status,
                bytes_out,
                bytes_in,
                outcome,
            },
        );
        result.map_err(|d| d.error)
    }

    async fn run(
        &self,
        pack: &str,
        permission: &str,
        method: &str,
        request: NetRequest,
    ) -> Result<NetResponse, Denied> {
        let mut url = Url::parse(&request.url)
            .map_err(|_| Self::invalid("url must be an absolute https:// URL"))?;
        url.set_fragment(None);
        if !METHODS.contains(&method) {
            return Err(
                Self::invalid("method must be GET, HEAD, POST, PUT, PATCH or DELETE").into(),
            );
        }
        if let Some(name) = request.headers.keys().find(|n| header_forbidden(n)) {
            return Err(Self::invalid(&format!("the {name} header can't be set")).into());
        }
        let body = request.body.unwrap_or_default();
        if body.len() > MAX_REQUEST_BYTES {
            return Err(PackError::new("E_TOO_LARGE", &[("limit", "1 MiB")]).into());
        }
        let timeout = Duration::from_millis(
            request
                .timeout_ms
                .unwrap_or(DEFAULT_TIMEOUT_MS)
                .clamp(1, MAX_TIMEOUT_MS),
        );

        self.check_allowed(pack, permission, &url)?;
        if !self.take_rate_slot(pack) {
            return Err(PackError::new("E_RATE_LIMITED", &[]).into());
        }

        let headers: Vec<(String, String)> = request.headers.into_iter().collect();
        let exchange = async {
            let mut method = method.to_string();
            let mut body = body;
            for _ in 0..=MAX_REDIRECTS {
                let response = self
                    .transport
                    .send(
                        pack,
                        HttpRequest {
                            url: url.clone(),
                            method: method.clone(),
                            headers: headers.clone(),
                            body: body.clone(),
                        },
                        MAX_RESPONSE_BYTES,
                    )
                    .await
                    .map_err(|e| match e {
                        TransportError::TooLarge => Denied {
                            error: PackError::new("E_TOO_LARGE", &[("limit", "5 MiB")]),
                            status: None,
                            bytes_in: MAX_RESPONSE_BYTES,
                        },
                        TransportError::Network(detail) => PackError::new(
                            "E_NETWORK",
                            &[
                                ("host", url.host_str().unwrap_or_default()),
                                ("detail", &detail),
                            ],
                        )
                        .into(),
                    })?;
                let location = response
                    .headers
                    .iter()
                    .find(|(k, _)| k.eq_ignore_ascii_case("location"))
                    .map(|(_, v)| v.clone());
                let redirect = matches!(response.status, 301 | 302 | 303 | 307 | 308);
                let Some(location) = location.filter(|_| redirect) else {
                    let mut out = BTreeMap::new();
                    for (k, v) in response.headers {
                        let k = k.to_ascii_lowercase();
                        if k == "set-cookie" || k == "set-cookie2" {
                            continue;
                        }
                        out.entry(k)
                            .and_modify(|e: &mut String| {
                                e.push_str(", ");
                                e.push_str(&v)
                            })
                            .or_insert(v);
                    }
                    return Ok(NetResponse {
                        status: response.status,
                        url: url.to_string(),
                        headers: out,
                        body: response.body,
                    });
                };
                let next = url.join(&location).map_err(|_| {
                    PackError::new(
                        "E_NETWORK",
                        &[
                            ("host", url.host_str().unwrap_or_default()),
                            ("detail", "bad redirect"),
                        ],
                    )
                })?;
                if origin(&next) != origin(&url) {
                    return Err(Denied {
                        error: Self::denied(next.host_str().unwrap_or_default(), permission),
                        status: Some(response.status),
                        bytes_in: response.body.len(),
                    });
                }
                // The user may have switched internet off since the first hop.
                self.check_allowed(pack, permission, &next)?;
                if response.status == 303
                    || (matches!(response.status, 301 | 302) && method == "POST")
                {
                    method = "GET".into();
                    body = Vec::new();
                }
                url = next;
            }
            Err(PackError::new(
                "E_NETWORK",
                &[
                    ("host", url.host_str().unwrap_or_default()),
                    ("detail", "too many redirects"),
                ],
            )
            .into())
        };
        match tokio::time::timeout(timeout, exchange).await {
            Ok(result) => result,
            Err(_) => Err(PackError::new("E_TIMEOUT", &[]).into()),
        }
    }
}

// ---- the real transport -------------------------------------------------------

/// Resolves host names, refusing any that point at this machine or the local
/// network (a declared site can't be used to reach the LAN).
struct PublicOnlyResolver;

impl reqwest::dns::Resolve for PublicOnlyResolver {
    fn resolve(&self, name: reqwest::dns::Name) -> reqwest::dns::Resolving {
        let host = name.as_str().to_string();
        Box::pin(async move {
            let addrs: Vec<SocketAddr> = tokio::net::lookup_host((host.as_str(), 0))
                .await?
                .filter(|a| ip_is_public(a.ip()))
                .collect();
            if addrs.is_empty() {
                return Err(format!("{host} doesn't resolve to a public address").into());
            }
            Ok(Box::new(addrs.into_iter()) as reqwest::dns::Addrs)
        })
    }
}

/// reqwest, with one client per pack so packs never share connections, TLS
/// sessions or anything else. No cookies, no redirects (the proxy handles
/// them), no system proxy (DNS must be checked here), https only.
pub struct ReqwestTransport {
    clients: Mutex<HashMap<String, reqwest::Client>>,
    build: Box<dyn Fn() -> reqwest::ClientBuilder + Send + Sync>,
}

impl ReqwestTransport {
    /// reqwest is built without a TLS crypto provider (as for the updater);
    /// install rustls' ring provider once if nothing has yet.
    fn install_crypto_provider() {
        if rustls::crypto::CryptoProvider::get_default().is_none() {
            let _ = rustls::crypto::ring::default_provider().install_default();
        }
    }

    pub fn new(user_agent: String) -> Self {
        Self::install_crypto_provider();
        ReqwestTransport {
            clients: Mutex::new(HashMap::new()),
            build: Box::new(move || {
                reqwest::Client::builder()
                    .user_agent(user_agent.clone())
                    .redirect(reqwest::redirect::Policy::none())
                    .referer(false)
                    .no_proxy()
                    .https_only(true)
                    .connect_timeout(Duration::from_secs(10))
                    .dns_resolver(Arc::new(PublicOnlyResolver))
            }),
        }
    }

    /// Plain HTTP with fixed host → address mappings, for tests against a
    /// local server.
    #[cfg(test)]
    pub fn for_tests(hosts: Vec<(&'static str, SocketAddr)>) -> Self {
        Self::install_crypto_provider();
        ReqwestTransport {
            clients: Mutex::new(HashMap::new()),
            build: Box::new(move || {
                let mut b = reqwest::Client::builder()
                    .redirect(reqwest::redirect::Policy::none())
                    .no_proxy();
                for (host, addr) in &hosts {
                    b = b.resolve(host, *addr);
                }
                b
            }),
        }
    }

    fn client(&self, pack: &str) -> Result<reqwest::Client, TransportError> {
        let mut clients = self.clients.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(c) = clients.get(pack) {
            return Ok(c.clone());
        }
        let client = (self.build)()
            .build()
            .map_err(|e| TransportError::Network(e.to_string()))?;
        clients.insert(pack.to_string(), client.clone());
        Ok(client)
    }
}

impl Transport for ReqwestTransport {
    fn send<'a>(
        &'a self,
        pack: &'a str,
        request: HttpRequest,
        max_body: usize,
    ) -> BoxFuture<'a, Result<HttpResponse, TransportError>> {
        Box::pin(async move {
            let client = self.client(pack)?;
            let method = reqwest::Method::from_bytes(request.method.as_bytes())
                .map_err(|e| TransportError::Network(e.to_string()))?;
            let mut builder = client.request(method, request.url);
            for (k, v) in &request.headers {
                builder = builder.header(k, v);
            }
            if !request.body.is_empty() {
                builder = builder.body(request.body);
            }
            let mut response = builder
                .send()
                .await
                .map_err(|e| TransportError::Network(e.to_string()))?;
            if response
                .content_length()
                .is_some_and(|n| n as usize > max_body)
            {
                return Err(TransportError::TooLarge);
            }
            let status = response.status().as_u16();
            let headers = response
                .headers()
                .iter()
                .map(|(k, v)| {
                    (
                        k.as_str().to_string(),
                        String::from_utf8_lossy(v.as_bytes()).into_owned(),
                    )
                })
                .collect();
            let mut body = Vec::new();
            while let Some(chunk) = response
                .chunk()
                .await
                .map_err(|e| TransportError::Network(e.to_string()))?
            {
                if body.len() + chunk.len() > max_body {
                    return Err(TransportError::TooLarge);
                }
                body.extend_from_slice(&chunk);
            }
            Ok(HttpResponse {
                status,
                headers,
                body,
            })
        })
    }
}
