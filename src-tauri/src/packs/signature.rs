//! Signatures, the ✓ Verified badge, and the revocation list.
//!
//! A Verified pack ships `files.json.minisig`: a minisign (Ed25519) signature
//! over the exact bytes of its `files.json`, made with OmniShip's key, whose
//! trusted comment names the pack's id, version and pack hash. Everything is
//! checked offline against public keys compiled into the app, the same way
//! the updater checks releases. Spec: `spec/packs/FORMAT.md`, "Signature".

use super::error::{PackError, PackResult};
use super::validate::{ValidatedBundle, ValidatedPack};
use minisign_verify::{PublicKey, Signature};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::OnceLock;

/// OmniShip's pack-signing public keys (minisign, base64): a main key and an
/// offline backup, so a key rotation doesn't need an emergency release.
///
/// Both are `None` until the keys are generated (a maintainer task in #118;
/// the private keys never go in this repo or CI). Until then no pack can be
/// Verified: every pack installs as Community.
pub const TRUSTED_KEYS: [(&str, Option<&str>); 2] = [("main", None), ("backup", None)];

/// The blocked-pack list shipped with this build, and its signature.
const REVOKED_JSON: &str = include_str!("revoked.json");
const REVOKED_SIGNATURE: &str = include_str!("revoked.json.minisig");
pub const REVOCATIONS_COMMENT: &str = "eyeread.in pack revocations";

/// The trusted comment a pack's signature must carry.
pub fn trusted_comment(id: &str, version: &str, pack_hash: &str) -> String {
    format!("eyeread.in pack {id}@{version} {pack_hash}")
}

/// Public keys a signature may come from, by name.
pub struct Keyring {
    keys: Vec<(String, PublicKey)>,
}

impl Keyring {
    pub fn new(keys: &[(&str, &str)]) -> Result<Self, String> {
        let keys = keys
            .iter()
            .map(|(name, b64)| {
                PublicKey::from_base64(b64)
                    .map(|k| (name.to_string(), k))
                    .map_err(|e| format!("pack key {name}: {e}"))
            })
            .collect::<Result<_, _>>()?;
        Ok(Keyring { keys })
    }

    /// The keys compiled into this build.
    pub fn embedded() -> &'static Keyring {
        static KEYRING: OnceLock<Keyring> = OnceLock::new();
        KEYRING.get_or_init(|| {
            let keys: Vec<(&str, &str)> = TRUSTED_KEYS
                .iter()
                .filter_map(|(name, key)| Some((*name, (*key)?)))
                .collect();
            Keyring::new(&keys).expect("embedded pack keys are valid")
        })
    }

    /// The name of the key that made `signature` over `data`, if any did.
    fn verify(&self, data: &[u8], signature: &Signature) -> Option<&str> {
        self.keys
            .iter()
            .find(|(_, key)| key.verify(data, signature, false).is_ok())
            .map(|(name, _)| name.as_str())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Revocation {
    pub pack_hash: String,
    pub id: String,
    pub version: String,
    /// Shown to the user.
    pub reason: String,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct RevocationList {
    pub format: u32,
    pub revoked: Vec<Revocation>,
}

impl RevocationList {
    /// Parse a list and check its signature (trusted comment
    /// `eyeread.in pack revocations`). An empty list needs no signature.
    pub fn load(json: &str, signature: &str, keys: &Keyring) -> Result<Self, String> {
        let list: RevocationList =
            serde_json::from_str(json).map_err(|e| format!("revocation list: {e}"))?;
        if list.revoked.is_empty() {
            return Ok(list);
        }
        let sig = Signature::decode(signature.trim())
            .map_err(|e| format!("revocation list signature: {e}"))?;
        if sig.trusted_comment() != REVOCATIONS_COMMENT
            || keys.verify(json.as_bytes(), &sig).is_none()
        {
            return Err("revocation list signature doesn't verify".into());
        }
        Ok(list)
    }

    /// The list compiled into this build. If it doesn't verify, nothing is
    /// revoked and the problem is logged (a unit test keeps that from
    /// shipping).
    pub fn embedded() -> &'static RevocationList {
        static LIST: OnceLock<RevocationList> = OnceLock::new();
        LIST.get_or_init(|| {
            RevocationList::load(REVOKED_JSON, REVOKED_SIGNATURE, Keyring::embedded())
                .unwrap_or_else(|e| {
                    eprintln!("[packs] {e}");
                    RevocationList::default()
                })
        })
    }

    pub fn find(&self, pack_hash: &str) -> Option<&Revocation> {
        self.revoked.iter().find(|r| r.pack_hash == pack_hash)
    }
}

/// One pack's signature check.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum Verification {
    /// Signed by a trusted key, and not revoked.
    Verified { key: String },
    /// No signature: installable, with a warning.
    Community,
    /// A signature is present but doesn't match: treated as tampering.
    Invalid { reason: String },
    /// On the revocation list.
    Revoked { reason: String },
}

