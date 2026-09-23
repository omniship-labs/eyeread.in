//! Minimal, strict HTTP/1.1 request reader for the extension API.
//!
//! The extension API is a local, request/response JSON API spoken by native
//! tools (scripts, companion apps, hardware controllers) — never by web
//! pages. This reader is intentionally narrow: one request per connection,
//! bounded header and body sizes, `Content-Length` bodies only, and it
//! rejects anything that looks like it came from a browser.

use std::io::{self, Read, Write};

/// Largest request head (request line + headers) we accept.
pub const MAX_HEAD_BYTES: usize = 16 * 1024;
/// Largest request body we accept. Scripts are plain text; 256 KiB is far
/// more than any teleprompter script needs.
pub const MAX_BODY_BYTES: usize = 256 * 1024;

#[derive(Debug)]
pub struct Request {
    pub method: String,
    pub path: String,
    /// Header names are lowercased; values are trimmed.
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

impl Request {
    pub fn header(&self, name: &str) -> Option<&str> {
        self.headers
            .iter()
            .find(|(n, _)| n == name)
            .map(|(_, v)| v.as_str())
    }

    /// The bearer token from `Authorization: Bearer <token>`, if any.
    pub fn bearer_token(&self) -> Option<&str> {
        let value = self.header("authorization")?;
        let (scheme, token) = value.split_once(' ')?;
        scheme
            .eq_ignore_ascii_case("bearer")
            .then(|| token.trim())
            .filter(|t| !t.is_empty())
    }

    pub fn is_json(&self) -> bool {
        self.header("content-type")
            .and_then(|v| v.split(';').next())
            .is_some_and(|v| v.trim().eq_ignore_ascii_case("application/json"))
    }
}

/// Why a request was rejected before routing. Each maps to one HTTP status
/// and a stable, machine-readable error code in the JSON body.
#[derive(Debug, PartialEq, Eq)]
pub enum HttpError {
    Malformed,
    HeadTooLarge,
    BodyTooLarge,
    LengthRequired,
    /// The request carried browser-only headers (`Origin`, `Sec-Fetch-*`).
    BrowserRequest,
    /// `Host` wasn't this loopback server — a DNS-rebinding attempt or a
    /// misdirected request.
    BadHost,
}

impl HttpError {
    pub fn status(&self) -> u16 {
        match self {
            HttpError::Malformed => 400,
            HttpError::HeadTooLarge => 431,
            HttpError::BodyTooLarge => 413,
            HttpError::LengthRequired => 411,
            HttpError::BrowserRequest | HttpError::BadHost => 403,
        }
    }

    pub fn code(&self) -> &'static str {
        match self {
            HttpError::Malformed => "malformed_request",
            HttpError::HeadTooLarge => "headers_too_large",
            HttpError::BodyTooLarge => "body_too_large",
            HttpError::LengthRequired => "length_required",
            HttpError::BrowserRequest => "browser_requests_not_allowed",
            HttpError::BadHost => "bad_host",
        }
    }
}

fn find_head_end(buf: &[u8]) -> Option<usize> {
    buf.windows(4).position(|w| w == b"\r\n\r\n")
}

