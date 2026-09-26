# Packs

There are two ways to build on eyeread.in, and they share one set of
permissions:

- **Packs** are installable, sandboxed JS packages that run inside the app,
  managed under Settings → Packs. Their format and API are specified in
  [`spec/packs/`](../spec/packs/README.md).
- **Connected apps** are separate programs, written in any language, that talk
  to the app over a local HTTP API on `127.0.0.1`. No third-party code runs
  inside eyeread.in. This page documents that API.

## Making a pack

For a full creator guide, see [Build packs for eyeread.in](BUILDING_PACKS.md).
Everything can be done from the app, in Settings → Packs (Advanced view) →
**Developer mode**:

1. **New pack…** asks for a name and a folder, and creates `pack.json`, a
   commented `main.js`, the AGPL `LICENSE` and a `README.md`. The pack is
   loaded straight away.
2. It runs from that folder with a **Dev** badge. Its permissions start off,
   like any pack's: turn them on in the pack's screen.
3. **Edit and save**: the pack reloads within a second. If a change doesn't
   validate, the error shows on the pack and it stops until you fix it.
4. The pack's **Log** shows its console output, errors, permission denials
   and network requests, newest first.
5. **Validate** runs the installer's own checks; **Build pack** writes
   `<id>-<version>.zip` (with `files.json`) next to the folder, ready to
   share or to submit for Verified.

