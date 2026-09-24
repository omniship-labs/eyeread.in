//! sign-pack: OmniShip's tool for signing reviewed packs (and the revocation
//! list). Run it on an offline machine that holds the key; the private key
//! never goes in the repo or CI.
//!
//!   cargo run --features pack-signing --bin sign-pack -- \
//!       --secret-key <file> [--public-key <file>] <pack.zip | folder> <signed.zip>
//!
//!   cargo run --features pack-signing --bin sign-pack -- \
//!       --secret-key <file> [--public-key <file>] --revocations src/packs/revoked.json
//!
//! Keys are standard minisign key files (`minisign -G`). An encrypted secret
//! key prompts for its password. With `--public-key`, the output is checked
//! with the same verifier the app uses before the tool reports success.

use eyeread_lib::pack_signing::{archive, signature, validate};
use std::path::{Path, PathBuf};
use std::process::ExitCode;

struct Args {
    /// Path of the minisign secret key file (the path itself isn't secret).
    key_file: PathBuf,
    public_key: Option<PathBuf>,
    revocations: Option<PathBuf>,
    positional: Vec<PathBuf>,
}

const USAGE: &str = "usage:
  sign-pack --secret-key <file> [--public-key <file>] <pack.zip | folder> <signed.zip>
  sign-pack --secret-key <file> [--public-key <file>] --revocations <revoked.json>";

fn parse_args() -> Result<Args, String> {
    let mut key_file = None;
    let mut public_key = None;
    let mut revocations = None;
    let mut positional = Vec::new();
    let mut args = std::env::args_os().skip(1);
    while let Some(arg) = args.next() {
        let mut value = |name: &str| {
            args.next()
                .map(PathBuf::from)
                .ok_or(format!("{name} needs a value"))
        };
        match arg.to_str() {
            Some("--secret-key") => key_file = Some(value("--secret-key")?),
            Some("--public-key") => public_key = Some(value("--public-key")?),
            Some("--revocations") => revocations = Some(value("--revocations")?),
            Some("-h") | Some("--help") => return Err(USAGE.into()),
            _ => positional.push(PathBuf::from(arg)),
        }
    }
    let key_file = key_file.ok_or_else(|| format!("--secret-key is required\n{USAGE}"))?;
    let wanted = if revocations.is_some() { 0 } else { 2 };
    if positional.len() != wanted {
        return Err(USAGE.into());
    }
    Ok(Args {
        key_file,
        public_key,
        revocations,
        positional,
    })
}

fn read_pack(path: &Path) -> Result<Vec<archive::Entry>, String> {
    let entries = if path.is_dir() {
        archive::read_folder(path)
    } else {
        archive::read_zip_file(path)
    };
    entries.map_err(|e| e.to_string())
}

/// Everything that touches the secret key happens here. It returns only
/// fixed messages, so nothing derived from the key can reach the terminal.
mod keyed {
    use eyeread_lib::pack_signing::{archive, signature, signer, validate};
    use std::path::Path;