/// Read exactly one request from `stream`, which must already have read and
/// write timeouts set by the caller.
///
/// Handles bodies that arrive in separate TCP segments from the head, and
/// `Expect: 100-continue` (sent by Windows PowerShell 5.1 and curl for large
/// bodies), both of which a single `read()` would get wrong.
pub fn read_request<S: Read + Write>(stream: &mut S, port: u16) -> Result<Request, HttpError> {
    let mut buf = Vec::with_capacity(4096);
    let mut chunk = [0u8; 4096];

    let head_end = loop {
        if let Some(end) = find_head_end(&buf) {
            break end;
        }
        if buf.len() > MAX_HEAD_BYTES {
            return Err(HttpError::HeadTooLarge);
        }
        let n = stream.read(&mut chunk).map_err(|_| HttpError::Malformed)?;
        if n == 0 {
            return Err(HttpError::Malformed);
        }
        buf.extend_from_slice(&chunk[..n]);
    };
    if head_end > MAX_HEAD_BYTES {
        return Err(HttpError::HeadTooLarge);
    }

    let head = std::str::from_utf8(&buf[..head_end]).map_err(|_| HttpError::Malformed)?;
    let mut lines = head.split("\r\n");
    let request_line = lines.next().ok_or(HttpError::Malformed)?;
    let mut parts = request_line.split(' ');
    let (Some(method), Some(target), Some(version), None) =
        (parts.next(), parts.next(), parts.next(), parts.next())
    else {
        return Err(HttpError::Malformed);
    };
    if !version.starts_with("HTTP/1.") || !target.starts_with('/') {
        return Err(HttpError::Malformed);
    }
    // Query strings aren't part of the API; ignore them rather than 404.
    let path = target.split('?').next().unwrap_or(target).to_string();

    let mut headers = Vec::new();
    for line in lines {
        let (name, value) = line.split_once(':').ok_or(HttpError::Malformed)?;
        headers.push((name.trim().to_ascii_lowercase(), value.trim().to_string()));
    }

    let mut req = Request {
        method: method.to_string(),
        path,
        headers,
        body: Vec::new(),
    };

    // Browsers send Origin on cross-origin POSTs and Sec-Fetch-Site on every
    // request to a loopback address. Native clients send neither, so refusing
    // them shuts out web pages (including "simple" no-preflight requests)
    // without needing CORS at all. (Only Sec-Fetch-Site: Node's built-in
    // fetch sends Sec-Fetch-Mode, and Node extensions must work.)
    if req.header("origin").is_some() || req.header("sec-fetch-site").is_some() {
        return Err(HttpError::BrowserRequest);
    }

    // DNS-rebinding defense: only answer requests addressed to us by a
    // loopback name.
    let host_ok = req.header("host").is_some_and(|h| {
        h.eq_ignore_ascii_case(&format!("127.0.0.1:{port}"))
            || h.eq_ignore_ascii_case(&format!("localhost:{port}"))
    });
    if !host_ok {
        return Err(HttpError::BadHost);
    }

    if req.header("transfer-encoding").is_some() {
        return Err(HttpError::LengthRequired);
    }

    let content_length = match req.header("content-length") {
        None => 0,
        Some(v) => v.parse::<usize>().map_err(|_| HttpError::Malformed)?,
    };
    if content_length > MAX_BODY_BYTES {
        return Err(HttpError::BodyTooLarge);
    }

    if content_length > 0
        && req
            .header("expect")
            .is_some_and(|v| v.eq_ignore_ascii_case("100-continue"))
    {
        stream
            .write_all(b"HTTP/1.1 100 Continue\r\n\r\n")
            .map_err(|_| HttpError::Malformed)?;
    }

    let mut body = buf.split_off(head_end + 4);
    while body.len() < content_length {
        let n = stream.read(&mut chunk).map_err(|_| HttpError::Malformed)?;
        if n == 0 {
            return Err(HttpError::Malformed);
        }
        body.extend_from_slice(&chunk[..n]);
    }
    body.truncate(content_length);
    req.body = body;
    Ok(req)
}

fn reason(status: u16) -> &'static str {
    match status {
        200 => "OK",
        201 => "Created",
        400 => "Bad Request",
        401 => "Unauthorized",
        403 => "Forbidden",
        404 => "Not Found",
        405 => "Method Not Allowed",
        408 => "Request Timeout",
        409 => "Conflict",
        411 => "Length Required",
        413 => "Payload Too Large",
        415 => "Unsupported Media Type",
        422 => "Unprocessable Entity",
        429 => "Too Many Requests",
        431 => "Request Header Fields Too Large",
        503 => "Service Unavailable",
        504 => "Gateway Timeout",
        _ => "Internal Server Error",
    }
}

/// Write a complete JSON response and signal the connection will close.
pub fn write_json<W: Write>(stream: &mut W, status: u16, body: &serde_json::Value) {
    let payload = body.to_string();
    let head = format!(
        "HTTP/1.1 {status} {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",
        reason(status),
        payload.len()
    );
    let _ = stream.write_all(head.as_bytes());
    let _ = stream.write_all(payload.as_bytes());
    let _ = stream.flush();
}

