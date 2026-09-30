//! Every pack in `spec/packs/fixtures/` goes through the real installer: it's
//! zipped (with the `zipExtra` entries a folder can't hold, like `../evil.js`
//! or a symlink), validated, and, if valid, installed into a temp store. The
//! result must match `fixtures/expected.json`.

use super::archive;
use super::store::PackStore;
use super::validate::validate_entries;
use serde_json::Value;
use std::fs;
use std::io::{Cursor, Write};
use std::path::{Path, PathBuf};
use zip::write::SimpleFileOptions;

fn fixtures_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../spec/packs/fixtures")
}

fn add_folder(zip: &mut zip::ZipWriter<Cursor<Vec<u8>>>, root: &Path, rel: &str) {
    let mut items: Vec<_> = fs::read_dir(root.join(rel)).unwrap().flatten().collect();
    items.sort_by_key(|i| i.file_name());
    for item in items {
        let name = item.file_name().to_string_lossy().into_owned();
        let path = if rel.is_empty() {
            name
        } else {
            format!("{rel}/{name}")
        };
        if item.file_type().unwrap().is_dir() {
            add_folder(zip, root, &path);
        } else {
            zip.start_file(&path, SimpleFileOptions::default()).unwrap();
            zip.write_all(&fs::read(item.path()).unwrap()).unwrap();
        }
    }
}

/// Zip a fixture folder the way a creator would, plus its raw extra entries.
pub(crate) fn zip_fixture(name: &str, extra: &[Value]) -> Vec<u8> {
    let mut zip = zip::ZipWriter::new(Cursor::new(Vec::new()));
    add_folder(&mut zip, &fixtures_dir().join(name), "");
    for e in extra {
        let entry = e["name"].as_str().unwrap();
        if let Some(target) = e["symlink"].as_str() {
            zip.add_symlink(entry, target, SimpleFileOptions::default())
                .unwrap();
        } else {
            zip.start_file(entry, SimpleFileOptions::default()).unwrap();
            zip.write_all(e["content"].as_str().unwrap().as_bytes())
                .unwrap();
        }
    }
    zip.finish().unwrap().into_inner()
}

#[test]
fn every_fixture_installs_or_fails_as_the_spec_expects() {
    let expected: Value =
        serde_json::from_slice(&fs::read(fixtures_dir().join("expected.json")).unwrap()).unwrap();
    let fixtures = expected["fixtures"].as_object().unwrap();
    assert!(fixtures.len() >= 40, "fixtures went missing");
    let app = semver::Version::new(1, 0, 0);
    let tmp = tempfile::tempdir().unwrap();
    let mut failures = Vec::new();

    for (name, want) in fixtures {
        let extra = want["zipExtra"].as_array().cloned().unwrap_or_default();
        let bytes = zip_fixture(name, &extra);
        let result = archive::read_zip(&bytes).and_then(|entries| validate_entries(entries, &app));
        match (want["error"].as_str(), result) {
            (None, Ok(bundle)) => {
                // Valid: it must also install cleanly, each fixture in its own store.
                let mut store = PackStore::open(tmp.path().join(name)).unwrap();
                if let Err(e) = store.install(&bundle, &super::store::tests::none()) {
                    failures.push(format!("{name}: valid but install failed: {e}"));
                    continue;
                }
                for pack in bundle.all() {
                    if let Err(e) = store.verify(&pack.manifest.id) {
                        failures.push(format!(
                            "{name}: {} failed its launch check: {e}",
                            pack.manifest.id
                        ));
                    }
                }
            }
            (None, Err(e)) => failures.push(format!("{name}: expected valid, got {e}")),
            (Some(code), Ok(_)) => {
                failures.push(format!("{name}: expected {code}, but it validated"))
            }
            (Some(code), Err(e)) if e.code != code => {
                failures.push(format!("{name}: expected {code}, got {e}"))
            }
            (Some(_), Err(e)) => {
                // A clear error: the message is filled in, not a bare template.
                if e.message.contains('{') && !e.message.contains("{}") {
                    failures.push(format!("{name}: unfilled message: {}", e.message));
                }
            }
        }
    }
    assert!(failures.is_empty(), "\n{}", failures.join("\n"));
}

