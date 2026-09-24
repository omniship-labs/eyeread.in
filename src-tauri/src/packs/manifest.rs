//! `pack.json`: parsing and checking a manifest against the spec's own JSON
//! Schema (`spec/packs/pack.schema.json`, embedded at build time), plus the
//! rules a schema can't express. Steps 2–6 of the spec's check order.

use super::error::{PackError, PackResult};
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{BTreeMap, HashSet};
use std::sync::OnceLock;

const PACK_SCHEMA: &str = include_str!("../../../spec/packs/pack.schema.json");

/// The `apiVersion`s this app runs.
pub const SUPPORTED_API_VERSIONS: [u64; 1] = [1];
pub const LICENSES: [&str; 3] = ["AGPL-3.0-only", "AGPL-3.0-or-later", "AGPL-3.0"];

pub const PERMISSIONS: [&str; 5] = [
    "scripts:write",
    "prompter:load",
    "prompter:control",
    "prompter:events",
    "files:import",
];

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Author {
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct PermissionDecl {
    #[serde(default)]
    pub network: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SelectOption {
    pub value: String,
    pub label: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum SettingKind {
    Toggle {
        #[serde(default, skip_serializing_if = "Option::is_none")]
        default: Option<bool>,
    },
    Select {
        options: Vec<SelectOption>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        default: Option<String>,
    },
    Number {
        #[serde(default, skip_serializing_if = "Option::is_none")]
        min: Option<f64>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        max: Option<f64>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        step: Option<f64>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        unit: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        default: Option<f64>,
    },
    #[serde(rename_all = "camelCase")]
    Text {
        #[serde(default, skip_serializing_if = "Option::is_none")]
        max_length: Option<u32>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        placeholder: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        multiline: Option<bool>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        default: Option<String>,
    },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Setting {
    pub key: String,
    pub label: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(flatten)]
    pub kind: SettingKind,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Include {
    pub id: String,
    pub version: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    pub api_version: u64,
    pub id: String,
    pub name: String,
    pub version: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub author: Author,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub homepage: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub repository: Option<String>,
    pub license: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub min_app_version: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub main: Option<String>,
    /// BTreeMap: permissions come out in a stable order.
    #[serde(default)]
    pub permissions: BTreeMap<String, PermissionDecl>,
    #[serde(default)]
    pub settings: Vec<Setting>,
    #[serde(default)]
    pub includes: Vec<Include>,
}

impl Manifest {
    /// Permissions in the spec's canonical order.
    pub fn permission_names(&self) -> Vec<&'static str> {
        PERMISSIONS
            .iter()
            .copied()
            .filter(|p| self.permissions.contains_key(*p))
            .collect()
    }
}

fn schema() -> &'static Value {
    static SCHEMA: OnceLock<Value> = OnceLock::new();
    SCHEMA.get_or_init(|| serde_json::from_str(PACK_SCHEMA).expect("spec/packs/pack.schema.json"))
}

fn validator() -> &'static jsonschema::Validator {
    static VALIDATOR: OnceLock<jsonschema::Validator> = OnceLock::new();
    VALIDATOR.get_or_init(|| jsonschema::validator_for(schema()).expect("pack schema compiles"))
}

/// The site rule, taken from the schema itself so the two can't drift.
fn site_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        let pattern = schema()["$defs"]["site"]["pattern"]
            .as_str()
            .expect("site pattern");
        Regex::new(pattern).expect("site pattern compiles")
    })
}

pub fn site_is_valid(site: &str) -> bool {
    site.len() <= 262 && site_regex().is_match(site)
}

