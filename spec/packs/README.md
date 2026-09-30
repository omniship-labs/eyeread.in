# Packs spec (v1)

This folder is the contract for **packs**: installable, sandboxed JS packages for
eyeread.in. Everything that reads, writes, validates or runs a pack builds
against it: the installer (#120), signature checks (#121), the pack host (#122),
the network proxy (#123), the permission broker (#124), the Settings UI (#125)
and Developer mode (#126) here in the app, and the creator CLI, scaffold and
types package in [`omniship-labs/eyeread.in-packs-sdk`](https://github.com/omniship-labs/eyeread.in-packs-sdk) (#127).

> **Home.** The spec's canonical home is now
> [`omniship-labs/eyeread.in-packs-sdk`](https://github.com/omniship-labs/eyeread.in-packs-sdk),
> which also hosts `@omniship-labs/eyeread.in-packs` (the `validate`/`build`
> CLI), `create-eyeread.in-packs` (the `npm create` scaffold) and
> `eyeread.in-packs-types`. This folder is a **pinned copy**, kept in sync by
> hand for now (there's no automated sync yet — when you change anything here,
> port the same change to the SDK repo, and vice versa). Nothing about the
> file layout changed by the move.

| File                                           | What it is                                                                   |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| [`FORMAT.md`](FORMAT.md)                       | The pack file: layout, `pack.json`, `files.json`, signature, bundles, limits |
| [`API.md`](API.md)                             | The `eyeread.*` API a pack's code calls, and its error codes                 |
| [`PROTOCOL.md`](PROTOCOL.md)                   | The host ↔ sandbox message protocol                                          |
| [`pack.schema.json`](pack.schema.json)         | JSON Schema (2020-12) for `pack.json`                                        |
| [`files.schema.json`](files.schema.json)       | JSON Schema (2020-12) for `files.json`                                       |
| [`protocol.schema.json`](protocol.schema.json) | JSON Schema (2020-12) for every protocol message                             |
| [`errors.json`](errors.json)                   | Validation error codes and their messages, shared by the app and the CLI     |
| [`eyeread.d.ts`](eyeread.d.ts)                 | TypeScript declarations for the `eyeread.*` API                              |
| [`fixtures/`](fixtures)                        | Valid and invalid packs, with expected results in `fixtures/expected.json`   |

## Versioning

- The spec version is the pack `apiVersion`. This is **v1**.
- Within v1, new optional manifest fields, new API methods and new error codes
  can be added. Packs must ignore API fields they don't know. Anything that would
  break an existing v1 pack needs `apiVersion: 2`.
- The app lists the `apiVersion`s it runs. A pack with any other `apiVersion` is
  rejected at install with `PACK_API_VERSION`.

## Checking the spec

```bash
npx vitest run spec/packs   # the schemas accept/reject every fixture as expected
npm run spec:types          # eyeread.d.ts compiles (tsc --noEmit)
```

## Naming

The feature is called **packs** everywhere: UI, docs, code and file names. The
local HTTP API for external programs is **Connected apps** (Settings → Packs →
Connected apps). It shares the permission names below but isn't part of this
spec; see [`docs/PACKS.md`](../../docs/PACKS.md).
