//! Signature checks end to end: packs are signed with throwaway test keys by
//! the same signer the `sign-pack` tool uses, zipped, read back and verified.
//! No real key is involved anywhere.

use super::archive::write_zip;
use super::archive::{self, Entry};
use super::signature::{
    check_bundle, verify_pack, Keyring, Revocation, RevocationKind, RevocationList, Verification,
};
use super::signer::{sign_pack, sign_revocations, sign_signature_only};
use super::store::tests::pack_entries;
use super::store::PackStore;
use super::validate::{validate_entries, ValidatedBundle};
use minisign::KeyPair;
use std::collections::BTreeSet;

fn app() -> semver::Version {
    semver::Version::new(1, 0, 0)
}

struct Keys {
    main: KeyPair,
    backup: KeyPair,
}

impl Keys {
    fn new() -> Self {
        Keys {
            main: KeyPair::generate_unencrypted_keypair().unwrap(),
            backup: KeyPair::generate_unencrypted_keypair().unwrap(),
        }
    }

    /// The keyring the app would embed: main and backup.
    fn keyring(&self) -> Keyring {
        Keyring::new(&[
            ("main", &self.main.pk.to_base64()),
            ("backup", &self.backup.pk.to_base64()),
        ])
        .unwrap()
    }
}

fn sign(entries: Vec<Entry>, key: &KeyPair) -> Vec<Entry> {
    let zip = sign_pack(entries, &key.sk, Some(&key.pk), &app()).unwrap();
    archive::read_zip(&zip).unwrap()
}

fn validate(entries: Vec<Entry>) -> ValidatedBundle {
    validate_entries(entries, &app()).unwrap()
}

fn simple(id: &str) -> Vec<Entry> {
    pack_entries(id, "1.0.0", &[], &format!("// {id}\n"))
}

fn replace(entries: &mut [Entry], path: &str, bytes: Vec<u8>) {
    entries.iter_mut().find(|e| e.path == path).unwrap().bytes = bytes;
}

fn file<'a>(entries: &'a [Entry], path: &str) -> &'a [u8] {
    &entries.iter().find(|e| e.path == path).unwrap().bytes
}

fn none() -> RevocationList {
    RevocationList::default()
}

#[test]
fn valid_signature_is_verified() {
    let keys = Keys::new();
    let bundle = validate(sign(simple("com.example.a"), &keys.main));
    assert_eq!(
        verify_pack(&bundle.top, &keys.keyring(), &none()),
        Verification::Verified { key: "main".into() }
    );
    let checks = check_bundle(&bundle, &keys.keyring(), &none()).unwrap();
    assert!(checks.is_verified("com.example.a"));
}

#[test]
fn backup_key_is_accepted() {
    let keys = Keys::new();
    let bundle = validate(sign(simple("com.example.a"), &keys.backup));
    assert_eq!(
        verify_pack(&bundle.top, &keys.keyring(), &none()),
        Verification::Verified {
            key: "backup".into()
        }
    );
}

#[test]
fn unknown_key_is_invalid() {
    let keys = Keys::new();
    let stranger = KeyPair::generate_unencrypted_keypair().unwrap();
    let bundle = validate(sign(simple("com.example.a"), &stranger));
    assert!(matches!(
        verify_pack(&bundle.top, &keys.keyring(), &none()),
        Verification::Invalid { .. }
    ));
    let err = check_bundle(&bundle, &keys.keyring(), &none()).unwrap_err();
    assert_eq!(err.code, "PACK_SIGNATURE_INVALID");
}

#[test]
fn unsigned_pack_is_community() {
    let keys = Keys::new();
    let bundle = validate(simple("com.example.a"));
    assert_eq!(
        verify_pack(&bundle.top, &keys.keyring(), &none()),
        Verification::Community
    );
    let checks = check_bundle(&bundle, &keys.keyring(), &none()).unwrap();
    assert!(!checks.is_verified("com.example.a"));
}

