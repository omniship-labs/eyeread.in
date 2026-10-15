# Build packs for eyeread.in

Packs let you build on eyeread.in without touching the app's code: send scripts
from your notes app, drive the prompter from a foot pedal, start a recording
when reading starts. Users install packs in Settings → Packs and decide, per
permission, what each one may do and whether it may use the internet.

This page is the guide. The exact rules live in the spec:
[format](../spec/packs/FORMAT.md), [API](../spec/packs/API.md) and
[types](../spec/packs/eyeread.d.ts). If you'd rather write a separate program
in any language, see [Connected apps](PACKS.md#connected-apps) instead.

## Concepts

- **A pack** is a `.zip` holding a `pack.json` manifest and your code, under
  any license you like. One big `main.js` is fine; no special structure is needed.
- **Permissions** are what your pack can do. You declare them in `pack.json`,
  and the user switches each one on. They all start off.
- **Internet is per permission.** A permission can declare the exact
  `https://` sites it needs. It gets internet only for those sites, and only
  once the user switches it on.
- **Sandboxes.** The app runs your code with no DOM, no storage and no direct
  network. It splits your pack by permission: each permission with internet
  gets its own sandbox, and all the offline ones share one. You write one
  program; the app does the splitting.
- **Bundles.** A pack can include other packs, like a mod pack. A pack used by
  several bundles is installed once and keeps one set of settings.
- **Badges.** Unsigned packs install as **Community**, with a warning. Packs
  that pass review are signed by OmniShip and show **✓ Verified by
  eyeread.in**.

## Your first pack

1. Open Settings → Packs, switch to the Advanced view, and turn on
   **Developer mode**.
2. Click **New pack…**, give it a name and pick a folder. You get `pack.json`,
   a commented `main.js`, an AGPL `LICENSE` (swap it for your own if you like)
   and a `README.md`, and the pack is
   loaded straight away with a **Dev** badge.
3. Turn on its permissions in the pack's screen, then edit `main.js`. The pack
   reloads within a second of each save.
4. Watch the pack's **Log** for console output, errors, permission denials and
   network requests.
5. **Validate**, then **Build pack** writes `<id>-<version>.zip` next to the
   folder, ready to share or submit.

## The manifest

```json
{
  "apiVersion": 1,
  "id": "com.example.notion-sync",
  "name": "Notion Sync",
  "version": "1.2.0",
  "description": "Sends a Notion page to your library. Sends the page ID to api.notion.com.",
  "author": { "name": "Ada Example", "url": "https://example.com" },
  "license": "AGPL-3.0-only",
  "main": "main.js",
  "permissions": {
    "scripts:write": { "network": ["https://api.notion.com"] },
    "prompter:control": {}
  },
  "settings": [{ "key": "pageId", "type": "text", "label": "Notion page ID" }]
}
```

The `id` never changes between versions. Unknown fields are rejected, so the
manifest means exactly what the user is shown. Every field is in
[FORMAT.md](../spec/packs/FORMAT.md#packjson).

## Keyboard and mouse

`prompter:control` can also receive the user's keys and mouse, through an
`input` option. It is off until the user turns it on for the pack.

```json
"permissions": {
  "prompter:control": { "input": { "keyboard": { "keys": ["ArrowRight", "ArrowLeft"] } } }
}
```

```js
eyeread.on('prompter:control', ({ prompter, keys }) => {
  if (!keys) return; // not declared, or the user hasn't allowed input
  keys.onKey((e) => {
    if (e.type !== 'down' || e.repeat) return;
    if (e.code === 'ArrowRight') prompter.advance(1);
    if (e.code === 'ArrowLeft') prompter.advance(-1);
  });
});
```

Things to know:

- Events are the physical key (`code`), never the character, and only while
  eyeread.in is focused. Keys pressed in a text field are never delivered.
- If the pack can also reach the internet, its input has to be **narrow**: at
  most 8 named keys, at most 3 named mouse buttons, no wheel, no pointer
  position, focused scope. Otherwise install fails with
  `PACK_INPUT_PACK_NETWORK`, naming the limit. The same test applies to every
  pack in a bundle.
- Input may only drive the prompter. Don't encode it into anything else; see
  the content policy.
- Users see the exact keys, and the sites if there are any, before they install
  and when they turn input on.

Full details are in [`spec/packs/FORMAT.md`](../spec/packs/FORMAT.md#input-keyboard-and-mouse).

## Permissions

| Permission         | Lets the pack                                                                     |
| ------------------ | --------------------------------------------------------------------------------- |
| `scripts:write`    | Add scripts to the library                                                        |
| `prompter:load`    | Open text in the prompter and start a reading session                             |
| `prompter:control` | Play, pause, restart, seek, advance or close the prompter                         |
| `prompter:events`  | Read the prompter's state; the script is only described during an active session  |
| `files:import`     | Ask the user to pick a file with the app's own picker, and receive only that file |

Ask for as few as you need: users see every one, and no permission can read
their library.

## One handler per permission

Register a handler for each permission, at the top level of `main.js`. The app
calls it once, with only that permission's API:

```js
eyeread.on('scripts:write', async ({ scripts, net, settings }) => {
  const { pageId } = await settings.get();
  const res = await net.fetch(`https://api.notion.com/v1/blocks/${pageId}/children`);
  await scripts.add({ title: 'From Notion', text: toPlainText(await res.json()) });
});

eyeread.on('prompter:control', ({ prompter }) => {
  // e.g. map a key or pedal to prompter.toggle()
});
```

A handler only runs if its permission is declared, switched on by the user, and
belongs to that sandbox. If the user revokes a permission or switches internet
off, its sandbox restarts without it. Because sandboxes share nothing, keep
state in declared settings or in memory, not in globals shared between
handlers.

## Internet rules

- Declare exact origins: `https://`, a host name, and optionally a port. No
  paths, wildcards, IP addresses or `localhost`. Up to 16 per permission.
- Call them with `net.fetch`. The app makes the request, checks it against the
  sites you declared, and refuses anything else, including redirects to
  another site.
- No cookies, 60 requests a minute, 1 MiB up and 5 MiB down per request.
- Every request appears in the pack's **network log**, which the user can see.
- Say in your description what you send and where. Verified packs are
  reviewed for it.

Full rules: [API.md, `net.fetch`](../spec/packs/API.md#netfetchurl-init--promisenetresponse).

## Settings

Declare options in `settings` and the app draws them with its own controls:
`toggle`, `select`, `number` and `text`. Read them with `settings.get()` and
watch them with `settings.onChange()`. There's no secret type yet, so don't ask
users for passwords or API keys you'd need to keep hidden.

## Bundles

List the packs you include in `includes`, and put each one in
`packs/<id>/` inside your zip. Each is validated and signed on its own, and a
bundle is Verified only if every pack in it is. See
[Bundles](../spec/packs/FORMAT.md#bundles).

## Rules the installer enforces

- **License:** any. Say which in `license` (an SPDX identifier such as `MIT`
  is best); the app shows it to users.
- **Readable source:** minified code is rejected. Ship the source you wrote.
- **Files:** JS, JSON, Markdown, text, CSS and images. No HTML, WebAssembly
  or native code.
- **Size:** 20 MiB in total, 5 MiB per file, 500 files.

The app's installer, Developer mode and the CLI run the same checks, in the
same order, with the same messages ([`errors.json`](../spec/packs/errors.json)).

## Command-line tools

The scaffold, CLI and types live in the SDK,
[`omniship-labs/eyeread.in-packs-sdk`](https://github.com/omniship-labs/eyeread.in-packs-sdk),
which also has [authoring rules](https://github.com/omniship-labs/eyeread.in-packs-sdk/blob/main/docs/PACK_AUTHORING.md)
for AI coding agents:

```bash
npm create @omniship-labs/eyeread.in-packs my-pack   # scaffold
npx @omniship-labs/eyeread.in-packs validate          # same checks as the app
npx @omniship-labs/eyeread.in-packs build             # writes the zip and files.json
```

They aren't on npm yet. Until they are, run them from a clone of the SDK repo
(its README shows how), or use Developer mode's **New pack**, **Validate** and
**Build pack**.

## Sharing your pack

- **Community:** share the zip however you like. Users see a warning and must
  tick "I understand the risks" before installing.
- **Verified:** submit it for review, below.

You may charge for your pack, or for some of its features, as long as its
full source stays readable in the pack, license checks included. Say what's
paid in the description, and take payment outside the app. Buyers can read
all of the code, so whether they may share or change it depends on the license
you choose. See the
[content policy](../PACK_POLICY.md#7-paid-packs-must-still-show-their-code).

### Getting Verified

Your pack stays in your own repo, under your license. The packs repo,
`omniship-labs/eyeread.in-packs`, only stores a reference to each version and
OmniShip's signature for it.

1. **Publish a release** in your repo: tag the version (for example `v1.2.0`)
   and attach the zip from `npx @omniship-labs/eyeread.in-packs build`.
2. **Open a pull request** in the packs repo adding an entry for that version:
   your repo, the tag, the commit it points to, the zip's URL and its pack hash
   (`build` prints it).
3. **Automated checks** download the zip, check that it matches the commit and
   the pack hash, validate it, and summarize what changed since the last
   Verified version, with new permissions and sites highlighted.
4. **A maintainer reviews** it against the review checklist and the
   [content policy](../PACK_POLICY.md). **Target: 2 weeks.**
5. **Once approved**, the maintainer signs it offline and adds the signature
   next to your entry. Signing never happens in CI. You also get the signature
   file: add it to your zip as `files.json.minisig` and re-upload it, so copies
   people install by hand show as Verified too. Adding it doesn't change the
   pack hash.

**The zip URL** can be on any host, but it must be `https://`, download the zip
directly with no login, and never change for that version (no
`/releases/latest/…` links). The packs repo checks every link daily. If a zip
disappears for several days, or its contents change, the pack is withdrawn:
it's hidden from the catalog and shows as Community on installed copies.

**Updates** are a new release and a new entry, and get a diff-only review.
Every version is signed separately, and users keep the last Verified version
until the new one is signed. If an update asks for new permissions or sites,
users approve it again.
