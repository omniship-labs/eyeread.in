//! Pack errors. Validation codes and their wording come straight from the
//! spec (`spec/packs/errors.json`), so the installer, Developer mode and the
//! creator CLI print the same thing for the same pack.

use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::fmt;
use std::sync::OnceLock;

const ERRORS_JSON: &str = include_str!("../../../spec/packs/errors.json");

fn templates() -> &'static HashMap<String, String> {
    static TEMPLATES: OnceLock<HashMap<String, String>> = OnceLock::new();
    TEMPLATES.get_or_init(|| {
        let spec: Value = serde_json::from_str(ERRORS_JSON).expect("spec/packs/errors.json");
        let mut out = HashMap::new();
        for section in ["validation", "runtime"] {
            if let Some(map) = spec[section].as_object() {
                for (code, message) in map {
                    out.insert(code.clone(), message.as_str().unwrap_or_default().into());
                }
            }
        }
        out
    })
}

/// A failed pack check, or a failed install/store operation.
///
/// `code` is a `PACK_*` code from the spec for validation failures, or one of
/// the `INSTALL_*` codes below for problems with the installed state.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct PackError {
    pub code: String,
    pub message: String,
}

/// Same pack id and version already installed, with different files.
pub const INSTALL_CONFLICT: &str = "INSTALL_CONFLICT";
/// The file changed between `packs_inspect` and `packs_install`.
pub const INSTALL_CHANGED: &str = "INSTALL_CHANGED";
pub const INSTALL_NOT_FOUND: &str = "INSTALL_NOT_FOUND";
/// The pack's files changed after install; it needs approving again.
pub const INSTALL_NEEDS_APPROVAL: &str = "INSTALL_NEEDS_APPROVAL";
pub const INSTALL_IO: &str = "INSTALL_IO";

impl PackError {
    /// Build a spec error, filling `{placeholders}` in its message template.
    pub fn new(code: &str, params: &[(&str, &str)]) -> Self {
        let mut message = templates()
            .get(code)
            .cloned()
            .unwrap_or_else(|| code.into());
        for (key, value) in params {
            message = message.replace(&format!("{{{key}}}"), value);
        }
        PackError {
            code: code.into(),
            message,
        }
    }

    /// An install/store error with a free-form message (not from the spec).
    pub fn install(code: &str, message: impl Into<String>) -> Self {
        PackError {
            code: code.into(),
            message: message.into(),
        }
    }

    pub fn io(context: &str, err: std::io::Error) -> Self {
        Self::install(INSTALL_IO, format!("{context}: {err}"))
    }

    /// Point a problem inside an included pack at its folder (`packs/<id>/`),
    /// so the author can find it. `{path}` values are already full paths.
    pub fn in_folder(mut self, folder: &str) -> Self {
        if folder.is_empty() || self.message.starts_with(folder) {
            return self;
        }
        self.message = match self.message.strip_prefix("pack.json") {
            Some(rest) => format!("{folder}pack.json{rest}"),
            None => format!("{}: {}", folder.trim_end_matches('/'), self.message),
        };
        self
    }
}

impl fmt::Display for PackError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}

impl std::error::Error for PackError {}

pub type PackResult<T> = Result<T, PackError>;

/// Human-readable size for limit messages ("20 MiB").
pub fn mib(bytes: u64) -> String {
    format!("{} MiB", bytes / (1024 * 1024))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fills_templates_from_the_spec() {
        let e = PackError::new("PACK_PATH_UNSAFE", &[("path", "../evil.js")]);
        assert_eq!(e.code, "PACK_PATH_UNSAFE");
        assert_eq!(
            e.message,
            "../evil.js: path must be a plain relative path inside the pack."
        );
        let e = PackError::new("E_NO_SESSION", &[]);
        assert_eq!(e.message, "The prompter isn't open.");
    }
}
