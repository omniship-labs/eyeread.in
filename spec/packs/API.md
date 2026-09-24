# The `eyeread.*` API (v1)

A pack's code runs in a sandbox with no network, no DOM of the app, and no Tauri
access. The only way out is the `eyeread` global. Types are in
[`eyeread.d.ts`](eyeread.d.ts).

```js
// main.js
eyeread.on('scripts:write', async ({ scripts, net, settings }) => {
  const { pageId } = await settings.get();
  const res = await net.fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
    headers: { 'Notion-Version': '2022-06-28' },
  });
  const text = toPlainText(await res.json());
  await scripts.add({ title: 'From Notion', text });
});

eyeread.on('prompter:events', ({ prompter }) => {
  prompter.onState((state) => console.log('word', state.wordIndex, 'of', state.wordCount));
});
```

## Sandboxes

The app splits a pack by permission, from what `pack.json` declares:

- Each permission that declares `network` gets **its own sandbox**. It loads the
  same `main` file, but only that permission's handler runs, and only that
  permission's API plus `net` is available.
- All permissions without `network` share **one offline sandbox**, where each of
  their handlers runs. There's no `net` there.
- Sandboxes can't share memory, storage or messages: each is its own hidden
  webview with an opaque origin and no Tauri access (see
  [`PROTOCOL.md`](PROTOCOL.md)). Settings flow one way, from the user into every
  sandbox.

So a pack is written as if it were one program, but each internet-connected
permission is isolated from the rest. A handler for a permission the pack
didn't declare, or the user didn't allow, is never called. When the user
revokes a permission or switches internet off, the affected sandbox is torn
down and started again without it.

## `eyeread.on(permission, handler)`

Registers the handler for a permission. Call it during the module's first
evaluation (top level, not after an `await`); registrations made later are
ignored. Registering the same permission twice keeps the last handler.

The handler is called **once**, after the module has loaded, if the permission
is declared, allowed by the user, and belongs to this sandbox. It gets a context
with that permission's API. It may be `async`; a rejection is logged as an error.

| Permission         | Context                                                                       |
| ------------------ | ----------------------------------------------------------------------------- |
| `scripts:write`    | `{ scripts: { add }, settings, net? }`                                        |
| `prompter:load`    | `{ prompter: { load }, settings, net? }`                                      |
| `prompter:control` | `{ prompter: { play, pause, toggle, restart, seek, close }, settings, net? }` |
| `prompter:events`  | `{ prompter: { getState, onState }, settings, net? }`                         |
| `files:import`     | `{ files: { import }, settings, net? }`                                       |

`net` is present only when the permission declares `network`.

### `scripts.add({ text, title?, language? })` → `Promise<{ scriptId }>`

Adds a script to the library. `text` is required and non-empty (up to 1 MiB);
`title` is up to 200 characters and defaults to the pack's name; `language` is
an optional BCP-47 tag for voice tracking, such as `en-US`. The library shows the
pack as the script's source.

### `prompter.load({ text, title?, language? })` → `Promise<{ scriptId }>`

Saves the script to the library (so the user has a record of what was shown, and
from where), opens it in the prompter and starts reading. It follows the same
path as the user pressing _Start reading_: the permissions check, window
placement and screen-share protection all apply.

### `prompter.play()`, `pause()`, `toggle()`, `restart()`, `close()`, `seek(wordIndex)` → `Promise<void>`

Drive the open prompter. `seek` clamps `wordIndex` to the script. Rejects with
`E_NO_SESSION` if the prompter isn't open. The overlay briefly shows which pack
did it ("Paused by Foot Pedal"). If two packs send conflicting commands, the most
recent wins.

### `prompter.getState()` → `Promise<PrompterState>`

```js
{
  sessionActive: true,
  playing: true,
  scriptId: 'da5lo9vcmue9rlyb',
  title: 'Keynote',
  wordIndex: 118,
  wordCount: 640,
}
```

With no active session, `scriptId` and `title` are `null` and the counters are
`0`. A script is only ever described while it's being read.

### `prompter.onState(callback)` → `unsubscribe()`

Calls `callback(state)` with the current state, then on every change, at most
about once every 150 ms.

### `files.import({ accept?, maxBytes? })` → `Promise<ImportedFile | null>`

Opens the app's own file picker, titled with the pack's name. Resolves with the
file the user chose, or `null` if they cancelled. The pack never sees a path or
the folder: only the file's name, type, size and contents.

