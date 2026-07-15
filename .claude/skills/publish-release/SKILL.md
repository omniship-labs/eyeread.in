---
name: publish-release
description: Verify a draft eyeread.in stable release is complete, draft its release notes (using the release-notes skill), and publish it. Use when asked to "publish the release", "ship vX.Y.Z", or finish cutting a stable release after its CI build has produced a draft.
---

# Publish an eyeread.in stable release

Finishes the loop `docs/RELEASING.md` describes: a draft exists after CI
builds all platforms, and a human must review + click Publish. This skill
does the review legwork and stops at the one step that has to stay a
deliberate human decision.

## Steps

1. **Confirm the draft is actually complete.** Check every platform's
   artifacts and `latest.json` are attached:

   ```
   gh release view vX.Y.Z
   ```

   Look for: macOS `.dmg` + `.app.tar.gz` + `.sig`, Windows x64 and arm64
   `-setup.exe` + `.sig`, Linux `.AppImage` + `.sig` + `.deb`, and
   `latest.json`. If anything's missing, stop and report which platform leg
   is short rather than proceeding — per `docs/RELEASING.md`, a missing
   asset means a build leg failed silently or is still running; re-run it
   from the Actions run page, don't touch the draft in the meantime.

2. **Sanity-check the version actually landed correctly**, especially after
   any change to the version-stamping pipeline (`build-app.yml`'s Stamp
   version step) — download one asset's filename and confirm it matches the
   tag, not a stale prior version. This exact class of bug has bitten this
   repo before: `tauri.conf.json` has its own `version` field, separate from
   `package.json`/`Cargo.toml`, and a build from before that field was wired
   into the stamp step shipped installers named after the _previous_
   version. If the filenames don't match the tag, stop — the draft needs a
   rebuild (delete the tag, fix the stamping bug, re-push), not a publish.

3. **Get the release notes body** by invoking the `release-notes` skill for
   this exact version range — that skill's whole output is the notes text,
   nothing more. Propose a short descriptive title yourself (beyond the
   default "eyeread.in vX.Y.Z") based on what the notes say.

4. **Show the maintainer the drafted title + notes and wait for approval**
   before touching the release. Don't apply or publish on your own judgment
   call — this is exactly the "edit the generated notes" review step
   `docs/RELEASING.md` calls out.

5. **Apply the approved notes**:

   ```
   gh release edit vX.Y.Z --title "<approved title>" --notes-file notes.md
   ```

6. **Publish only on explicit instruction to do so.** "Draft the notes" or
   "get the release ready" is not the same as "publish it" — those are two
   different asks with very different reversibility. Wait for the
   maintainer to say the release should go live, then:

   ```
   gh release edit vX.Y.Z --draft=false
   ```

   This is the point of no return per `docs/RELEASING.md`: "Nothing reaches
   users — updater or download links — until this click." Treat it with the
   same care as any other irreversible production action.