    /// An unencrypted key is used as is; an encrypted one prompts for its password.
    fn load(key_file: &Path) -> Result<minisign::SecretKey, &'static str> {
        let text =
            std::fs::read_to_string(key_file).map_err(|_| "secret key: couldn't read the file")?;
        let key_box = || {
            minisign::SecretKeyBox::from_string(&text)
                .map_err(|_| "secret key: not a minisign secret key file")
        };
        match key_box()?.into_unencrypted_secret_key() {
            Ok(sk) => Ok(sk),
            Err(_) => key_box()?
                .into_secret_key(None)
                .map_err(|_| "secret key: wrong password, or the key is damaged"),
        }
    }

    /// Sign a revocation list and write `<list>.minisig`, checked against
    /// `keyring` when given.
    pub fn sign_list(
        key_file: &Path,
        pk: Option<&minisign::PublicKey>,
        keyring: Option<&signature::Keyring>,
        json: &[u8],
        out: &Path,
    ) -> Result<(), &'static str> {
        let sk = load(key_file)?;
        let sig = signer::sign_revocations(json, &sk, pk).map_err(|_| "signing failed")?;
        if let Some(keys) = keyring {
            signature::RevocationList::load(&String::from_utf8_lossy(json), &sig, keys)
                .map_err(|_| "the signed list doesn't verify with --public-key")?;
        }
        std::fs::write(out, sig).map_err(|_| "couldn't write the signature file")
    }

    /// Sign a validated pack, check the result like the installer (and with
    /// `keyring` when given), and write it to `out`.
    pub fn sign_pack(
        key_file: &Path,
        pk: Option<&minisign::PublicKey>,
        keyring: Option<&signature::Keyring>,
        entries: Vec<archive::Entry>,
        app_version: &semver::Version,
        out: &Path,
    ) -> Result<(), &'static str> {
        let sk = load(key_file)?;
        let signed =
            signer::sign_pack(entries, &sk, pk, app_version).map_err(|_| "signing failed")?;
        let bundle = archive::read_zip(&signed)
            .ok()
            .and_then(|e| validate::validate_entries(e, app_version).ok())
            .ok_or("the signed pack doesn't pass the installer's checks")?;
        if let Some(keys) = keyring {
            let verified =
                signature::check_bundle(&bundle, keys, &signature::RevocationList::default())
                    .is_ok_and(|r| r.is_verified(&bundle.top.manifest.id));
            if !verified {
                return Err("the signed pack doesn't verify with --public-key");
            }
        }
        std::fs::write(out, signed).map_err(|_| "couldn't write the signed pack")
    }
}

fn run() -> Result<String, String> {
    let args = parse_args()?;
    let pk = match &args.public_key {
        Some(path) => {
            Some(minisign::PublicKey::from_file(path).map_err(|e| format!("public key: {e}"))?)
        }
        None => None,
    };
    let keyring = match &pk {
        Some(pk) => Some(signature::Keyring::new(&[("given", &pk.to_base64())])?),
        None => None,
    };

    if let Some(list_path) = &args.revocations {
        let json = std::fs::read(list_path).map_err(|e| format!("{}: {e}", list_path.display()))?;
        serde_json::from_slice::<signature::RevocationList>(&json)
            .map_err(|e| format!("{}: {e}", list_path.display()))?;
        let sig_path = PathBuf::from(format!("{}.minisig", list_path.display()));
        keyed::sign_list(
            &args.key_file,
            pk.as_ref(),
            keyring.as_ref(),
            &json,
            &sig_path,
        )?;
        return Ok(format!(
            "Signed {} → {}",
            list_path.display(),
            sig_path.display()
        ));
    }

    // Validate the reviewed pack first, exactly like the installer; the report
    // (each pack's hash, for the revocation list) comes from this unsigned input.
    let (input, output) = (&args.positional[0], &args.positional[1]);
    let app_version = semver::Version::parse(env!("CARGO_PKG_VERSION")).expect("crate version");
    let entries = read_pack(input)?;
    let reviewed = validate::validate_entries(
        entries
            .iter()
            .filter(|e| !e.path.ends_with("files.json") && !e.path.ends_with("files.json.minisig"))
            .cloned()
            .collect(),
        &app_version,
    )
    .map_err(|e| e.to_string())?;
    let mut report: Vec<String> = reviewed
        .all()
        .map(|p| {
            format!(
                "  {}@{}  {}",
                p.manifest.id, p.manifest.version, p.pack_hash
            )
        })
        .collect();
    if keyring.is_some() {
        report.push("  verified with --public-key".into());
    }

    keyed::sign_pack(
        &args.key_file,
        pk.as_ref(),
        keyring.as_ref(),
        entries,
        &app_version,
        output,
    )?;
    Ok(format!(
        "Signed {} → {}\n{}",
        input.display(),
        output.display(),
        report.join("\n")
    ))
}

fn main() -> ExitCode {
    match run() {
        Ok(message) => {
            println!("{message}");
            ExitCode::SUCCESS
        }
        Err(message) => {
            eprintln!("sign-pack: {message}");
            ExitCode::FAILURE
        }
    }
}