#[test]
fn tampered_file_breaks_the_signature() {
    let keys = Keys::new();
    let mut signed = sign(simple("com.example.a"), &keys.main);

    // Edit a file only: files.json no longer matches, so validation fails.
    replace(&mut signed, "main.js", b"// evil\n".to_vec());
    assert_eq!(
        validate_entries(signed.clone(), &app()).unwrap_err().code,
        "PACK_FILES_MISMATCH"
    );

    // Edit a file and rewrite files.json to match: the signature fails.
    let files = super::files_list::FilesList::compute(
        "com.example.a",
        "1.0.0",
        &signed
            .iter()
            .filter(|e| e.path != "files.json")
            .cloned()
            .collect::<Vec<_>>(),
    );
    replace(&mut signed, "files.json", files.canonical_bytes());
    let bundle = validate(signed);
    assert!(matches!(
        verify_pack(&bundle.top, &keys.keyring(), &none()),
        Verification::Invalid { .. }
    ));
}

#[test]
fn signature_copied_onto_another_pack_is_invalid() {
    let keys = Keys::new();
    let a = sign(simple("com.example.a"), &keys.main);

    // Same files.json and signature moved onto a different pack (b).
    let mut b = simple("com.example.b");
    b.push(Entry {
        path: "files.json.minisig".into(),
        bytes: file(&a, "files.json.minisig").to_vec(),
    });
    let bundle = validate(b.clone());
    assert!(matches!(
        verify_pack(&bundle.top, &keys.keyring(), &none()),
        Verification::Invalid { .. }
    ));

    // Also with a's files.json alongside: it names a different id, so the
    // pack is rejected before the signature is even checked.
    b.push(Entry {
        path: "files.json".into(),
        bytes: file(&a, "files.json").to_vec(),
    });
    assert_eq!(
        validate_entries(b, &app()).unwrap_err().code,
        "PACK_FILES_JSON_INVALID"
    );

    // A new version of the same pack can't reuse the old signature either.
    let mut v2 = pack_entries("com.example.a", "1.1.0", &[], "// com.example.a\n");
    v2.push(Entry {
        path: "files.json.minisig".into(),
        bytes: file(&a, "files.json.minisig").to_vec(),
    });
    let bundle = validate(v2);
    assert!(matches!(
        verify_pack(&bundle.top, &keys.keyring(), &none()),
        Verification::Invalid { .. }
    ));
}

#[test]
fn revoked_hash_blocks_install_and_disables_installed_pack() {
    let keys = Keys::new();
    let bundle = validate(sign(simple("com.example.a"), &keys.main));
    let list = RevocationList {
        format: 1,
        revoked: vec![Revocation {
            kind: RevocationKind::Block,
            pack_hash: bundle.top.pack_hash.clone(),
            id: "com.example.a".into(),
            version: "1.0.0".into(),
            reason: "Collected data it didn't declare.".into(),
        }],
    };
    assert_eq!(
        verify_pack(&bundle.top, &keys.keyring(), &list),
        Verification::Revoked {
            reason: "Collected data it didn't declare.".into()
        }
    );
    let err = check_bundle(&bundle, &keys.keyring(), &list).unwrap_err();
    assert_eq!(err.code, "PACK_REVOKED");
    assert_eq!(
        err.message,
        "eyeread.in has blocked this pack: Collected data it didn't declare."
    );

    // Already installed (the list arrived with an app update): disabled at
    // launch, badge removed, reason kept, and it can't be switched back on.
    let tmp = tempfile::tempdir().unwrap();
    let mut store = PackStore::open(tmp.path()).unwrap();
    let verified: BTreeSet<String> = ["com.example.a".to_string()].into();
    store.install(&bundle, &verified).unwrap();
    assert!(store.get("com.example.a").unwrap().verified);
    assert_eq!(store.apply_revocations(&list).unwrap(), ["com.example.a"]);
    let a = store.get("com.example.a").unwrap();
    assert!(!a.enabled && !a.verified);
    assert_eq!(a.status, super::store::PackStatus::Revoked);
    assert_eq!(
        a.status_reason.as_deref(),
        Some("Collected data it didn't declare.")
    );
    assert!(store.set_enabled("com.example.a", true).is_err());
}

