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

use eyeread_lib::pack_signing::{archive, signature, signer, validate};
use std::path::{Path, PathBuf};
use std::process::ExitCode;

struct Args {
    secret_key: PathBuf,
    public_key: Option<PathBuf>,
    revocations: Option<PathBuf>,
    positional: Vec<PathBuf>,
}

const USAGE: &str = "usage:
  sign-pack --secret-key <file> [--public-key <file>] <pack.zip | folder> <signed.zip>
  sign-pack --secret-key <file> [--public-key <file>] --revocations <revoked.json>";

fn parse_args() -> Result<Args, String> {
    let mut secret_key = None;
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
            Some("--secret-key") => secret_key = Some(value("--secret-key")?),
            Some("--public-key") => public_key = Some(value("--public-key")?),
            Some("--revocations") => revocations = Some(value("--revocations")?),
            Some("-h") | Some("--help") => return Err(USAGE.into()),
            _ => positional.push(PathBuf::from(arg)),
        }
    }
    let secret_key = secret_key.ok_or_else(|| format!("--secret-key is required\n{USAGE}"))?;
    let wanted = if revocations.is_some() { 0 } else { 2 };
    if positional.len() != wanted {
        return Err(USAGE.into());
    }
    Ok(Args {
        secret_key,
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

/// An unencrypted key is used as is; an encrypted one prompts for its password.
fn load_secret_key(path: &Path) -> Result<minisign::SecretKey, String> {
    let text = std::fs::read_to_string(path).map_err(|e| format!("secret key: {e}"))?;
    let key_box =
        || minisign::SecretKeyBox::from_string(&text).map_err(|e| format!("secret key: {e}"));
    match key_box()?.into_unencrypted_secret_key() {
        Ok(sk) => Ok(sk),
        Err(_) => key_box()?
            .into_secret_key(None)
            .map_err(|e| format!("secret key: {e}")),
    }
}

fn run() -> Result<String, String> {
    let args = parse_args()?;
    let sk = load_secret_key(&args.secret_key)?;
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
        let sig = signer::sign_revocations(&json, &sk, pk.as_ref()).map_err(|e| e.to_string())?;
        let sig_path = PathBuf::from(format!("{}.minisig", list_path.display()));
        if let Some(keys) = &keyring {
            signature::RevocationList::load(&String::from_utf8_lossy(&json), &sig, keys)?;
        }
        std::fs::write(&sig_path, sig).map_err(|e| format!("{}: {e}", sig_path.display()))?;
        return Ok(format!(
            "Signed {} → {}",
            list_path.display(),
            sig_path.display()
        ));
    }

    let (input, output) = (&args.positional[0], &args.positional[1]);
    let app_version = semver::Version::parse(env!("CARGO_PKG_VERSION")).expect("crate version");
    let signed = signer::sign_pack(read_pack(input)?, &sk, pk.as_ref(), &app_version)
        .map_err(|e| e.to_string())?;

    // Round trip: the signed zip must pass the installer's checks.
    let bundle = validate::validate_entries(
        archive::read_zip(&signed).map_err(|e| e.to_string())?,
        &app_version,
    )
    .map_err(|e| e.to_string())?;
    let mut report = Vec::new();
    for pack in bundle.all() {
        let m = &pack.manifest;
        report.push(format!("  {}@{}  {}", m.id, m.version, pack.pack_hash));
    }
    if let Some(keys) = &keyring {
        let result = signature::check_bundle(&bundle, keys, &signature::RevocationList::default())
            .map_err(|e| e.to_string())?;
        if !result.is_verified(&bundle.top.manifest.id) {
            return Err("the signed pack doesn't verify with --public-key".into());
        }
        report.push("  verified with --public-key".into());
    }
    std::fs::write(output, signed).map_err(|e| format!("{}: {e}", output.display()))?;
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
