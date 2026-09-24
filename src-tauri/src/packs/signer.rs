//! Signing reviewed packs, for OmniShip's `sign-pack` tool
//! (`src/bin/sign-pack.rs`). Not part of the app: it's built only with the
//! `pack-signing` feature, and for tests.
//!
//! Signing validates the pack exactly as the installer would, writes each
//! pack's canonical `files.json`, signs it with the trusted comment the
//! verifier expects, and returns a new zip with the signatures inside.

use super::archive::{Entry, FILES_JSON, SIGNATURE_FILE};
use super::error::{PackError, PackResult};
use super::signature::{trusted_comment, REVOCATIONS_COMMENT};
use super::validate::validate_entries;
use minisign::{PublicKey, SecretKey};
use std::io::{Cursor, Write};
use zip::write::SimpleFileOptions;

const UNTRUSTED_COMMENT: &str = "signature from eyeread.in sign-pack";

fn sign_bytes(
    data: &[u8],
    comment: &str,
    sk: &SecretKey,
    pk: Option<&PublicKey>,
) -> PackResult<String> {
    minisign::sign(
        pk,
        sk,
        Cursor::new(data),
        Some(comment),
        Some(UNTRUSTED_COMMENT),
    )
    .map(|sig| sig.into_string())
    .map_err(|e| PackError::install("SIGN_FAILED", e.to_string()))
}

/// Is `path` a `files.json` or signature at the root of the pack or of an
/// included pack? Those are replaced when signing.
fn is_old_signature_file(path: &str) -> bool {
    let root_file = match path.strip_prefix("packs/") {
        Some(rest) => rest.split_once('/').map(|(_, inner)| inner),
        None => Some(path),
    };
    matches!(root_file, Some(FILES_JSON) | Some(SIGNATURE_FILE))
}

pub fn write_zip(entries: &[Entry]) -> Vec<u8> {
    let mut zip = zip::ZipWriter::new(Cursor::new(Vec::new()));
    let mut sorted: Vec<&Entry> = entries.iter().collect();
    sorted.sort_by(|a, b| a.path.cmp(&b.path));
    for e in sorted {
        zip.start_file(e.path.as_str(), SimpleFileOptions::default())
            .expect("zip entry");
        zip.write_all(&e.bytes).expect("zip write");
    }
    zip.finish().expect("zip finish").into_inner()
}

/// Sign a pack and every pack it includes. `entries` are the reviewed pack's
/// files (from a zip or folder, already through the archive checks). Returns
/// the signed pack as zip bytes.
pub fn sign_pack(
    entries: Vec<Entry>,
    sk: &SecretKey,
    pk: Option<&PublicKey>,
    app_version: &semver::Version,
) -> PackResult<Vec<u8>> {
    let mut entries: Vec<Entry> = entries
        .into_iter()
        .filter(|e| !is_old_signature_file(&e.path))
        .collect();
    let bundle = validate_entries(entries.clone(), app_version)?;
    for pack in bundle.all() {
        let folder = if std::ptr::eq(pack, &bundle.top) {
            String::new()
        } else {
            format!("packs/{}/", pack.manifest.id)
        };
        let files_json = pack.files.canonical_bytes();
        let m = &pack.manifest;
        let signature = sign_bytes(
            &files_json,
            &trusted_comment(&m.id, &m.version, &pack.pack_hash),
            sk,
            pk,
        )?;
        entries.push(Entry {
            path: format!("{folder}{FILES_JSON}"),
            bytes: files_json,
        });
        entries.push(Entry {
            path: format!("{folder}{SIGNATURE_FILE}"),
            bytes: signature.into_bytes(),
        });
    }
    Ok(write_zip(&entries))
}

/// Sign a revocation list (`src/packs/revoked.json`). Returns the contents of
/// `revoked.json.minisig`.
pub fn sign_revocations(json: &[u8], sk: &SecretKey, pk: Option<&PublicKey>) -> PackResult<String> {
    serde_json::from_slice::<super::signature::RevocationList>(json)
        .map_err(|e| PackError::install("SIGN_FAILED", format!("revocation list: {e}")))?;
    sign_bytes(json, REVOCATIONS_COMMENT, sk, pk)
}