#[test]
fn bundle_fixture_installs_every_included_pack() {
    let bytes = zip_fixture("valid-bundle", &[]);
    let bundle = validate_entries(
        archive::read_zip(&bytes).unwrap(),
        &semver::Version::new(1, 0, 0),
    )
    .unwrap();
    let ids: Vec<&str> = bundle.all().map(|p| p.manifest.id.as_str()).collect();
    // Depth first, in includes order; the shared pack appears once.
    assert_eq!(
        ids,
        ["com.example.bundle", "com.example.a", "com.example.b"]
    );

    let tmp = tempfile::tempdir().unwrap();
    let mut store = PackStore::open(tmp.path()).unwrap();
    store
        .install(&bundle, &super::store::tests::none())
        .unwrap();
    let a = store.get("com.example.a").unwrap();
    assert!(!a.top_level && a.used_by.contains("com.example.bundle"));
    assert_eq!(
        store.uninstall("com.example.bundle").unwrap(),
        ["com.example.a", "com.example.b", "com.example.bundle"]
    );
}

#[test]
fn error_messages_name_the_file_inside_an_included_pack() {
    // Break a file inside an included pack and check the path in the message.
    let tmp = tempfile::tempdir().unwrap();
    let dir = tmp.path().join("pack");
    for e in super::store::tests::pack_entries(
        "com.example.top",
        "1.0.0",
        &[("com.example.sub", "1.0.0")],
        "// top\n",
    ) {
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join(&e.path), &e.bytes).unwrap();
    }
    let sub = dir.join("packs/com.example.sub");
    fs::create_dir_all(&sub).unwrap();
    for e in super::store::tests::pack_entries("com.example.sub", "1.0.0", &[], &"x".repeat(1200)) {
        fs::write(sub.join(&e.path), &e.bytes).unwrap();
    }
    let err = validate_entries(
        archive::read_folder(&dir).unwrap(),
        &semver::Version::new(1, 0, 0),
    )
    .unwrap_err();
    assert_eq!(err.code, "PACK_MINIFIED");
    assert!(
        err.message.starts_with("packs/com.example.sub/main.js:"),
        "{}",
        err.message
    );
}

fn copy_folder(from: &Path, to: &Path) {
    fs::create_dir_all(to).unwrap();
    for item in fs::read_dir(from).unwrap().flatten() {
        if item.file_type().unwrap().is_dir() {
            copy_folder(&item.path(), &to.join(item.file_name()));
        } else {
            fs::copy(item.path(), to.join(item.file_name())).unwrap();
        }
    }
}

#[test]
fn a_top_level_git_is_skipped_when_reading_a_folder() {
    let tmp = tempfile::tempdir().unwrap();
    let dir = tmp.path().join("pack");
    copy_folder(&fixtures_dir().join("valid-multifile"), &dir);
    let read = |dir: &Path| {
        let entries = archive::read_folder(dir).unwrap();
        let bundle = validate_entries(entries.clone(), &semver::Version::new(1, 0, 0)).unwrap();
        (entries, bundle.top.pack_hash)
    };
    let clean = read(&dir);

    // A repo's `.git` directory: bare names and nested objects the file-type
    // rule would reject if they weren't skipped.
    let git = dir.join(".git");
    fs::create_dir_all(git.join("objects/ab")).unwrap();
    fs::write(git.join("HEAD"), "ref: refs/heads/main\n").unwrap();
    fs::write(git.join("config"), "[core]\n").unwrap();
    fs::write(git.join("objects/ab/cdef0123"), [0u8, 1, 2]).unwrap();
    assert_eq!(read(&dir), clean);

    // A worktree or submodule uses a `.git` file instead.
    fs::remove_dir_all(&git).unwrap();
    fs::write(&git, "gitdir: ../.git/worktrees/pack\n").unwrap();
    assert_eq!(read(&dir), clean);

    // Only at the top level: a nested `.git` is still an entry like any other.
    fs::write(dir.join("src/.git"), "gitdir: x\n").unwrap();
    let err = archive::read_folder(&dir).unwrap_err();
    assert_eq!(err.code, "PACK_FILE_TYPE");
}

/// Not a test: installs a pack folder into a store, for trying packs in a
/// local build. Run with
/// `EYEREAD_PACKS_ROOT=<app data>/packs EYEREAD_PACK_FOLDER=<folder> cargo test install_folder -- --ignored`.
#[test]
#[ignore]
fn install_folder_for_manual_testing() {
    let root = std::env::var("EYEREAD_PACKS_ROOT").expect("EYEREAD_PACKS_ROOT");
    let folder = std::env::var("EYEREAD_PACK_FOLDER").expect("EYEREAD_PACK_FOLDER");
    let bundle = validate_entries(
        archive::read_folder(Path::new(&folder)).unwrap(),
        &semver::Version::new(0, 0, 0),
    )
    .unwrap();
    let mut store = PackStore::open(root).unwrap();
    store
        .install(&bundle, &super::store::tests::none())
        .unwrap();
    println!("installed {}", bundle.top.manifest.id);
}