/// Check one pack against `keys` and `revoked`.
pub fn verify_pack(pack: &ValidatedPack, keys: &Keyring, revoked: &RevocationList) -> Verification {
    if let Some(r) = revoked.find(&pack.pack_hash) {
        return Verification::Revoked {
            reason: r.reason.clone(),
        };
    }
    let Some(sig_bytes) = &pack.signature else {
        return Verification::Community;
    };
    let invalid = |reason: &str| Verification::Invalid {
        reason: reason.into(),
    };
    let Some(files_json) = &pack.shipped_files_json else {
        return invalid("files.json.minisig is present but files.json isn't");
    };
    let Ok(sig) = std::str::from_utf8(sig_bytes)
        .map_err(|_| ())
        .and_then(|s| Signature::decode(s.trim()).map_err(|_| ()))
    else {
        return invalid("files.json.minisig isn't a minisign signature");
    };
    let m = &pack.manifest;
    if sig.trusted_comment() != trusted_comment(&m.id, &m.version, &pack.pack_hash) {
        return invalid("the signature belongs to a different pack or version");
    }
    match keys.verify(files_json, &sig) {
        Some(key) => Verification::Verified { key: key.into() },
        None => invalid("the signature doesn't match eyeread.in's keys"),
    }
}

/// The badge each pack in a bundle gets: Verified only if the pack and every
/// pack it includes (at any depth) verify.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BundleVerification {
    pub packs: HashMap<String, Verification>,
    pub verified: HashMap<String, bool>,
}

impl BundleVerification {
    pub fn is_verified(&self, id: &str) -> bool {
        self.verified.get(id).copied().unwrap_or(false)
    }
}

/// Step 10 of the check order: a bad signature or a revoked pack stops the
/// install. Returns each pack's result and badge.
pub fn check_bundle(
    bundle: &ValidatedBundle,
    keys: &Keyring,
    revoked: &RevocationList,
) -> PackResult<BundleVerification> {
    let mut packs = HashMap::new();
    for pack in bundle.all() {
        let result = verify_pack(pack, keys, revoked);
        let folder = if std::ptr::eq(pack, &bundle.top) {
            String::new()
        } else {
            format!("packs/{}/", pack.manifest.id)
        };
        match &result {
            Verification::Invalid { .. } => {
                return Err(PackError::new("PACK_SIGNATURE_INVALID", &[]).in_folder(&folder))
            }
            Verification::Revoked { reason } => {
                return Err(PackError::new("PACK_REVOKED", &[("reason", reason)]).in_folder(&folder))
            }
            _ => {}
        }
        packs.insert(pack.manifest.id.clone(), result);
    }

    // Verified = self verified and everything below verified. The graph was
    // checked for cycles during validation, so the recursion ends.
    let by_id: HashMap<&str, &ValidatedPack> =
        bundle.all().map(|p| (p.manifest.id.as_str(), p)).collect();
    fn resolve(
        id: &str,
        by_id: &HashMap<&str, &ValidatedPack>,
        packs: &HashMap<String, Verification>,
        memo: &mut HashMap<String, bool>,
    ) -> bool {
        if let Some(v) = memo.get(id) {
            return *v;
        }
        let own = matches!(packs.get(id), Some(Verification::Verified { .. }));
        let below = by_id.get(id).is_some_and(|p| {
            p.manifest
                .includes
                .iter()
                .all(|i| resolve(&i.id, by_id, packs, memo))
        });
        memo.insert(id.into(), own && below);
        own && below
    }
    let mut verified = HashMap::new();
    for pack in bundle.all() {
        resolve(&pack.manifest.id, &by_id, &packs, &mut verified);
    }
    Ok(BundleVerification { packs, verified })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedded_revocation_list_is_empty_or_signed() {
        // An unsigned or wrongly signed list would be ignored at runtime, so
        // it must never ship.
        let list = RevocationList::load(REVOKED_JSON, REVOKED_SIGNATURE, Keyring::embedded());
        assert!(list.is_ok(), "{}", list.unwrap_err());
    }

    #[test]
    fn embedded_keys_parse() {
        let _ = Keyring::embedded();
    }
}