#[test]
fn bundle_is_verified_only_if_every_pack_is() {
    let keys = Keys::new();
    let parts = [("com.example.x", "1.0.0"), ("com.example.y", "1.0.0")];
    let mut entries = pack_entries("com.example.bundle", "1.0.0", &parts, "// b\n");
    for (id, v) in parts {
        for e in pack_entries(id, v, &[], &format!("// {id}\n")) {
            entries.push(Entry {
                path: format!("packs/{id}/{}", e.path),
                bytes: e.bytes,
            });
        }
    }
    // The tool signs the bundle and every included pack.
    let signed = sign(entries.clone(), &keys.main);
    let checks = check_bundle(&validate(signed.clone()), &keys.keyring(), &none()).unwrap();
    for id in ["com.example.bundle", "com.example.x", "com.example.y"] {
        assert!(checks.is_verified(id), "{id}");
    }

    // Drop one included pack's signature: that pack and the bundle become
    // Community; the other included pack keeps its badge.
    let partly: Vec<Entry> = signed
        .into_iter()
        .filter(|e| e.path != "packs/com.example.y/files.json.minisig")
        .collect();
    let checks = check_bundle(&validate(partly), &keys.keyring(), &none()).unwrap();
    assert!(!checks.is_verified("com.example.y"));
    assert!(!checks.is_verified("com.example.bundle"));
    assert!(checks.is_verified("com.example.x"));
}

#[test]
fn signing_tool_round_trips_with_the_verifier() {
    let keys = Keys::new();
    // Re-signing an already signed pack replaces the old signature files.
    let once = sign(simple("com.example.a"), &keys.backup);
    let zip = sign_pack(once, &keys.main.sk, Some(&keys.main.pk), &app()).unwrap();
    let entries = archive::read_zip(&zip).unwrap();
    let signatures = entries
        .iter()
        .filter(|e| e.path == "files.json.minisig")
        .count();
    assert_eq!(signatures, 1);
    let bundle = validate(entries);
    assert_eq!(
        verify_pack(&bundle.top, &keys.keyring(), &none()),
        Verification::Verified { key: "main".into() }
    );
    // The zip the tool writes is an ordinary pack zip.
    assert_eq!(
        archive::read_zip(&write_zip(&bundle.top.entries)).unwrap(),
        bundle.top.entries
    );
}