The format and API are in [`spec/packs/`](../spec/packs/README.md). Error
messages come from `spec/packs/errors.json`, so the app and the creator CLI
(#127) word them the same way.

## Verified packs (maintainers)

A pack gets the ✓ **Verified by eyeread.in** badge when OmniShip signs it after
review. The format is in [`spec/packs/FORMAT.md`](../spec/packs/FORMAT.md#signature-filesjsonminisig);
the verifier is `src-tauri/src/packs/signature.rs`.

- **Keys.** Two minisign keys, main and an offline backup. Only their public
  halves go in the app (`TRUSTED_KEYS` in `signature.rs`); the private keys
  never go in this repo or CI. Until the keys exist, both entries are empty and
  every pack installs as Community. See [Signing keys](#signing-keys).
- **Signing** a reviewed pack, on the machine that holds the key:

  ```bash
  cd src-tauri
  cargo run --features pack-signing --bin sign-pack -- \
    --secret-key <key> --public-key <key.pub> <reviewed pack.zip or folder> <signed.zip>
  ```

  It validates the pack exactly like the installer, writes each pack's
  canonical `files.json`, signs it (and every pack a bundle includes), and
  checks the result with `--public-key` before writing `signed.zip`. Every
  version is signed separately.

- **Revoking** a pack: add its pack hash (printed by `sign-pack`, or shown in
  the review) with a reason to `src-tauri/src/packs/revoked.json`, then sign
  the list:

  ```bash
  cargo run --features pack-signing --bin sign-pack -- \
    --secret-key <key> --public-key <key.pub> --revocations src/packs/revoked.json
  ```

  The list ships with the next app update: matching packs are blocked at
  install, and disabled at launch with the reason shown. A unit test fails if
  the shipped list is neither empty nor correctly signed.

### Signing keys

**Who can sign.** Only Mrithyunjay Halinge (MJ) holds the keys and signs packs.
Adding a signer means giving them the main key in person or through a password
manager share, and recording it here.

**Generating them** (done once, offline, never in this repo or CI):

```bash
minisign -G -p eyeread-packs-main.pub   -s eyeread-packs-main.key
minisign -G -p eyeread-packs-backup.pub -s eyeread-packs-backup.key
```

Give each key its own strong password. `TRUSTED_KEYS` takes the second line of
each `.pub` file (the base64 key starting with `RW`): `main` first, then
`backup`.

**Custody.**

- **Main** signs every pack and revocation list. Keep the key and password in
  the maintainer's password manager or offline vault.
- **Backup** is never used day to day. Keep it on separate offline media, in a
  different place, with its password stored separately.
- Never put either in git, CI, chat, or a cloud-synced folder. Losing both
  means no pack can be Verified until an app update ships new keys.

**Rotating** (either key can sign, so reviews never have to stop):

1. Generate a new key offline.
2. Replace the old key's entry in `TRUSTED_KEYS` and ship an app update.
3. Packs signed only by the removed key lose their badge in that update, so
   re-sign the current Verified version of each pack with a key that stays,
   and publish them before the update ships.

**If a key leaks:** sign with the other key from then on; add any pack signed
with the leaked key that you didn't approve to `revoked.json` and sign the list
with the other key; then rotate as above in the next release.

## Connected apps

Other apps on the same computer can add scripts, open them in the prompter,
drive playback, and follow reading progress.

Some things you can build with it:

- A writing tool or notes app that sends a finished script straight to the prompter
- Stream Deck, foot-pedal or MIDI controllers for play, pause and jump
- A recording tool that starts capture when reading starts
- A progress display for a producer or a second screen

The implementation lives in `src-tauri/src/packs/connected_apps/` (server,
auth, routing) and `src/lib/packs.js` (window-side handlers).

### How it works

1. **The user turns it on.** Settings → Packs → Connected apps → _Allow
   connected apps_ (Packs shows in the Advanced settings view). It's off by
   default, and nothing listens on a port until it's turned on.
2. **Your app pairs once.** It asks for the scopes it needs. eyeread.in
   shows the user your app's name and exactly what it's asking for, and
   they choose Allow or Deny. Allow returns a bearer token.
3. **Your app stores that token** and sends it with every request. The
   app keeps only a SHA-256 hash of it.
4. **The user stays in control.** Every paired app appears in Settings and
   can be revoked with one click. Revoking takes effect immediately, and the
   app's open event streams are closed.

Work that changes the app goes through the same code paths as the UI. Scripts
land in the library, and loading one follows exactly the same path as pressing
_Start reading_: the permissions check, window placement, and screen-share
protection all apply. A connected app can't bypass any of them.

### Scopes

Scopes have the same names, and mean the same thing, as pack permissions.

| Scope              | Grants                                                                  |
| ------------------ | ----------------------------------------------------------------------- |
| `scripts:write`    | Add scripts to the user's library                                       |
| `prompter:load`    | Open text in the prompter and start a reading session                   |
| `prompter:control` | Play, pause, restart, seek, or close the prompter                       |
| `prompter:events`  | Read the prompter's state (title and position of the script being read) |

Ask for the fewest scopes you need; the user sees every one. No scope can
**read** the user's library. `prompter:events` reports only the script that is
currently being read, and only while a session is active.

The pack permission `files:import` has no scope here: a connected app is a
regular program and reads files itself.

### Protocol

- Base URL: `http://127.0.0.1:17842`
- JSON in, JSON out. Send `Content-Type: application/json` with every `POST`.
- Authenticate with `Authorization: Bearer <token>`.
- Every response carries `"ok": true | false`. Failures add a machine-readable
  `"error"` code; see [Errors](#errors).
- Request bodies are capped at 256 KiB.
- **Browsers can't use this API.** Requests carrying an `Origin` or
  `Sec-Fetch-Site` header are refused, and the API sends no CORS headers, so web
  pages can't reach it. `Host` must be `127.0.0.1:17842` or `localhost:17842`.
  Native HTTP clients (curl, Python `requests`, Node `fetch`, Go, Rust,
  PowerShell…) work as-is.

#### `GET /v1`

No auth. Checks that the API is running and which version it speaks.

```json
{
  "ok": true,
  "api": "eyeread.connected-apps",
  "apiVersion": 1,
  "appVersion": "0.1.5",
  "scopes": ["scripts:write", "prompter:load", "prompter:control", "prompter:events"]
}
```

A connection error means the app isn't running, or the user hasn't turned on
connected apps.

#### `POST /v1/pair`

No auth. Asks the user to approve your app. The request **stays open
while the user decides**, for up to 2 minutes, so use a long client timeout.

```json
{ "name": "My Notes App", "scopes": ["scripts:write", "prompter:load"] }
```

- `name`: 1–64 characters. The user sees it, so make it recognizable.
- `scopes`: one or more from the table above.

On approval, `201`:

```json
{
  "ok": true,
  "appId": "61145e838473eeef",
  "token": "era_…",
  "scopes": ["scripts:write", "prompter:load"]
}
```

Save the token securely, for example in the OS keychain. You can't retrieve it
again. If it's lost, or the user revokes you (`401`), pair again.

Other outcomes: `403 pairing_denied`, `408 pairing_timeout`,
`409 pairing_in_progress` (another prompt is already open; retry later).

#### `GET /v1/me`

Any valid token. Returns your app's `id`, `name` and `scopes`. Use it to
check that a stored token still works.

#### `POST /v1/scripts`: `scripts:write`

Adds a script to the library, where the user can open it themselves.

```json
{ "text": "Script text…", "title": "Optional title", "language": "en-US" }
```

- `text`: required, non-empty.
- `title`: optional, up to 200 characters. Defaults to `From <app name>`.
- `language`: optional BCP-47 tag for voice tracking, such as `en-US` or
  `pt-BR`.

Response: `{ "ok": true, "scriptId": "…" }`

#### `POST /v1/prompter/load`: `prompter:load`

Same body as `/v1/scripts`. Adds the script to the library (so the user always
has a record of what was shown, and from where), then opens it in the prompter
and starts reading. If voice tracking still needs microphone permission, the
user is asked first, just as when they press _Start reading_ themselves.

Response: `{ "ok": true, "scriptId": "…" }`

#### `POST /v1/prompter/control`: `prompter:control`

```json
{ "action": "seek", "wordIndex": 42 }
```

`action` is one of `play`, `pause`, `toggle`, `restart`, `seek` (needs
`wordIndex`, clamped to the script), or `close`.

`409 no_active_session` if the prompter isn't open.

#### `GET /v1/prompter/state`: `prompter:events`

```json
{
  "ok": true,
  "state": {
    "sessionActive": true,
    "playing": true,
    "scriptId": "da5lo9vcmue9rlyb",
    "title": "Keynote",
    "wordIndex": 118,
    "wordCount": 640
  }
}
```

When no session is active, `scriptId` and `title` are `null` and the counters
are `0`.

#### `GET /v1/prompter/events`: `prompter:events`

A [Server-Sent Events](https://developer.mozilla.org/docs/Web/API/Server-sent_events)
stream. It starts with the current state, then sends an `event: state` with the
same object as `/v1/prompter/state` on every change. Updates are debounced to
roughly one every 150 ms. A `: keepalive` comment arrives every 15 s.

```
event: state
data: {"sessionActive":true,"playing":false,"scriptId":"…","title":"Keynote","wordIndex":6,"wordCount":640}
```

The stream closes if the user revokes you or turns connected apps off; reconnect
with backoff. At most 8 streams can be open at once across all apps.

#### Errors

| Status | `error`                        | Meaning                                             |
| ------ | ------------------------------ | --------------------------------------------------- |
| 400    | `invalid_json`                 | Body isn't a JSON object                            |
| 401    | `unauthorized`                 | Missing, unknown or revoked token — pair again      |
| 403    | `missing_scope`                | Token lacks the scope (named in `"scope"`)          |
| 403    | `pairing_denied`               | The user clicked Deny                               |
| 403    | `browser_requests_not_allowed` | Request came from a web browser                     |
| 403    | `bad_host`                     | `Host` wasn't `127.0.0.1:17842` / `localhost:17842` |
| 404    | `not_found`                    | Unknown endpoint                                    |
| 405    | `method_not_allowed`           | Wrong HTTP method for this endpoint                 |
| 408    | `pairing_timeout`              | The user didn't answer within 2 minutes             |
| 409    | `pairing_in_progress`          | Another pairing prompt is open                      |
| 409    | `no_active_session`            | Prompter isn't open (`/v1/prompter/control`)        |
| 411    | `length_required`              | Use `Content-Length`, not chunked encoding          |
| 413    | `body_too_large`               | Body over 256 KiB                                   |
| 415    | `json_required`                | Missing `Content-Type: application/json`            |
| 422    | `text_required`, `invalid_*`   | Validation failed (the code names the field)        |
| 429    | `too_many_streams`             | Event stream limit reached                          |
| 503    | `api_disabled`                 | The user turned connected apps off mid-request      |
| 504    | `app_not_responding`           | The app window didn't answer in time; retry         |

### Quick start

With connected apps turned on, pair and send a script with curl:

```bash
# 1. Pair (approve the prompt in eyeread.in)
curl -s -X POST http://127.0.0.1:17842/v1/pair \
  -H 'Content-Type: application/json' \
  -d '{"name":"My Script","scopes":["prompter:load"]}'

# 2. Open text in the prompter
curl -s -X POST http://127.0.0.1:17842/v1/prompter/load \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Hello","text":"Hello from my app."}'
```

A complete Node example (pairing, token storage, loading a script and following
events) is in [`examples/connected-app.mjs`](examples/connected-app.mjs):

```bash
node docs/examples/connected-app.mjs "Text to read"
```

### Guidelines for app authors

- **Be honest about what you are.** Use a name users will recognize, and
  request only the scopes you use.
- **Keep the user in the loop.** Scripts you send are saved to their library
  under your title; don't disguise where content came from.
- **Store tokens like passwords.** Anyone with your token can do whatever your
  scopes allow.
- **Handle `401` by re-pairing**, and handle connection errors (app closed,
  connected apps off) gracefully.

### Versioning

The API is versioned in the path (`/v1`) and in `apiVersion`. New endpoints,
new optional fields and new error codes can arrive within `v1`. Clients should
ignore fields they don't know. Breaking changes get a new path.
