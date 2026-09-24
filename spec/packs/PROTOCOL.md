# Sandbox protocol (v1)

How a sandbox talks to the app. Packs never see this: the app's bootstrap
script, loaded before the pack's code, turns it into the `eyeread.*` API.
Message shapes are in [`protocol.schema.json`](protocol.schema.json).

## Sandboxes and transport

Each sandbox is its **own hidden webview**, with no Tauri capabilities (the
app's commands sit behind an ACL that grants them only to the app's windows).
Separate webviews can't reference each other, which sibling frames in one page
always can.

A sandbox's pages are served from the app's `packhost:` protocol under an
unguessable token: `<base> = packhost://localhost/<token>` (on Windows,
`http://packhost.localhost/<token>`). Every document is served with this CSP:

```
default-src 'none'; script-src <base>/; connect-src <base>/rpc <base>/events <base>/init;
sandbox allow-scripts; base-uri 'none'; form-action 'none'; frame-src 'none';
frame-ancestors 'none'; img-src 'none'; media-src 'none'; font-src 'none';
style-src 'none'; worker-src 'none'; object-src 'none'; manifest-src 'none'
```

`sandbox allow-scripts` gives the document an **opaque origin**: no storage, no
cookies, no BroadcastChannel shared with anything, no pop-ups, forms or
navigation. The only requests allowed are to the sandbox's own three URLs:

| Request             | Does                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `GET <base>/init`   | Returns the `init` message: who this sandbox is.                                          |
| `POST <base>/rpc`   | Sends one message (`ready`, `call`, `log`, `error`) and returns the reply.                |
| `GET <base>/events` | Long poll: returns the queued messages for this sandbox (possibly `[]`) within 5 seconds. |

`POST` bodies are sent as `text/plain` so they're simple requests. The pack's
files are served from `<base>/pack/<path>`; nothing else of the app or of other
packs is reachable. The app checks **every** call against the sandbox's
permissions and the user's grants, so a pack that calls `rpc` directly gets
exactly what the API would give it.

## Start-up

```
sandbox                                   app
 │── GET init ───────────────────────────▶│
 │◀───────── init {pack, sandbox, main} ──│
 │  bootstrap installs `eyeread`, imports <base>/pack/<main>
 │── POST rpc: ready {handlers} ─────────▶│
 │◀──────────────── {activate: [...]} ────│  each handler(ctx) runs once
 │── GET events (long poll, repeated) ───▶│
```

- **`init`**: `pack` (`id`, `version`, `name`), `sandbox` (`id`, `permissions`,
  and `network`: whether `net` exists), `settings` (current values), and `main`.
- **`ready`**: `handlers`, the permissions the pack registered while `main`
  first evaluated. The reply lists the permissions to activate: those in this
  sandbox, registered, and allowed. If `main` fails to load, the bootstrap sends
  `error` with `fatal: true` instead.
- There is no deactivation: when a permission is revoked, the pack is switched
  off or updated, the app closes the sandbox and starts a new one if needed.

## Calls

```json
{ "v": 1, "type": "call", "id": 7, "permission": "prompter:control", "method": "prompter.control", "params": { "action": "seek", "wordIndex": 40 } }
{ "v": 1, "type": "result", "id": 7, "ok": true, "value": null }
{ "v": 1, "type": "result", "id": 8, "ok": false, "error": { "code": "E_NO_SESSION", "message": "The prompter isn't open." } }
```

`id` is a positive integer, unique per sandbox while the call is pending. The
app checks, in order: the permission belongs to this sandbox, the method
belongs to the permission, the user's grant is on (internet too, for
`net.fetch`), then the arguments.

| `method`               | `permission`                     | `params`                                     | `value`                    |
| ---------------------- | -------------------------------- | -------------------------------------------- | -------------------------- |
| `scripts.add`          | `scripts:write`                  | `{ text, title?, language? }`                | `{ scriptId }`             |
| `prompter.load`        | `prompter:load`                  | `{ text, title?, language? }`                | `{ scriptId }`             |
| `prompter.control`     | `prompter:control`               | `{ action, wordIndex? }`                     | `null`                     |
| `prompter.getState`    | `prompter:events`                | `{}`                                         | `PrompterState`            |
| `prompter.subscribe`   | `prompter:events`                | `{}`                                         | `null`; then `event`s      |
| `prompter.unsubscribe` | `prompter:events`                | `{}`                                         | `null`                     |
| `files.import`         | `files:import`                   | `{ accept?, maxBytes? }`                     | `ImportedFileData \| null` |
| `net.fetch`            | the sandbox's network permission | `{ url, method, headers, body?, timeoutMs }` | `NetResponseData`          |
| `settings.get`         | none (`null`)                    | `{}`                                         | settings object            |

`action` is `play`, `pause`, `toggle`, `restart`, `seek` or `close`. Binary data
travels as base64 strings:

- `ImportedFileData`: `{ name, type, size, data }`.
- `NetResponseData`: `{ status, url, headers, body }`.
- `net.fetch`'s request `body`, when present.

## Events

Returned by `GET <base>/events`:

```json
[
  {
    "v": 1,
    "type": "event",
    "name": "prompter.state",
    "data": {
      "sessionActive": true,
      "playing": false,
      "scriptId": "…",
      "title": "Keynote",
      "wordIndex": 6,
      "wordCount": 640
    }
  },
  { "v": 1, "type": "event", "name": "settings.changed", "data": { "autoOpen": false } }
]
```

`prompter.state` goes only to a sandbox that holds `prompter:events` and has
called `prompter.subscribe`. `settings.changed` goes to every sandbox of the pack.

## Logs, errors and the watchdog

```json
{ "v": 1, "type": "log", "level": "info", "args": ["word", "12"] }
{ "v": 1, "type": "error", "message": "boom", "stack": "…", "fatal": false }
```

- `log` levels: `debug`, `info`, `warn`, `error`. `args` are strings, each up to
  4 KiB; the bootstrap converts values with `String()` or JSON. The app keeps
  them in the pack's log (Developer mode), with the sandbox's denials.
- `error` reports uncaught errors and unhandled rejections. `fatal: true` means
  `main` couldn't load; the sandbox is stopped and counts as a crash.
- **Heartbeat.** A live sandbox always has an `events` poll waiting or starts
  the next one straight away. One that hasn't polled for 10 seconds is hung
  (a busy loop can't start a new request): it's stopped and counts as a crash.
- A crashed sandbox is restarted. 3 crashes of a pack's sandboxes within 5
  minutes switch the pack off with the reason; the user can switch it back on.