#[test]
fn revocation_list_must_be_signed_unless_empty() {
    let keys = Keys::new();
    let json = r#"{ "format": 1, "revoked": [{ "packHash": "ab", "id": "com.example.a", "version": "1.0.0", "reason": "r" }] }"#;
    assert!(RevocationList::load(json, "", &keys.keyring()).is_err());
    let sig = sign_revocations(json.as_bytes(), &keys.main.sk, Some(&keys.main.pk)).unwrap();
    let list = RevocationList::load(json, &sig, &keys.keyring()).unwrap();
    assert_eq!(list.revoked.len(), 1);
    // Any edit breaks it.
    let edited = json.replace("\"r\"", "\"x\"");
    assert!(RevocationList::load(&edited, &sig, &keys.keyring()).is_err());
    // A pack signature can't stand in for a list signature.
    let pack_sig = file(
        &sign(simple("com.example.a"), &keys.main),
        "files.json.minisig",
    )
    .to_vec();
    assert!(
        RevocationList::load(json, &String::from_utf8(pack_sig).unwrap(), &keys.keyring()).is_err()
    );
    // The empty list needs no signature.
    assert!(RevocationList::load(r#"{ "format": 1, "revoked": [] }"#, "", &keys.keyring()).is_ok());
}

#[test]
fn embedded_keys_are_both_set_and_valid() {
    use super::signature::TRUSTED_KEYS;
    for (name, key) in TRUSTED_KEYS {
        let key = key.unwrap_or_else(|| panic!("pack key {name} is missing"));
        Keyring::new(&[(name, key)]).unwrap();
    }
    Keyring::embedded();
}

#[test]
fn signature_only_signs_the_reviewed_files_list_and_nothing_else() {
    let keys = Keys::new();
    let entries = simple("com.example.a");
    let reviewed = validate(entries.clone());
    let sig = sign_signature_only(
        entries.clone(),
        &reviewed.top.pack_hash,
        &keys.main.sk,
        Some(&keys.main.pk),
        &app(),
    )
    .unwrap();

    // Added to the zip as files.json.minisig (the creator's step), the pack
    // verifies, and the signature carries the same trusted comment as a
    // fully signed zip.
    let mut shipped = entries.clone();
    shipped.push(Entry {
        path: "files.json".into(),
        bytes: reviewed.top.files.canonical_bytes(),
    });
    shipped.push(Entry {
        path: "files.json.minisig".into(),
        bytes: sig.clone().into_bytes(),
    });
    assert_eq!(
        verify_pack(&validate(shipped).top, &keys.keyring(), &none()),
        Verification::Verified { key: "main".into() }
    );
    let full = sign(entries, &keys.main);
    let comment = |s: &str| s.lines().nth(2).unwrap().to_string();
    assert_eq!(
        comment(&sig),
        comment(std::str::from_utf8(file(&full, "files.json.minisig")).unwrap())
    );
}

#[test]
fn signature_only_refuses_a_different_pack_hash() {
    let keys = Keys::new();
    let err = sign_signature_only(
        simple("com.example.a"),
        "sha256:not-the-reviewed-zip",
        &keys.main.sk,
        None,
        &app(),
    )
    .unwrap_err();
    assert_eq!(err.code, "SIGN_FAILED");
}

#[test]
fn catalog_signature_verifies_a_zip_that_ships_none() {
    let keys = Keys::new();
    let entries = simple("com.example.a");
    let sig = sign_signature_only(
        entries.clone(),
        &validate(entries.clone()).top.pack_hash,
        &keys.main.sk,
        None,
        &app(),
    )
    .unwrap();

    let mut bundle = validate(entries);
    assert_eq!(
        verify_pack(&bundle.top, &keys.keyring(), &none()),
        Verification::Community
    );
    assert!(bundle.attach_signature("com.example.a", sig.into_bytes()));
    assert_eq!(
        verify_pack(&bundle.top, &keys.keyring(), &none()),
        Verification::Verified { key: "main".into() }
    );
    assert!(!bundle.attach_signature("com.example.other", vec![]));
}

#[test]
fn catalog_signature_for_another_version_is_invalid() {
    let keys = Keys::new();
    let old = simple("com.example.a");
    let sig = sign_signature_only(
        old.clone(),
        &validate(old).top.pack_hash,
        &keys.main.sk,
        None,
        &app(),
    )
    .unwrap();

    // A different build of the pack must not pick up this signature.
    let mut other = validate(pack_entries("com.example.a", "1.0.0", &[], "// changed\n"));
    other.attach_signature("com.example.a", sig.into_bytes());
    assert!(matches!(
        verify_pack(&other.top, &keys.keyring(), &none()),
        Verification::Invalid { .. }
    ));
}

#[test]
fn unverify_keeps_the_pack_installable_as_community() {
    let keys = Keys::new();
    let bundle = validate(sign(simple("com.example.a"), &keys.main));
    let list = RevocationList {
        format: 1,
        revoked: vec![Revocation {
            kind: RevocationKind::Unverify,
            pack_hash: bundle.top.pack_hash.clone(),
            id: "com.example.a".into(),
            version: "1.0.0".into(),
            reason: "Source no longer available.".into(),
        }],
    };
    assert_eq!(
        verify_pack(&bundle.top, &keys.keyring(), &list),
        Verification::Unverified {
            reason: "Source no longer available.".into()
        }
    );
    let checks = check_bundle(&bundle, &keys.keyring(), &list).unwrap();
    assert!(!checks.is_verified("com.example.a"));
}

#[test]
fn revocation_without_a_kind_still_blocks() {
    let list: RevocationList = serde_json::from_str(
        r#"{"format":1,"revoked":[{"packHash":"h","id":"a","version":"1","reason":"r"}]}"#,
    )
    .unwrap();
    assert_eq!(list.revoked[0].kind, RevocationKind::Block);
}
