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

pub const PERMISSIONS: [&str; 5] = [
    "scripts:write",
    "prompter:load",
    "prompter:control",
    "prompter:events",
    "files:import",
];

/// The only permission that can carry `input`: input may only drive the
/// prompter.
pub const INPUT_PERMISSION: &str = "prompter:control";

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
    /// Keyboard and mouse input, only on `prompter:control`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input: Option<InputDecl>,
}

/// What a permission's `input` option declares.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct InputDecl {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub keyboard: Option<KeyboardDecl>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mouse: Option<MouseDecl>,
    /// `"focused"` (the default) or `"global"`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scope: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct KeyboardDecl {
    /// Only these `KeyboardEvent.code`s are delivered; empty means all.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub keys: Vec<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct MouseDecl {
    /// Only these buttons are delivered; empty means all.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub buttons: Vec<u8>,
    /// Also deliver wheel scrolls.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub wheel: bool,
    /// Also deliver pointer position.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub position: bool,
}

/// A pack that reaches the internet may also read input only if the input is
/// narrow: at most this many keys and buttons.
pub const NARROW_MAX_KEYS: usize = 8;
pub const NARROW_MAX_BUTTONS: usize = 3;

impl InputDecl {
    /// Why this input is too wide to share a pack (or bundle) with internet
    /// access, or `None` if it's narrow. A narrow input names its keys and
    /// buttons, has no wheel or pointer position, and is focused-only.
    pub fn too_wide(&self) -> Option<String> {
        if let Some(k) = &self.keyboard {
            if k.keys.is_empty() {
                return Some("keyboard needs a keys list".into());
            }
            if k.keys.len() > NARROW_MAX_KEYS {
                return Some(format!("keyboard can list at most {NARROW_MAX_KEYS} keys"));
            }
        }
        if let Some(m) = &self.mouse {
            if m.buttons.is_empty() {
                return Some("mouse needs a buttons list".into());
            }
            if m.buttons.len() > NARROW_MAX_BUTTONS {
                return Some(format!(
                    "mouse can list at most {NARROW_MAX_BUTTONS} buttons"
                ));
            }
            if m.wheel {
                return Some("mouse can't ask for the wheel".into());
            }
            if m.position {
                return Some("mouse can't ask for pointer position".into());
            }
        }
        if self.scope.as_deref() == Some("global") {
            return Some("scope can't be global".into());
        }
        None
    }
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
    /// A key the user picks, stored as a `KeyboardEvent.code` (or `""`).
    Key {
        #[serde(default, skip_serializing_if = "Option::is_none")]
        default: Option<String>,
    },
}

