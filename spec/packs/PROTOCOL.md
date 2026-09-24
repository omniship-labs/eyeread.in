# Host ↔ sandbox protocol (v1)

How the pack host talks to each sandbox frame. Packs never see this: the app's
bootstrap script inside the frame turns it into the `eyeread.*` API. Every
message shape is in [`protocol.schema.json`](protocol.schema.json).

## Transport

1. The host creates the sandbox frame and a `MessageChannel`.
2. When the frame loads, the host posts **one** message to it with
   `postMessage(init, '*', [port2])`. The bootstrap takes the port from that first
   message, then ignores `window` messages for good.
3. Everything after that goes over the port. The host keeps one port per
   sandbox, so a message's sandbox (and pack) is known from the port it arrived
   on, never from its contents.

Messages are plain objects (structured clone). Every message has `"v": 1` and a
`type`. A message over 8 MiB, or one that doesn't match the schema, is dropped
and logged; a sandbox that keeps sending them counts as crashing.

## Start-up

```
host                                    sandbox
 │── init (+port) ───────────────────────▶│  bootstrap installs `eyeread`, imports main
 │◀────────────────────────────── ready ──│  handlers registered during evaluation
 │── activate {permission} ──────────────▶│  handler(ctx) called, once per permission
 │── activate {permission} ──────────────▶│
```

- **`init`** (host → sandbox): `pack` (`id`, `version`, `name`), `sandbox` (`id`,
  `permissions` it may activate, and `network`: whether `net` exists), and
  `settings` (current values).
- **`ready`** (sandbox → host): `handlers`, the permissions the pack registered.
  Sent after `main` has finished evaluating. If `main` throws or fails to load,
  the sandbox sends `error` with `fatal: true` instead.
- **`activate`** (host → sandbox): `permission`. Sent once per permission that is
  in the sandbox, registered, and allowed. There is no `deactivate`: revoking a
  permission destroys the sandbox, and the host starts a new one without it.

## Calls

```json
{ "v": 1, "type": "call", "id": 7, "permission": "prompter:control", "method": "prompter.control", "params": { "action": "seek", "wordIndex": 40 } }
{ "v": 1, "type": "result", "id": 7, "ok": true, "value": null }
{ "v": 1, "type": "result", "id": 8, "ok": false, "error": { "code": "E_NO_SESSION", "message": "The prompter isn't open." } }
```

`id` is a positive integer, unique per sandbox while the call is pending. Every
call gets exactly one `result`. The host checks, in order: the sandbox holds
`permission`, the method belongs to `permission`, the user's grant is on
(internet too, for `net.fetch`), then the arguments.

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

`action` is `play`, `pause`, `toggle`, `restart`, `seek` or `close`.

- `ImportedFileData`: `{ name, type, size, data: ArrayBuffer }`.
- `NetResponseData`: `{ status, url, headers, body: ArrayBuffer }`.
- `net.fetch` `body` is an `ArrayBuffer` (the bootstrap encodes strings as UTF-8).

## Events (host → sandbox)

```json
{ "v": 1, "type": "event", "name": "prompter.state", "data": { "sessionActive": true, "playing": false, "scriptId": "…", "title": "Keynote", "wordIndex": 6, "wordCount": 640 } }
{ "v": 1, "type": "event", "name": "settings.changed", "data": { "autoOpen": false } }
```

`prompter.state` is sent only after `prompter.subscribe`, and only to a sandbox
holding `prompter:events`. `settings.changed` goes to every sandbox of the pack.

## Logs, errors and the watchdog

```json
{ "v": 1, "type": "log", "level": "info", "args": ["word", "12"] }
{ "v": 1, "type": "error", "message": "boom", "stack": "…", "fatal": false }
{ "v": 1, "type": "ping", "seq": 31 }
{ "v": 1, "type": "pong", "seq": 31 }
```

- `log` levels: `debug`, `info`, `warn`, `error`. `args` are strings, each up to
  4 KiB; the bootstrap converts values with `String()` or JSON.
- `error` reports uncaught errors and unhandled rejections. `fatal: true` means
  `main` couldn't load.
- The host sends `ping` every 2 seconds; the sandbox answers `pong` with the same
  `seq`. No `pong` for 10 seconds means the sandbox is hung.
