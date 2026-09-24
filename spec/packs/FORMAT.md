# Pack format (v1)

A pack is a `.zip` file. The same layout, unzipped, is what Developer mode
loads from a folder.

```
my-pack.zip
├── pack.json            required: the manifest
├── LICENSE              required: the AGPL text
├── main.js              the code (`main` in pack.json); can be one big file
├── lib/…                optional: more code or assets, imported by main.js
├── files.json           optional: per-file SHA-256 list (the build tool writes it)
├── files.json.minisig   optional: OmniShip's signature over files.json
└── packs/               bundles only: the packs this one includes
    ├── com.example.a/   a complete pack, same layout as above
    └── com.example.b/
```

Files sit at the zip's root, not inside a top-level folder.

## `pack.json`

Validated by [`pack.schema.json`](pack.schema.json). Unknown top-level fields
are rejected, so a manifest means exactly what the user was shown.

```json
{
  "$schema": "https://github.com/omniship-labs/eyeread.in/blob/main/spec/packs/pack.schema.json",
  "apiVersion": 1,
  "id": "com.example.notion-sync",
  "name": "Notion Sync",
  "version": "1.2.0",
  "description": "Sends a Notion page to your library.",
  "author": { "name": "Ada Example", "url": "https://example.com" },
  "license": "AGPL-3.0-only",
  "main": "main.js",
  "permissions": {
    "scripts:write": { "network": ["https://api.notion.com"] },
    "prompter:control": {}
  },
  "settings": [
    { "key": "pageId", "type": "text", "label": "Notion page ID" },
    { "key": "autoOpen", "type": "toggle", "label": "Open after import", "default": true }
  ]
}
```

| Field           | Required | Rules                                                                                                   |
| --------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `apiVersion`    | yes      | Integer. The app must support it (v1 apps support `1`).                                                 |
| `id`            | yes      | Reverse-DNS style, lowercase: `com.example.my-pack`. At least one dot, 3–100 characters. Never changes. |
| `name`          | yes      | 1–64 characters, shown to the user.                                                                     |
| `version`       | yes      | Semantic version without build metadata: `1.2.0`, `2.0.0-beta.1`.                                       |
| `description`   | no       | Up to 280 characters.                                                                                   |
| `author`        | yes      | `{ "name", "email"?, "url"? }`. `url` must be `https://`.                                               |
| `homepage`      | no       | `https://` URL.                                                                                         |
| `repository`    | no       | `https://` URL.                                                                                         |
| `license`       | yes      | `AGPL-3.0-only`, `AGPL-3.0-or-later` or `AGPL-3.0`. Anything else is rejected.                          |
| `minAppVersion` | no       | Lowest eyeread.in version the pack runs on.                                                             |
| `main`          | see note | Path to the entry module, ending in `.js` or `.mjs`.                                                    |
| `permissions`   | no       | Map of permission → `{ "network"?: [sites] }`. Missing or `{}` means the pack asks for nothing.         |
| `settings`      | no       | Declared settings (below), in display order. Up to 32.                                                  |
| `includes`      | no       | Packs this one bundles: `[{ "id", "version" }]`. Up to 32.                                              |

`main` is required, except in a pure bundle: a pack with `includes` and no
`permissions` may leave it out and ship no code of its own.

### Permissions

| Permission         | Lets the pack                                                                     |
| ------------------ | --------------------------------------------------------------------------------- |
| `scripts:write`    | Add scripts to the library                                                        |
| `prompter:load`    | Open text in the prompter and start a reading session                             |
| `prompter:control` | Play, pause, restart, seek or close the prompter                                  |
| `prompter:events`  | Read the prompter's state; the script is only described during an active session  |
| `files:import`     | Ask the user to pick a file with the app's own picker, and receive only that file |

These are the same names the Connected apps HTTP API uses as scopes, and they
share one grant model.

### Internet access, per permission

Internet is off unless a permission declares it. `network` lists the exact sites
that permission's code may call through `eyeread.net.fetch`:

```json
"permissions": {
  "scripts:write": { "network": ["https://api.notion.com"] },
  "prompter:control": {}
}
```

A site is an origin: `https://`, a DNS host name, and an optional port. No path,
no trailing slash, no wildcard, no IP address, no `localhost`, no user info, and
lowercase only. The host needs at least one dot, and its last label starts with a
letter. Up to 16 sites per permission. Declaring a site doesn't turn internet
on: the user still switches it on per permission, and it starts off.

The app runs each permission that declares `network` in its **own sandbox**,
with only that permission's API and `net`. All permissions without `network`
share one offline sandbox. See [`API.md`](API.md).

### Declared settings