- `accept`: file extensions to offer, such as `['.txt', '.md']`. Up to 16.
- `maxBytes`: reject larger files; at most, and by default, 10 MiB.

```js
{ name: 'notes.md', type: 'text/markdown', size: 1834, text(), bytes() }
```

`text()` decodes as UTF-8; `bytes()` returns a `Uint8Array`. Only one picker per
pack can be open at a time (`E_BUSY`).

### `net.fetch(url, init?)` → `Promise<NetResponse>`

Available only in a sandbox whose permission declares `network`, and also as
`eyeread.net` there. The request is made by the app, not the sandbox, and is
allowed only if **all** of these hold:

- the URL is `https://` and its origin is one of the sites declared for this
  permission;
- the user switched internet on for this permission;
- the pack is under its rate limit.

`init` takes `method` (`GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE`; default
`GET`), `headers` (a plain object), `body` (a string, `Uint8Array` or
`ArrayBuffer`) and `timeoutMs` (default 15 000, at most 30 000).

- No cookies are sent or kept, and no credentials are shared with anything else.
  The headers `Cookie`, `Host`, `Origin`, `Referer`, `Connection`,
  `Content-Length`, `Transfer-Encoding`, `Proxy-*` and `Sec-*` can't be set.
- A declared site whose name resolves only to a private, loopback or
  link-local address is refused (`E_NETWORK`): packs can't reach this machine
  or the local network. Requests go direct, not through a system proxy.
- Redirects are followed only to the **same origin**, at most 5. A redirect to
  another site fails with `E_NETWORK_DENIED`.
- Request bodies are capped at 1 MiB and responses at 5 MiB (`E_TOO_LARGE`).
- A pack can make 60 requests a minute across all its sandboxes
  (`E_RATE_LIMITED`).
- Every request is written to the pack's **network log**, shown to the user: time,
  permission, method, host, status and bytes in and out. Bodies are never logged.

```js
{ ok: true, status: 200, url: 'https://…', headers: { 'content-type': '…' }, text(), json(), bytes() }
```

`headers` keys are lowercase. `Set-Cookie` is removed.

## `eyeread.settings`

Available in every sandbox, and in each handler's context as `settings`.

- `get()` → `Promise<object>`: all declared settings, with defaults filled in.
- `onChange(callback)` → `unsubscribe()`: `callback(values)` after the user
  changes any setting.

## `eyeread.pack`

`{ id, version, name }`, read-only.

## `eyeread.apiVersion`

`1`.

## Logging

`console.debug`, `log`, `info`, `warn` and `error` go to the pack's log panel
(Developer mode). Arguments are converted to text. Uncaught errors and unhandled
rejections are logged as errors and count towards the crash limit.

## Errors

Every API method returns a Promise. Failures reject with an `EyereadError`: an
`Error` with a `code`.

```js
try {
  await prompter.pause();
} catch (err) {
  if (err.code === 'E_NO_SESSION') return;
  throw err;
}
```

| `code`               | Meaning                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `E_PERMISSION`       | The permission isn't granted, was revoked, or the method doesn't belong to it                     |
| `E_NETWORK_DENIED`   | Not a declared site for this permission, internet is off, not `https://`, or an off-site redirect |
| `E_NETWORK`          | Connection, DNS or TLS failure                                                                    |
| `E_TIMEOUT`          | The request took longer than `timeoutMs`                                                          |
| `E_TOO_LARGE`        | A request, response, file or message is over its limit                                            |
| `E_RATE_LIMITED`     | Too many network requests                                                                         |
| `E_INVALID_ARGUMENT` | A missing or malformed argument; `message` says which                                             |
| `E_NO_SESSION`       | The prompter isn't open                                                                           |
| `E_BUSY`             | A file picker from this pack is already open                                                      |
| `E_UNSUPPORTED`      | The method isn't available in this app version                                                    |
| `E_INTERNAL`         | A bug in eyeread.in                                                                               |

HTTP error statuses (404, 500…) aren't errors: they resolve with `ok: false`.

## Lifecycle and limits

- Enabled packs start when the app starts, and stop immediately when switched off,
  uninstalled or revoked.
- A sandbox that fails to load, or stops responding for 10 seconds, is stopped
  and restarted. After 3 of these in 5 minutes the pack is switched off with the
  reason shown; the user can switch it back on. (Uncaught errors are logged but
  don't stop the sandbox.)
- The sandbox has no `localStorage`, `IndexedDB`, cookies or service workers, and
  its origin is opaque. Keep state in declared settings, or in memory.
- It can't open windows, navigate, or load anything from outside its own pack.
