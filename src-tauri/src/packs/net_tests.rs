//! Network proxy tests. Policy cases run against a scripted transport; the
//! integration cases go through real reqwest to a local HTTP server (plain
//! HTTP is enabled only in these tests: the app itself is https only).

use super::net::*;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{IpAddr, SocketAddr, TcpListener};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

const PACK: &str = "com.example.notion";
const PERM: &str = "scripts:write";

struct Policy {
    sites: Vec<String>,
    internet: AtomicBool,
}

impl Policy {
    fn new(sites: &[&str], internet: bool) -> Arc<Self> {
        Arc::new(Policy {
            sites: sites.iter().map(|s| s.to_string()).collect(),
            internet: AtomicBool::new(internet),
        })
    }
}

impl NetPolicy for Policy {
    fn declared_sites(&self, pack: &str, permission: &str) -> Vec<String> {
        if pack == PACK && permission == PERM {
            self.sites.clone()
        } else {
            Vec::new()
        }
    }
    fn internet_allowed(&self, _: &str, _: &str) -> bool {
        self.internet.load(Ordering::SeqCst)
    }
}

/// Status, headers and body for one URL.
type Route = (u16, Vec<(&'static str, String)>, Vec<u8>);

/// Answers by URL; records what was sent.
#[derive(Default)]
struct Fake {
    routes: HashMap<String, Route>,
    delay: Option<Duration>,
    sent: Mutex<Vec<(String, String, Vec<u8>)>>,
    calls: AtomicUsize,
}

impl Fake {
    fn route(
        mut self,
        url: &str,
        status: u16,
        headers: &[(&'static str, &str)],
        body: &[u8],
    ) -> Self {
        self.routes.insert(
            url.into(),
            (
                status,
                headers.iter().map(|(k, v)| (*k, v.to_string())).collect(),
                body.to_vec(),
            ),
        );
        self
    }
}

impl Transport for Fake {
    fn send<'a>(
        &'a self,
        _pack: &'a str,
        req: HttpRequest,
        max_body: usize,
    ) -> BoxFuture<'a, Result<HttpResponse, TransportError>> {
        Box::pin(async move {
            self.calls.fetch_add(1, Ordering::SeqCst);
            if let Some(d) = self.delay {
                tokio::time::sleep(d).await;
            }
            self.sent.lock().unwrap().push((
                req.method.clone(),
                req.url.to_string(),
                req.body.clone(),
            ));
            let (status, headers, body) = self
                .routes
                .get(req.url.as_str())
                .cloned()
                .ok_or_else(|| TransportError::Network("no route".into()))?;
            if body.len() > max_body {
                return Err(TransportError::TooLarge);
            }
            Ok(HttpResponse {
                status,
                headers: headers
                    .into_iter()
                    .map(|(k, v)| (k.to_string(), v))
                    .collect(),
                body,
            })
        })
    }
}

fn get(url: &str) -> NetRequest {
    NetRequest {
        url: url.into(),
        ..Default::default()
    }
}

fn proxy(policy: Arc<Policy>, fake: Fake) -> (NetProxy, Arc<Fake>) {
    let fake = Arc::new(fake);
    (NetProxy::new(policy, fake.clone()), fake)
}

const API: &str = "https://api.notion.com";

#[tokio::test]
async fn allowed_request_succeeds_and_is_logged() {
    let (net, _) = proxy(
        Policy::new(&[API], true),
        Fake::default().route(
            "https://api.notion.com/v1/pages",
            200,
            &[
                ("Content-Type", "application/json"),
                ("Set-Cookie", "session=1"),
            ],
            b"{}",
        ),
    );
    let mut req = get("https://api.notion.com/v1/pages#frag");
    req.headers
        .insert("Authorization".into(), "Bearer t".into());
    let res = net.fetch(PACK, PERM, req).await.unwrap();
    assert_eq!(res.status, 200);
    assert_eq!(res.body, b"{}");
    assert_eq!(res.headers.get("content-type").unwrap(), "application/json");
    assert!(
        !res.headers.contains_key("set-cookie"),
        "cookies never reach the pack"
    );

    let log = net.log(PACK);
    assert_eq!(log.len(), 1);
    let e = &log[0];
    assert_eq!(
        (
            e.permission.as_str(),
            e.method.as_str(),
            e.host.as_str(),
            e.status,
            e.bytes_in,
            e.outcome.as_str()
        ),
        (PERM, "GET", "api.notion.com", Some(200), 2, "ok")
    );
}

async fn denied(net: &NetProxy, url: &str) -> String {
    let err = net.fetch(PACK, PERM, get(url)).await.unwrap_err();
    assert_eq!(err.code, "E_NETWORK_DENIED", "{url}: {err}");
    net.log(PACK).last().unwrap().outcome.clone()
}

#[tokio::test]
async fn undeclared_host_is_denied_and_logged() {
    let (net, fake) = proxy(Policy::new(&[API], true), Fake::default());
    assert_eq!(
        denied(&net, "https://evil.example.net/steal").await,
        "E_NETWORK_DENIED"
    );
    // Another port or scheme on the declared host is a different site.
    denied(&net, "https://api.notion.com:8443/x").await;
    // Another permission of the same pack has no sites.
    let err = net
        .fetch(PACK, "prompter:control", get("https://api.notion.com/"))
        .await
        .unwrap_err();
    assert_eq!(err.code, "E_NETWORK_DENIED");
    assert_eq!(
        fake.calls.load(Ordering::SeqCst),
        0,
        "nothing left the machine"
    );
    assert_eq!(net.log(PACK).len(), 3);
}

#[tokio::test]
async fn declared_site_with_internet_off_is_denied() {
    let (net, fake) = proxy(Policy::new(&[API], false), Fake::default());
    denied(&net, "https://api.notion.com/v1/pages").await;
    assert_eq!(fake.calls.load(Ordering::SeqCst), 0);
}

#[tokio::test]
async fn switching_internet_off_stops_the_next_request() {
    let policy = Policy::new(&[API], true);
    let (net, _) = proxy(
        policy.clone(),
        Fake::default().route("https://api.notion.com/", 200, &[], b"ok"),
    );
    assert!(net
        .fetch(PACK, PERM, get("https://api.notion.com/"))
        .await
        .is_ok());
    policy.internet.store(false, Ordering::SeqCst);
    denied(&net, "https://api.notion.com/").await;
}

#[tokio::test]
async fn redirects_stay_on_the_same_site() {
    let (net, fake) = proxy(
        Policy::new(&[API], true),
        Fake::default()
            .route("https://api.notion.com/a", 302, &[("Location", "/b")], b"")
            .route(
                "https://api.notion.com/b",
                303,
                &[("Location", "https://api.notion.com/c")],
                b"",
            )
            .route("https://api.notion.com/c", 200, &[], b"done")
            .route(
                "https://api.notion.com/out",
                301,
                &[("Location", "https://evil.example.net/")],
                b"",
            )
            .route(
                "https://api.notion.com/loop",
                307,
                &[("Location", "/loop")],
                b"",
            ),
    );
    let mut post = get("https://api.notion.com/a");
    post.method = Some("POST".into());
    post.body = Some(b"x".to_vec());
    let res = net.fetch(PACK, PERM, post).await.unwrap();
    assert_eq!(
        (res.status, res.url.as_str(), res.body.as_slice()),
        (200, "https://api.notion.com/c", &b"done"[..])
    );
    let sent = fake.sent.lock().unwrap().clone();
    assert_eq!(sent[2].0, "GET", "303 turns the request into a GET");
    assert!(sent[2].2.is_empty());

    // A redirect to another host is refused, not followed.
    let before = fake.calls.load(Ordering::SeqCst);
    let err = net
        .fetch(PACK, PERM, get("https://api.notion.com/out"))
        .await
        .unwrap_err();
    assert_eq!(err.code, "E_NETWORK_DENIED");
    assert!(
        err.message.starts_with("evil.example.net"),
        "{}",
        err.message
    );
    assert_eq!(fake.calls.load(Ordering::SeqCst), before + 1);
    let last = net.log(PACK).last().cloned().unwrap();
    assert_eq!(
        (last.status, last.outcome.as_str()),
        (Some(301), "E_NETWORK_DENIED")
    );

    let err = net
        .fetch(PACK, PERM, get("https://api.notion.com/loop"))
        .await
        .unwrap_err();
    assert_eq!(err.code, "E_NETWORK");
}

#[tokio::test]
async fn localhost_ip_addresses_and_http_are_denied() {
    // Even if a manifest somehow declared them.
    let sites = [
        "https://localhost",
        "https://127.0.0.1",
        "https://[::1]",
        "https://10.0.0.1",
        "http://api.notion.com",
        "https://dev.localhost",
    ];
    let (net, fake) = proxy(Policy::new(&sites, true), Fake::default());
    for url in [
        "https://localhost/",
        "https://127.0.0.1/",
        "https://[::1]/",
        "https://10.0.0.1/",
        "http://api.notion.com/",
        "https://dev.localhost/",
        "https://user:pw@api.notion.com/",
    ] {
        denied(&net, url).await;
    }
    assert_eq!(fake.calls.load(Ordering::SeqCst), 0);
}

#[test]
fn only_public_addresses_resolve() {
    for private in [
        "127.0.0.1",
        "10.1.2.3",
        "172.16.0.1",
        "192.168.1.1",
        "169.254.169.254",
        "100.64.0.1",
        "0.0.0.0",
        "::1",
        "fe80::1",
        "fd00::1",
        "::ffff:192.168.1.1",
        "224.0.0.1",
    ] {
        assert!(
            !ip_is_public(private.parse::<IpAddr>().unwrap()),
            "{private}"
        );
    }
    for public in ["1.1.1.1", "140.82.112.3", "2606:4700::1111"] {
        assert!(ip_is_public(public.parse::<IpAddr>().unwrap()), "{public}");
    }
}

#[tokio::test]
async fn size_limits() {
    let (net, fake) = proxy(
        Policy::new(&[API], true),
        Fake::default().route(
            "https://api.notion.com/big",
            200,
            &[],
            &vec![0u8; MAX_RESPONSE_BYTES + 1],
        ),
    );
    let mut req = get("https://api.notion.com/up");
    req.method = Some("PUT".into());
    req.body = Some(vec![0u8; MAX_REQUEST_BYTES + 1]);
    assert_eq!(
        net.fetch(PACK, PERM, req).await.unwrap_err().code,
        "E_TOO_LARGE"
    );
    assert_eq!(fake.calls.load(Ordering::SeqCst), 0);
    assert_eq!(net.log(PACK)[0].bytes_out, MAX_REQUEST_BYTES + 1);

    let err = net
        .fetch(PACK, PERM, get("https://api.notion.com/big"))
        .await
        .unwrap_err();
    assert_eq!(err.code, "E_TOO_LARGE");
    assert_eq!(net.log(PACK)[1].outcome, "E_TOO_LARGE");
}

#[tokio::test]
async fn timeout_is_enforced() {
    let mut fake = Fake::default().route("https://api.notion.com/slow", 200, &[], b"late");
    fake.delay = Some(Duration::from_millis(300));
    let (net, _) = proxy(Policy::new(&[API], true), fake);
    let mut req = get("https://api.notion.com/slow");
    req.timeout_ms = Some(50);
    assert_eq!(
        net.fetch(PACK, PERM, req).await.unwrap_err().code,
        "E_TIMEOUT"
    );
    assert_eq!(net.log(PACK)[0].outcome, "E_TIMEOUT");
}

#[tokio::test]
async fn rate_limit_per_pack() {
    let (net, _) = proxy(
        Policy::new(&[API], true),
        Fake::default().route("https://api.notion.com/", 200, &[], b""),
    );
    for _ in 0..RATE_LIMIT {
        net.fetch(PACK, PERM, get("https://api.notion.com/"))
            .await
            .unwrap();
    }
    let err = net
        .fetch(PACK, PERM, get("https://api.notion.com/"))
        .await
        .unwrap_err();
    assert_eq!(err.code, "E_RATE_LIMITED");
}

#[tokio::test]
async fn bad_arguments() {
    let (net, fake) = proxy(Policy::new(&[API], true), Fake::default());
    for (name, value) in [
        ("Cookie", "a=b"),
        ("Host", "x"),
        ("sec-fetch-site", "none"),
        ("Proxy-Authorization", "x"),
    ] {
        let mut req = get("https://api.notion.com/");
        req.headers.insert(name.into(), value.into());
        assert_eq!(
            net.fetch(PACK, PERM, req).await.unwrap_err().code,
            "E_INVALID_ARGUMENT",
            "{name}"
        );
    }
    let mut req = get("https://api.notion.com/");
    req.method = Some("TRACE".into());
    assert_eq!(
        net.fetch(PACK, PERM, req).await.unwrap_err().code,
        "E_INVALID_ARGUMENT"
    );
    assert_eq!(
        net.fetch(PACK, PERM, get("not a url"))
            .await
            .unwrap_err()
            .code,
        "E_INVALID_ARGUMENT"
    );
    assert_eq!(fake.calls.load(Ordering::SeqCst), 0);
    assert_eq!(net.log(PACK).len(), 6);
}

// ---- through real reqwest ------------------------------------------------------

/// A tiny HTTP/1.1 server: answers by path, and records request heads.
fn serve() -> (SocketAddr, Arc<Mutex<Vec<String>>>) {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let addr = listener.local_addr().unwrap();
    let heads = Arc::new(Mutex::new(Vec::new()));
    let seen = heads.clone();
    std::thread::spawn(move || {
        for stream in listener.incoming() {
            let Ok(mut s) = stream else { continue };
            let seen = seen.clone();
            std::thread::spawn(move || {
                let mut buf = Vec::new();
                let mut chunk = [0u8; 1024];
                while !buf.windows(4).any(|w| w == b"\r\n\r\n") {
                    match s.read(&mut chunk) {
                        Ok(0) | Err(_) => return,
                        Ok(n) => buf.extend_from_slice(&chunk[..n]),
                    }
                }
                let head = String::from_utf8_lossy(&buf).to_string();
                seen.lock().unwrap().push(head.clone());
                let path = head.split(' ').nth(1).unwrap_or("/").to_string();
                let (status, extra, body): (&str, String, Vec<u8>) = match path.as_str() {
                    "/ok" => (
                        "200 OK",
                        "Set-Cookie: sid=secret\r\n".into(),
                        b"hello".to_vec(),
                    ),
                    "/big" => ("200 OK", String::new(), vec![b'x'; MAX_RESPONSE_BYTES + 10]),
                    "/slow" => {
                        std::thread::sleep(Duration::from_millis(1500));
                        ("200 OK", String::new(), b"late".to_vec())
                    }
                    "/away" => (
                        "302 Found",
                        "Location: http://evil.example.net/\r\n".into(),
                        Vec::new(),
                    ),
                    "/here" => ("302 Found", "Location: /ok\r\n".into(), Vec::new()),
                    _ => ("404 Not Found", String::new(), Vec::new()),
                };
                let _ = s.write_all(
                    format!("HTTP/1.1 {status}\r\nContent-Length: {}\r\nConnection: close\r\n{extra}\r\n", body.len())
                        .as_bytes(),
                );
                let _ = s.write_all(&body);
            });
        }
    });
    (addr, heads)
}

#[tokio::test(flavor = "multi_thread")]
async fn through_reqwest() {
    let (addr, heads) = serve();
    let site = format!("http://api.example.com:{}", addr.port());
    let transport =
        ReqwestTransport::for_tests(vec![("api.example.com", addr), ("evil.example.net", addr)]);
    let net =
        NetProxy::new(Policy::new(&[&site], true), Arc::new(transport)).allowing_http_for_tests();

    // Allowed, and cookies are neither returned nor sent back.
    let res = net
        .fetch(PACK, PERM, get(&format!("{site}/ok")))
        .await
        .unwrap();
    assert_eq!((res.status, res.body.as_slice()), (200, &b"hello"[..]));
    assert!(!res.headers.contains_key("set-cookie"));
    net.fetch(PACK, PERM, get(&format!("{site}/ok")))
        .await
        .unwrap();
    let second = heads.lock().unwrap()[1].to_ascii_lowercase();
    assert!(!second.contains("cookie"), "no cookie jar: {second}");

    // Same-site redirect followed; another host refused.
    let res = net
        .fetch(PACK, PERM, get(&format!("{site}/here")))
        .await
        .unwrap();
    assert!(res.url.ends_with("/ok"));
    let err = net
        .fetch(PACK, PERM, get(&format!("{site}/away")))
        .await
        .unwrap_err();
    assert_eq!(err.code, "E_NETWORK_DENIED");
    assert_eq!(
        heads.lock().unwrap().len(),
        5,
        "ok ×2, here → ok, away; the other host was never contacted"
    );

    // Size and time limits on a real connection.
    let err = net
        .fetch(PACK, PERM, get(&format!("{site}/big")))
        .await
        .unwrap_err();
    assert_eq!(err.code, "E_TOO_LARGE");
    let mut slow = get(&format!("{site}/slow"));
    slow.timeout_ms = Some(300);
    assert_eq!(
        net.fetch(PACK, PERM, slow).await.unwrap_err().code,
        "E_TIMEOUT"
    );

    // Undeclared host: denied without a connection.
    let before = heads.lock().unwrap().len();
    let err = net
        .fetch(
            PACK,
            PERM,
            get(&format!("http://evil.example.net:{}/ok", addr.port())),
        )
        .await
        .unwrap_err();
    assert_eq!(err.code, "E_NETWORK_DENIED");
    assert_eq!(heads.lock().unwrap().len(), before);

    let outcomes: Vec<String> = net.log(PACK).into_iter().map(|e| e.outcome).collect();
    assert_eq!(
        outcomes,
        [
            "ok",
            "ok",
            "ok",
            "E_NETWORK_DENIED",
            "E_TOO_LARGE",
            "E_TIMEOUT",
            "E_NETWORK_DENIED"
        ]
    );
}