Options the user sets in the pack's Settings screen, drawn with the app's own
controls. Packs read them with `eyeread.settings.get()`.

| `type`   | Extra fields                                                     | Value     | Default when omitted |
| -------- | ---------------------------------------------------------------- | --------- | -------------------- |
| `toggle` | none                                                             | `boolean` | `false`              |
| `select` | `options`: 1–50 of `{ "value", "label" }`                        | `string`  | first option         |
| `number` | `min`?, `max`?, `step`? (> 0), `unit`? (≤ 16 characters)         | `number`  | `min`, else `0`      |
| `text`   | `maxLength`? (1–2000, default 200), `placeholder`?, `multiline`? | `string`  | `""`                 |

Every setting has `key` (a letter, then letters, digits or `_`; up to 64
characters), `type`, `label` (1–64 characters) and optionally `description` (up
to 280) and `default`. Keys are unique. A `select` default must be one of its
options; a `number` default must be within `min`–`max`, and `min` ≤ `max`; a
`text` default must fit `maxLength`.

There is no secret setting type in v1. Values are stored per pack id and survive
updates; a key that disappears in an update is dropped.

## Paths and files

Every entry in the zip must be a regular file or a directory, with a path that:

- is relative, uses `/`, and doesn't start with `/`, a drive letter (`C:`) or `\\`;
- has no `..` or `.` segment, no empty segment, no backslash, and no control
  character or NUL;
- is at most 255 bytes of UTF-8, and at most 16 segments deep;
- doesn't differ from another entry's path only by letter case.

Symlinks, hard links and device files are rejected. `__MACOSX/…` and `.DS_Store`
entries are skipped: they're neither extracted nor hashed.

