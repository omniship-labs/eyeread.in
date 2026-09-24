//! `files.json`: a pack's per-file SHA-256 list, and the **pack hash** (the
//! SHA-256 of that list in canonical form), which identifies one exact version
//! of one pack. See `spec/packs/FORMAT.md`.

use super::archive::{Entry, FILES_JSON, SIGNATURE_FILE};
use super::error::{PackError, PackResult};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;

pub fn sha256_hex(bytes: &[u8]) -> String {
    Sha256::digest(bytes)
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect()
}

/// `files.json`, field order as the canonical form wants it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FilesList {
    pub format: u32,
    pub id: String,
    pub version: String,
    /// Path → lowercase hex SHA-256. A BTreeMap keeps paths in byte order.
    pub files: BTreeMap<String, String>,
}

/// Is this path hashed? Everything but the list itself and its signature.
/// (Included packs are separate packs; callers pass one pack's entries.)
pub fn is_hashed(path: &str) -> bool {
    path != FILES_JSON && path != SIGNATURE_FILE
}

impl FilesList {
    /// Hash one pack's files, as they are.
    pub fn compute(id: &str, version: &str, entries: &[Entry]) -> Self {
        FilesList {
            format: 1,
            id: id.into(),
            version: version.into(),
            files: entries
                .iter()
                .filter(|e| is_hashed(&e.path))
                .map(|e| (e.path.clone(), sha256_hex(&e.bytes)))
                .collect(),
        }
    }

    /// Canonical bytes: `JSON.stringify(value, null, 2) + "\n"`.
    pub fn canonical_bytes(&self) -> Vec<u8> {
        let mut out = serde_json::to_vec_pretty(self).expect("files list serializes");
        out.push(b'\n');
        out
    }

    pub fn pack_hash(&self) -> String {
        sha256_hex(&self.canonical_bytes())
    }

    /// Parse and check a shipped `files.json` against the manifest.
    pub fn parse(bytes: &[u8], id: &str, version: &str) -> PackResult<Self> {
        let invalid =
            |detail: &str| PackError::new("PACK_FILES_JSON_INVALID", &[("detail", detail)]);
        let list: FilesList = serde_json::from_slice(bytes).map_err(|e| invalid(&e.to_string()))?;
        if list.format != 1 {
            return Err(invalid("format must be 1"));
        }
        if list.id != id || list.version != version {
            return Err(invalid("id and version must match pack.json"));
        }
        if list.files.is_empty() {
            return Err(invalid("files must list at least one file"));
        }
        if let Some((path, _)) = list.files.iter().find(|(_, h)| {
            h.len() != 64
                || !h
                    .bytes()
                    .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
        }) {
            return Err(invalid(&format!(
                "{path}: hash must be 64 lowercase hex characters"
            )));
        }
        Ok(list)
    }

    /// The first difference between the expected list and the files present,
    /// in path order, as `PACK_FILES_MISMATCH`. `prefix` is prepended to paths
    /// (an included pack's folder).
    pub fn compare(&self, actual: &FilesList, prefix: &str) -> PackResult<()> {
        let paths: std::collections::BTreeSet<&String> =
            self.files.keys().chain(actual.files.keys()).collect();
        for path in paths {
            let detail = match (self.files.get(path), actual.files.get(path)) {
                (Some(_), None) => "listed in files.json but missing from the pack",
                (None, Some(_)) => "not listed in files.json",
                (Some(want), Some(got)) if want != got => "contents don't match files.json",
                _ => continue,
            };
            return Err(PackError::new(
                "PACK_FILES_MISMATCH",
                &[("path", &format!("{prefix}{path}")), ("detail", detail)],
            ));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(path: &str, bytes: &[u8]) -> Entry {
        Entry {
            path: path.into(),
            bytes: bytes.to_vec(),
        }
    }

    #[test]
    fn canonical_form_matches_json_stringify() {
        let list = FilesList::compute(
            "com.example.a",
            "1.0.0",
            &[
                entry("main.js", b"x"),
                entry("LICENSE", b"y"),
                entry(FILES_JSON, b"{}"),
            ],
        );
        let text = String::from_utf8(list.canonical_bytes()).unwrap();
        assert_eq!(
            text,
            format!(
                "{{\n  \"format\": 1,\n  \"id\": \"com.example.a\",\n  \"version\": \"1.0.0\",\n  \"files\": {{\n    \"LICENSE\": \"{}\",\n    \"main.js\": \"{}\"\n  }}\n}}\n",
                sha256_hex(b"y"),
                sha256_hex(b"x")
            )
        );
    }

    #[test]
    fn compare_reports_first_difference_in_path_order() {
        let want = FilesList::compute("a.b", "1.0.0", &[entry("a.js", b"1"), entry("b.js", b"2")]);
        let got = FilesList::compute("a.b", "1.0.0", &[entry("a.js", b"1"), entry("b.js", b"X")]);
        let err = want.compare(&got, "packs/a.b/").unwrap_err();
        assert_eq!(err.code, "PACK_FILES_MISMATCH");
        assert_eq!(
            err.message,
            "packs/a.b/b.js: contents don't match files.json"
        );
        let extra = FilesList::compute(
            "a.b",
            "1.0.0",
            &[
                entry("a.js", b"1"),
                entry("b.js", b"2"),
                entry("c.js", b"3"),
            ],
        );
        assert_eq!(
            want.compare(&extra, "").unwrap_err().message,
            "c.js: not listed in files.json"
        );
        assert!(want.compare(&want.clone(), "").is_ok());
    }
}