/// Parse `pack.json` bytes and run steps 2–6: readable JSON, `apiVersion`,
/// license, network sites, the schema, then app version and settings.
pub fn parse(bytes: &[u8], app_version: &semver::Version) -> PackResult<Manifest> {
    let value: Value = serde_json::from_slice(bytes)
        .map_err(|e| PackError::new("PACK_MANIFEST_INVALID_JSON", &[("detail", &e.to_string())]))?;

    if let Some(v) = value.get("apiVersion").and_then(Value::as_u64) {
        if !SUPPORTED_API_VERSIONS.contains(&v) {
            let supported: Vec<String> =
                SUPPORTED_API_VERSIONS.iter().map(u64::to_string).collect();
            return Err(PackError::new(
                "PACK_API_VERSION",
                &[
                    ("apiVersion", &v.to_string()),
                    ("supported", &supported.join(", ")),
                ],
            ));
        }
    }
    if let Some(license) = value.get("license").and_then(Value::as_str) {
        if !LICENSES.contains(&license) {
            return Err(PackError::new("PACK_LICENSE", &[("license", license)]));
        }
    }
    if let Some(perms) = value.get("permissions").and_then(Value::as_object) {
        for (permission, decl) in perms {
            let sites = decl.get("network").and_then(Value::as_array);
            for site in sites.into_iter().flatten().filter_map(Value::as_str) {
                if !site_is_valid(site) {
                    return Err(PackError::new(
                        "PACK_NETWORK_SITE",
                        &[("site", site), ("permission", permission)],
                    ));
                }
            }
        }
    }

    if let Some(err) = validator().iter_errors(&value).next() {
        let pointer = err.instance_path().as_str();
        let pointer = if pointer.is_empty() { "/" } else { pointer };
        return Err(PackError::new(
            "PACK_MANIFEST_SCHEMA",
            &[("pointer", pointer), ("detail", &err.to_string())],
        ));
    }
    let manifest: Manifest = serde_json::from_value(value).map_err(|e| {
        PackError::new(
            "PACK_MANIFEST_SCHEMA",
            &[("pointer", "/"), ("detail", &e.to_string())],
        )
    })?;

    if let Some(min) = &manifest.min_app_version {
        // The schema already checked the format.
        if semver::Version::parse(min).is_ok_and(|min| *app_version < min) {
            return Err(PackError::new(
                "PACK_APP_VERSION",
                &[("minAppVersion", min)],
            ));
        }
    }
    check_settings(&manifest.settings)?;
    Ok(manifest)
}

fn check_settings(settings: &[Setting]) -> PackResult<()> {
    let mut keys = HashSet::new();
    for s in settings {
        let fail =
            |detail: &str| PackError::new("PACK_SETTINGS", &[("key", &s.key), ("detail", detail)]);
        if !keys.insert(s.key.as_str()) {
            return Err(fail("the key is used by another setting"));
        }
        match &s.kind {
            SettingKind::Toggle { .. } => {}
            SettingKind::Select { options, default } => {
                let mut values = HashSet::new();
                if !options.iter().all(|o| values.insert(o.value.as_str())) {
                    return Err(fail("option values must be unique"));
                }
                if default
                    .as_ref()
                    .is_some_and(|d| !values.contains(d.as_str()))
                {
                    return Err(fail("default must be one of the options"));
                }
            }
            SettingKind::Number {
                min, max, default, ..
            } => {
                if let (Some(min), Some(max)) = (min, max) {
                    if min > max {
                        return Err(fail("min must not be greater than max"));
                    }
                }
                if let Some(d) = default {
                    if min.is_some_and(|m| *d < m) || max.is_some_and(|m| *d > m) {
                        return Err(fail("default must be within min and max"));
                    }
                }
            }
            SettingKind::Text {
                max_length,
                default,
                ..
            } => {
                let limit = max_length.unwrap_or(200) as usize;
                if default.as_ref().is_some_and(|d| d.chars().count() > limit) {
                    return Err(fail("default is longer than maxLength"));
                }
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn app() -> semver::Version {
        semver::Version::new(1, 0, 0)
    }

    fn manifest(extra: Value) -> Vec<u8> {
        let mut m = serde_json::json!({
            "apiVersion": 1,
            "id": "com.example.t",
            "name": "T",
            "version": "1.0.0",
            "author": { "name": "A" },
            "license": "AGPL-3.0-only",
            "main": "main.js",
        });
        m.as_object_mut()
            .unwrap()
            .extend(extra.as_object().unwrap().clone());
        serde_json::to_vec(&m).unwrap()
    }

    #[test]
    fn sites() {
        for ok in [
            "https://api.notion.com",
            "https://a.example.co.uk:8443",
            "https://x.io",
        ] {
            assert!(site_is_valid(ok), "{ok}");
        }
        for bad in [
            "http://api.example.com",
            "https://*.example.com",
            "https://localhost",
            "https://127.0.0.1",
            "https://api.example.com/",
            "https://user@api.example.com",
            "https://API.example.com",
            "https://example.com:99999",
        ] {
            assert!(!site_is_valid(bad), "{bad}");
        }
    }

    #[test]
    fn min_app_version() {
        let m = manifest(serde_json::json!({ "minAppVersion": "2.0.0" }));
        assert_eq!(parse(&m, &app()).unwrap_err().code, "PACK_APP_VERSION");
        let m = manifest(serde_json::json!({ "minAppVersion": "0.9.0" }));
        assert!(parse(&m, &app()).is_ok());
    }

    #[test]
    fn text_default_respects_default_max_length() {
        let m = manifest(serde_json::json!({ "settings": [
            { "key": "t", "type": "text", "label": "T", "default": "x".repeat(201) },
        ]}));
        assert_eq!(parse(&m, &app()).unwrap_err().code, "PACK_SETTINGS");
    }
}