/// Write the head of a Server-Sent Events stream.
pub fn write_sse_head<W: Write>(stream: &mut W) -> io::Result<()> {
    stream.write_all(
        b"HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",
    )?;
    stream.flush()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::VecDeque;

    /// A fake socket: reads come from queued segments (to simulate TCP
    /// splitting a request), writes are captured.
    struct Fake {
        segments: VecDeque<Vec<u8>>,
        written: Vec<u8>,
    }

    impl Fake {
        fn new(segments: &[&[u8]]) -> Self {
            Fake {
                segments: segments.iter().map(|s| s.to_vec()).collect(),
                written: Vec::new(),
            }
        }
    }

    impl Read for Fake {
        fn read(&mut self, out: &mut [u8]) -> io::Result<usize> {
            let Some(mut seg) = self.segments.pop_front() else {
                return Ok(0);
            };
            let n = seg.len().min(out.len());
            out[..n].copy_from_slice(&seg[..n]);
            if n < seg.len() {
                self.segments.push_front(seg.split_off(n));
            }
            Ok(n)
        }
    }

    impl Write for Fake {
        fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
            self.written.extend_from_slice(buf);
            Ok(buf.len())
        }
        fn flush(&mut self) -> io::Result<()> {
            Ok(())
        }
    }

    const PORT: u16 = 17842;

    #[test]
    fn reads_body_split_across_segments() {
        let mut s = Fake::new(&[
            b"POST /v1/scripts HTTP/1.1\r\nHost: 127.0.0.1:17842\r\nContent-Type: application/json\r\nContent-Length: 13\r\n\r\n",
            b"{\"text\":",
            b"\"hi\"}",
        ]);
        let req = read_request(&mut s, PORT).unwrap();
        assert_eq!(req.method, "POST");
        assert_eq!(req.path, "/v1/scripts");
        assert!(req.is_json());
        assert_eq!(req.body, b"{\"text\":\"hi\"}");
    }

    #[test]
    fn answers_expect_100_continue_before_reading_body() {
        let mut s = Fake::new(&[
            b"POST /v1/scripts HTTP/1.1\r\nHost: localhost:17842\r\nExpect: 100-continue\r\nContent-Length: 2\r\n\r\n",
            b"{}",
        ]);
        let req = read_request(&mut s, PORT).unwrap();
        assert_eq!(req.body, b"{}");
        assert_eq!(s.written, b"HTTP/1.1 100 Continue\r\n\r\n");
    }

    #[test]
    fn rejects_browser_requests() {
        let mut s = Fake::new(&[
            b"POST /v1/scripts HTTP/1.1\r\nHost: 127.0.0.1:17842\r\nOrigin: https://evil.example\r\nContent-Length: 0\r\n\r\n",
        ]);
        assert_eq!(
            read_request(&mut s, PORT).unwrap_err(),
            HttpError::BrowserRequest
        );

        let mut s = Fake::new(&[
            b"GET /v1 HTTP/1.1\r\nHost: 127.0.0.1:17842\r\nSec-Fetch-Site: cross-site\r\n\r\n",
        ]);
        assert_eq!(
            read_request(&mut s, PORT).unwrap_err(),
            HttpError::BrowserRequest
        );
    }

    #[test]
    fn accepts_node_fetch() {
        // Node's built-in fetch (undici) sends Sec-Fetch-Mode but not
        // Sec-Fetch-Site or Origin.
        let mut s = Fake::new(&[
            b"GET /v1 HTTP/1.1\r\nHost: 127.0.0.1:17842\r\nSec-Fetch-Mode: cors\r\nUser-Agent: node\r\n\r\n",
        ]);
        assert!(read_request(&mut s, PORT).is_ok());
    }

    #[test]
    fn rejects_foreign_or_missing_host() {
        let mut s = Fake::new(&[b"GET /v1 HTTP/1.1\r\nHost: attacker.example:17842\r\n\r\n"]);
        assert_eq!(read_request(&mut s, PORT).unwrap_err(), HttpError::BadHost);

        let mut s = Fake::new(&[b"GET /v1 HTTP/1.1\r\n\r\n"]);
        assert_eq!(read_request(&mut s, PORT).unwrap_err(), HttpError::BadHost);
    }

    #[test]
    fn rejects_oversized_and_chunked_bodies() {
        let head = format!(
            "POST /v1/scripts HTTP/1.1\r\nHost: 127.0.0.1:17842\r\nContent-Length: {}\r\n\r\n",
            MAX_BODY_BYTES + 1
        );
        let mut s = Fake::new(&[head.as_bytes()]);
        assert_eq!(
            read_request(&mut s, PORT).unwrap_err(),
            HttpError::BodyTooLarge
        );

        let mut s = Fake::new(&[
            b"POST /v1/scripts HTTP/1.1\r\nHost: 127.0.0.1:17842\r\nTransfer-Encoding: chunked\r\n\r\n",
        ]);
        assert_eq!(
            read_request(&mut s, PORT).unwrap_err(),
            HttpError::LengthRequired
        );
    }

    #[test]
    fn rejects_truncated_body_and_garbage() {
        let mut s = Fake::new(&[
            b"POST /v1/scripts HTTP/1.1\r\nHost: 127.0.0.1:17842\r\nContent-Length: 10\r\n\r\n{}",
        ]);
        assert_eq!(
            read_request(&mut s, PORT).unwrap_err(),
            HttpError::Malformed
        );

        let mut s = Fake::new(&[b"hello\r\n\r\n"]);
        assert_eq!(
            read_request(&mut s, PORT).unwrap_err(),
            HttpError::Malformed
        );
    }

    #[test]
    fn parses_bearer_token() {
        let mut s = Fake::new(&[
            b"GET /v1/me HTTP/1.1\r\nHost: 127.0.0.1:17842\r\nAuthorization: Bearer abc123\r\n\r\n",
        ]);
        let req = read_request(&mut s, PORT).unwrap();
        assert_eq!(req.bearer_token(), Some("abc123"));
    }
}