Allowed file types: `.js`, `.mjs`, `.json`, `.md`, `.txt`, `.css`, `.svg`,
`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, plus files named `LICENSE`, `COPYING`,
`NOTICE`, `README`, `AUTHORS` or `CHANGELOG` with no extension. No WebAssembly,
no native code, no HTML.

### Code

- `main` must name a file in the pack; otherwise `PACK_MAIN_MISSING`.
- `main` is an **ES module**. It can `import` other files in the same pack by
  relative path. Remote imports are blocked.
- **Source must be readable.** A `.js` or `.mjs` file counts as minified, and is
  rejected, if any line is longer than 1000 characters, or if it's at least
  2048 bytes and averages more than 200 bytes per line.

### License

The manifest's `license` must be an AGPL identifier, and the pack's root must
hold a `LICENSE`, `LICENSE.md`, `LICENSE.txt` or `COPYING` file containing the
text `GNU AFFERO GENERAL PUBLIC LICENSE` (any case).

## Limits

| Limit                             | Value  |
| --------------------------------- | ------ |
| Zip file size                     | 20 MiB |
| Total size, uncompressed          | 20 MiB |
| Largest single file, uncompressed | 5 MiB  |
| Files (including included packs)  | 500    |
| Included packs, all levels        | 32     |
| Bundle nesting depth              | 4      |

Limits are enforced while unzipping, on the actual bytes written, not on the
sizes the zip claims.

## `files.json`

A per-file SHA-256 list, validated by [`files.schema.json`](files.schema.json).
The build tool writes it; the installer computes it itself when it's missing.

```json
{
  "format": 1,
  "id": "com.example.notion-sync",
  "version": "1.2.0",
  "files": {
    "LICENSE": "<64 lowercase hex characters>",
    "main.js": "…",
    "pack.json": "…"
  }
}
```

- `id` and `version` must equal the manifest's.
- `files` lists **every** file in the pack (including `pack.json`) except
  `files.json`, `files.json.minisig`, anything under `packs/`, and the skipped
  `__MACOSX` / `.DS_Store` entries. Hashes are lowercase hex SHA-256 of the raw
  bytes.
- At install, and again before every launch, the set of files on disk must equal
  the set of keys, and every hash must match. A missing, extra or changed file
  fails with `PACK_FILES_MISMATCH`, and an installed pack is disabled until the
  user approves it again.

**Canonical form.** Keys in the order `format`, `id`, `version`, `files`;
`files` sorted by path (byte order); two-space indentation; one trailing
newline. It's what `JSON.stringify(value, null, 2) + "\n"` prints for a value
built in that order. The build tool always writes the canonical form.

**Pack hash.** The SHA-256 of the pack's `files.json` in canonical form,
recomputed from the files on disk. It identifies one exact version of one pack:
bundles share installed packs by it, and the revocation list blocks by it.

## Signature: `files.json.minisig`

A [minisign](https://jedisct1.github.io/minisign/) (Ed25519) signature over the
exact bytes of `files.json`, made with OmniShip's key. It's the same scheme the
app's updater uses.

- The app embeds **two public keys**, main and backup; either may sign.
- The signature's **trusted comment** must be exactly
  `eyeread.in pack <id>@<version> <pack hash>`.
- Because `files.json` names the id, version and every file's hash, and the
  trusted comment repeats them, the signature is bound to one version of one
  pack. Any edit, or copying the signature onto another pack, breaks it.

| Result      | When                                                            | Shown as                        |
| ----------- | --------------------------------------------------------------- | ------------------------------- |
| `verified`  | The signature verifies, and the pack hash isn't revoked         | ✓ Verified by eyeread.in        |
| `community` | There's no `files.json.minisig`                                 | Community (with a warning)      |
| `invalid`   | A signature is present but doesn't verify: treated as tampering | Blocked                         |
| `revoked`   | The pack hash is on the app's revocation list                   | Blocked, with the list's reason |

A **bundle** is `verified` only if it and every pack it includes are. Developer
mode packs are shown as `Dev` and never verified.

## Bundles

A pack with `includes` is a bundle. Its `packs/` folder holds every pack it
needs, at any level, **flat**: `packs/<id>/` for each one, with no deeper
`packs/` folders.

- Each entry in `includes` (and each included pack's own `includes`) must match a
  folder `packs/<id>/` whose `pack.json` has that exact `id` and `version`, or
  the install fails with `PACK_INCLUDE_MISSING` (or `PACK_INCLUDE_VERSION` when
  only the version differs).
- An `id` may appear once in a pack's `includes` (`PACK_INCLUDE_DUPLICATE`).
- The graph must have no cycles (`PACK_INCLUDE_CYCLE`), at most 32 packs, and at
  most 4 levels of nesting (`PACK_INCLUDE_LIMIT`).
- Every folder under `packs/` must be reachable from the top-level pack's
  `includes` (`PACK_INCLUDE_UNUSED`).
- Each included pack is validated as a pack in its own right, with its own
  `files.json` and signature.
- An included pack that's already installed with the same pack hash is shared,
  not installed twice, and keeps its settings. Uninstalling a bundle removes only
  the packs nothing else uses.

## Validation errors

Every check above fails with a code from [`errors.json`](errors.json), which
also holds the message text. The app's installer and Developer mode, and the
CLI's `validate`, print the same codes and wording. Placeholders in braces are
filled in; `{path}` is always the path inside the pack.

Checks run in this order, and the first failure is the one reported, so every
tool gives the same answer for the same pack:

1. The zip and its entries: `PACK_ZIP_INVALID`, `PACK_TOO_LARGE`,
   `PACK_TOO_MANY_FILES`, `PACK_FILE_TOO_LARGE`, `PACK_PATH_UNSAFE`,
   `PACK_LINK_NOT_ALLOWED`, `PACK_PATH_DUPLICATE`, `PACK_FILE_TYPE`.
2. The manifest can be read: `PACK_MANIFEST_MISSING`, `PACK_MANIFEST_INVALID_JSON`.
3. `PACK_API_VERSION`, when `apiVersion` is an integer the app doesn't support
   (a newer manifest may not match this schema).
4. `PACK_LICENSE`, when `license` is a string that isn't allowed; then
   `PACK_NETWORK_SITE`, for the first string in a `network` list that isn't a
   valid site.
5. `PACK_MANIFEST_SCHEMA`: anything else the schema rejects.
6. `PACK_APP_VERSION`, `PACK_SETTINGS`.
7. `PACK_LICENSE_FILE`, `PACK_MAIN_MISSING`, `PACK_MINIFIED`.
8. `PACK_FILES_JSON_INVALID`, `PACK_FILES_MISMATCH`.
9. Bundles: `PACK_INCLUDE_DUPLICATE`, `PACK_INCLUDE_MISSING`,
   `PACK_INCLUDE_VERSION`, `PACK_INCLUDE_CYCLE`, `PACK_INCLUDE_LIMIT`,
   `PACK_INCLUDE_UNUSED`, then steps 2–8 for each included pack, in `includes`
   order, depth first. Walking the graph reads each included `pack.json`; if
   one is missing or isn't JSON, that error is reported when the walk reaches
   it. Files under `packs/` that aren't inside a pack folder, and `packs/`
   folders inside an included pack, count as `PACK_INCLUDE_UNUSED`.
10. `PACK_SIGNATURE_INVALID`, `PACK_REVOKED`.

[`fixtures/`](fixtures) has a pack for each of these, with the code it must fail
with in `fixtures/expected.json`.