/// A `KeyboardEvent.code` value: letters and digits only, up to 32.
pub fn is_key_code(s: &str) -> bool {
    s.len() <= 32 && s.chars().all(|c| c.is_ascii_alphanumeric())
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

impl Setting {
    /// The value used until the user changes it (spec: "Default when omitted").
    pub fn default_value(&self) -> Value {
        match &self.kind {
            SettingKind::Toggle { default } => Value::Bool(default.unwrap_or(false)),
            SettingKind::Select { options, default } => Value::String(
                default
                    .clone()
                    .or_else(|| options.first().map(|o| o.value.clone()))
                    .unwrap_or_default(),
            ),
            SettingKind::Number { min, default, .. } => {
                serde_json::json!(default.or(*min).unwrap_or(0.0))
            }
            SettingKind::Text { default, .. } | SettingKind::Key { default } => {
                Value::String(default.clone().unwrap_or_default())
            }
        }
    }

    /// Check a value the user set against this setting's type and limits.
    pub fn check_value(&self, value: &Value) -> Result<Value, &'static str> {
        match (&self.kind, value) {
            (SettingKind::Toggle { .. }, Value::Bool(_)) => Ok(value.clone()),
            (SettingKind::Select { options, .. }, Value::String(v)) => options
                .iter()
                .any(|o| o.value == *v)
                .then(|| value.clone())
                .ok_or("not one of the options"),
            (SettingKind::Number { min, max, .. }, Value::Number(n)) => {
                let n = n.as_f64().ok_or("not a number")?;
                if min.is_some_and(|m| n < m) || max.is_some_and(|m| n > m) {
                    return Err("out of range");
                }
                Ok(value.clone())
            }
            (SettingKind::Text { max_length, .. }, Value::String(v)) => {
                if v.chars().count() > max_length.unwrap_or(200) as usize {
                    return Err("too long");
                }
                Ok(value.clone())
            }
            (SettingKind::Key { .. }, Value::String(v)) => {
                if is_key_code(v) {
                    Ok(value.clone())
                } else {
                    Err("not a key")
                }
            }
            _ => Err("wrong type"),
        }
    }
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
/// network sites, the schema, then app version and settings.
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

    if let Some(perms) = value.get("permissions").and_then(Value::as_object) {
        for (permission, decl) in perms {
            check_permission_options(permission, decl)?;
        }
        check_input_pack(perms)?;
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

/// `input` belongs to `prompter:control` only, and needs keyboard or mouse. The
/// schema can't say the first, and its message for the second prints the whole
/// object.
fn check_permission_options(permission: &str, decl: &Value) -> PackResult<()> {
    let Some(decl) = decl.as_object() else {
        return Ok(());
    };
    if !decl.contains_key("input") {
        return Ok(());
    }
    if permission != INPUT_PERMISSION {
        return Err(PackError::new(
            "PACK_PERMISSION_OPTION",
            &[("permission", permission), ("option", "input")],
        ));
    }
    // The schema says this too (`anyOf`), but its message would print the
    // whole object; this one names the field.
    let has_source = decl["input"]
        .as_object()
        .is_some_and(|i| i.contains_key("keyboard") || i.contains_key("mouse"));
    if decl["input"].is_object() && !has_source {
        return Err(PackError::new(
            "PACK_MANIFEST_SCHEMA",
            &[
                ("pointer", &format!("/permissions/{permission}/input")),
                ("detail", "needs keyboard or mouse"),
            ],
        ));
    }
    Ok(())
}

/// A pack that declares `network` anywhere can read input only if the input
/// is narrow (`InputDecl::too_wide`). The sandbox split alone isn't enough to
/// keep input in: sandboxes share app state (the prompter's position), so
/// input could be encoded into state and read back out by a sandbox that has
/// `net`. Narrow input leaks next to nothing. (The same goes for every pack it
/// includes; `validate.rs` checks that once the bundle is read.)
fn check_input_pack(perms: &serde_json::Map<String, Value>) -> PackResult<()> {
    let has_sites = |decl: &Value| {
        decl.get("network")
            .and_then(Value::as_array)
            .is_some_and(|sites| !sites.is_empty())
    };
    if !perms.values().any(has_sites) {
        return Ok(());
    }
    for decl in perms.values() {
        let Some(input) = decl.get("input") else {
            continue;
        };
        // A declaration the schema would reject is reported by the schema.
        let Ok(input) = serde_json::from_value::<InputDecl>(input.clone()) else {
            continue;
        };
        if let Some(reason) = input.too_wide() {
            return Err(PackError::new(
                "PACK_INPUT_PACK_NETWORK",
                &[("reason", &reason)],
            ));
        }
    }
    Ok(())
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
            SettingKind::Toggle { .. } | SettingKind::Key { .. } => {}
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

    fn perms(v: Value) -> Vec<u8> {
        manifest(serde_json::json!({ "permissions": v }))
    }

    #[test]
    fn input_parses_on_prompter_control() {
        let m = parse(
            &perms(serde_json::json!({
                "prompter:control": { "input": {
                    "keyboard": { "keys": ["ArrowRight", "Space"] },
                    "mouse": { "buttons": [3, 4], "position": true },
                    "scope": "global",
                } },
            })),
            &app(),
        )
        .unwrap();
        let input = m.permissions["prompter:control"].input.as_ref().unwrap();
        assert_eq!(
            input.keyboard.as_ref().unwrap().keys,
            ["ArrowRight", "Space"]
        );
        assert_eq!(input.mouse.as_ref().unwrap().buttons, [3, 4]);
        assert!(input.mouse.as_ref().unwrap().position);
        assert_eq!(input.scope.as_deref(), Some("global"));
    }

    #[test]
    fn input_belongs_to_prompter_control_only() {
        for p in [
            "scripts:write",
            "prompter:load",
            "prompter:events",
            "files:import",
        ] {
            let m = perms(serde_json::json!({ p: { "input": { "keyboard": {} } } }));
            assert_eq!(
                parse(&m, &app()).unwrap_err().code,
                "PACK_PERMISSION_OPTION",
                "{p}"
            );
        }
    }

    #[test]
    fn input_and_network_can_share_a_permission_when_the_input_is_narrow() {
        let ok = perms(serde_json::json!({ "prompter:control": {
            "input": { "keyboard": { "keys": ["ArrowRight"] } },
            "network": ["https://api.example.com"],
        } }));
        assert!(parse(&ok, &app()).is_ok());
        let wide = perms(serde_json::json!({ "prompter:control": {
            "input": { "keyboard": {} }, "network": ["https://api.example.com"],
        } }));
        assert_eq!(
            parse(&wide, &app()).unwrap_err().code,
            "PACK_INPUT_PACK_NETWORK"
        );
    }

    fn with_net(input: Value) -> Vec<u8> {
        perms(serde_json::json!({
            "prompter:control": { "input": input },
            "scripts:write": { "network": ["https://api.notion.com"] },
        }))
    }

    fn narrow_reason(input: Value) -> Option<String> {
        parse(&with_net(input), &app()).err().map(|e| {
            assert_eq!(e.code, "PACK_INPUT_PACK_NETWORK");
            e.message
        })
    }

    #[test]
    fn narrow_input_can_share_a_pack_with_network() {
        let keys = |n: usize| -> Vec<String> { (0..n).map(|i| format!("F{}", i + 1)).collect() };
        assert!(narrow_reason(serde_json::json!({ "keyboard": { "keys": keys(1) } })).is_none());
        assert!(narrow_reason(serde_json::json!({ "keyboard": { "keys": keys(8) } })).is_none());
        assert!(narrow_reason(serde_json::json!({ "mouse": { "buttons": [0, 3, 4] } })).is_none());
        assert!(narrow_reason(serde_json::json!({
            "keyboard": { "keys": ["ArrowRight"] }, "mouse": { "buttons": [3] }, "scope": "focused",
        }))
        .is_none());
        // No network: any input is fine.
        let wide =
            serde_json::json!({ "keyboard": {}, "mouse": { "wheel": true, "position": true } });
        let m = perms(serde_json::json!({ "prompter:control": { "input": wide } }));
        assert!(parse(&m, &app()).is_ok());
    }

    #[test]
    fn wide_input_with_network_says_which_limit_it_broke() {
        let keys = |n: usize| -> Vec<String> { (0..n).map(|i| format!("F{}", i + 1)).collect() };
        for (input, says) in [
            (
                serde_json::json!({ "keyboard": {} }),
                "keyboard needs a keys list",
            ),
            (
                serde_json::json!({ "keyboard": { "keys": keys(9) } }),
                "at most 8 keys",
            ),
            (
                serde_json::json!({ "mouse": {} }),
                "mouse needs a buttons list",
            ),
            (
                serde_json::json!({ "mouse": { "buttons": [0, 1, 2, 3] } }),
                "at most 3 buttons",
            ),
            (
                serde_json::json!({ "mouse": { "buttons": [0], "wheel": true } }),
                "the wheel",
            ),
            (
                serde_json::json!({ "mouse": { "buttons": [0], "position": true } }),
                "pointer position",
            ),
            (
                serde_json::json!({ "keyboard": { "keys": ["Space"] }, "scope": "global" }),
                "scope can't be global",
            ),
        ] {
            let message = narrow_reason(input.clone()).unwrap_or_else(|| panic!("{input} passed"));
            assert!(message.contains(says), "{message}");
        }
    }

    #[test]
    fn bad_input_declarations_fail_the_schema() {
        for input in [
            serde_json::json!({ "keyboard": { "keys": ["Not A Key"] } }),
            serde_json::json!({ "keyboard": { "keys": ["KeyA", "KeyA"] } }),
            serde_json::json!({ "keyboard": {}, "scope": "everywhere" }),
            serde_json::json!({ "mouse": { "buttons": [5] } }),
            serde_json::json!({ "scope": "global" }),
            serde_json::json!({ "keyboard": {}, "midi": {} }),
            serde_json::json!({}),
        ] {
            let m = perms(serde_json::json!({ "prompter:control": { "input": input } }));
            assert_eq!(parse(&m, &app()).unwrap_err().code, "PACK_MANIFEST_SCHEMA");
        }
    }

    #[test]
    fn key_settings() {
        let m = parse(
            &manifest(serde_json::json!({ "settings": [
                { "key": "next", "type": "key", "label": "Next", "default": "ArrowRight" },
                { "key": "back", "type": "key", "label": "Back" },
            ]})),
            &app(),
        )
        .unwrap();
        assert_eq!(
            m.settings[0].default_value(),
            serde_json::json!("ArrowRight")
        );
        assert_eq!(m.settings[1].default_value(), serde_json::json!(""));
        assert!(m.settings[0]
            .check_value(&serde_json::json!("KeyN"))
            .is_ok());
        assert!(m.settings[0].check_value(&serde_json::json!("")).is_ok());
        assert!(m.settings[0]
            .check_value(&serde_json::json!("not a key"))
            .is_err());
        assert!(m.settings[0].check_value(&serde_json::json!(5)).is_err());
        let bad = manifest(serde_json::json!({ "settings": [
            { "key": "k", "type": "key", "label": "K", "default": "Not A Key" },
        ]}));
        assert_eq!(
            parse(&bad, &app()).unwrap_err().code,
            "PACK_MANIFEST_SCHEMA"
        );
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
