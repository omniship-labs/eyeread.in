/* ============================================================
   eyeread.in · marketing site — developer docs copy (English)
   ------------------------------------------------------------
   This is the `docs` i18next namespace bundle. Only English
   exists for now; every other locale falls back to it via
   i18next `fallbackLng` (see ../i18n/index.js), so the docs
   render in English regardless of the visitor's language until
   a translation is added.

   To add a language: create ./content.<code>.js mirroring this
   shape, import it in ../i18n/index.js, and add it to the
   `docs` namespace resources. Translate the prose here — the
   technical literals (commands, file paths, API signatures,
   code blocks) live in the page components and stay constant.

   Node-safe (plain data, no browser/JSX deps) so the build-time
   prerender can read each page's <title>/description from it.
   ============================================================ */
export default {
  // In-nav button + the docs section label.
  nav: { label: 'Docs' },

  layout: {
    eyebrow: 'Developer docs',
    sidebarHeading: 'Documentation',
    onThisSite: 'On this page',
    editPrefix: 'Edit this page',
    editSuffix: 'on GitHub',
    backHome: 'Back to eyeread.in',
  },

  index: {
    nav: 'Overview',
    title: 'Developer docs',
    description:
      'Build, run, and contribute to eyeread.in — an open-source teleprompter built with Tauri v2 (Rust) and React.',
    lead: 'Everything you need to build eyeread.in from source, find your way around the codebase, and ship a change.',
    intro: [
      'eyeread.in is a desktop teleprompter that floats your script as a glass overlay, invisible to screen recorders, with voice tracking built in. It is free and open source under AGPL-3.0.',
      'The app is a Tauri v2 shell — a Rust backend hosting a React + Vite front end. These docs cover the developer-facing pieces: building it, how the parts fit together, the Rust commands the UI calls, and how to contribute.',
    ],
    cardsHeading: 'Start here',
    cards: [
      {
        key: 'build',
        title: 'Build from source',
        body: 'Prerequisites, install, and the dev/build commands for both the web demo and the native app.',
      },
      {
        key: 'architecture',
        title: 'Architecture',
        body: 'The stack, the folder layout, the multi-window model, and where the design system lives.',
      },
      {
        key: 'contributing',
        title: 'Contributing',
        body: 'The CLA, what we are looking for, the PR checklist, and the lint/format gates CI enforces.',
      },
      {
        key: 'tauriApi',
        title: 'Tauri commands & API',
        body: 'The Rust commands the front end invokes, the plugins in use, and the cross-window event layer.',
      },
      {
        key: 'packs',
        title: 'Build packs',
        body: 'Extend eyeread.in with sandboxed packs: permissions, internet rules, Developer mode, and getting Verified.',
      },
    ],
    stackHeading: 'The stack at a glance',
  },

  build: {
    nav: 'Build from source',
    title: 'Build from source',
    description:
      'Prerequisites and the dev, build, and test commands for the eyeread.in desktop app and web demo.',
    lead: 'You can run the UI in a plain browser with no Rust toolchain, or build the full native app with Tauri.',
    prereqHeading: 'Prerequisites',
    prereqIntro: 'To build the native app you need:',
    prereqs: [
      'Rust (stable) — install via rustup.',
      'Node.js 24 or newer (the repo pins "node": ">=24").',
      'Your platform’s Tauri build dependencies — follow the official prerequisites guide.',
    ],
    prereqWebNote:
      'Only building the web demo? You can skip Rust entirely — npm and Node are enough.',
    cloneHeading: 'Clone & install',
    runHeading: 'Run it',
    runIntro:
      'There are two ways to run during development — the browser demo (fast, no native build) and the full Tauri app:',
    webNote:
      'npm run dev starts the Vite dev server and serves the UI in your browser. The platform layer (src/lib/tauri.js) falls back to BroadcastChannel + window.open so most of the app works without the native shell — handy for design review.',
    nativeNote:
      'npm run tauri dev builds the Rust shell and launches the real desktop app with the native windows, tray, and OS-level screen-capture exclusion.',
    buildHeading: 'Production builds',
    buildIntro:
      'Build the front-end bundle, or produce a distributable native binary for your current platform:',
    checksHeading: 'Tests, lint & formatting',
    checksIntro: 'The same gates CI runs — make these pass before opening a PR:',
    ciNote:
      'CI fails on lint or formatting errors, and Prettier checks YAML, JSON, and Markdown too — not just code. Run npm run format to auto-fix, then re-check.',
    platformHeading: 'Platform support',
    platformIntro:
      'Screen-capture invisibility maps to a real OS capability per platform. macOS and Windows are reliable; Linux is best-effort and officially experimental.',
    platforms: [
      {
        os: 'macOS',
        note: 'NSWindow.sharingType = .none — compositor-level exclusion. Rock solid.',
      },
      {
        os: 'Windows',
        note: 'SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE) on Windows 10 2004+ — DWM-level exclusion.',
      },
      {
        os: 'Linux',
        note: 'No portable per-window exclusion exists, so capture-hiding is best-effort only. Compatibility reports are especially welcome.',
      },
    ],
  },

  architecture: {
    nav: 'Architecture',
    title: 'Architecture',
    description:
      'How eyeread.in fits together: the Tauri + React stack, the folder layout, the window model, and the data layer.',
    lead: 'A Rust/Tauri shell hosts a React + Vite front end. Multiple native windows share one front-end build; the design system is the single source of truth for styling.',
    layoutHeading: 'Folder layout',
    layoutIntro: 'The pieces you’ll touch most often:',
    windowsHeading: 'The window model',
    windowsIntro:
      'The native shell opens several webview windows, each with its own entry point under src/windows/. They share one bundle but mount different roots:',
    windows: [
      { label: 'main', note: 'The library — manage scripts and settings.' },
      {
        label: 'overlay',
        note: 'The transparent, click-through teleprompter that floats over your screen.',
      },
      {
        label: 'settings',
        note: 'Preferences. Hidden (not destroyed) when closed so it can reopen.',
      },
      { label: 'about', note: 'The About window, opened from the app menu or Settings.' },
    ],
    windowsNote:
      'set_app_protected toggles capture exclusion across every window at once, so the shield applies uniformly.',
    designHeading: 'Design system',
    designBody: [
      'design/ is the single source of truth for tokens, components, and prototypes. The app imports design/styles.css directly — tokens are never duplicated into src/.',
      'The marketing site you’re reading this on lives in site/ and imports the same design tokens, so it stays visually in lockstep with the app with zero copies.',
    ],
    dataHeading: 'Data & platform layer',
    dataBody: [
      'Persistence is SQLite via tauri-plugin-sql. A migration creates two tables — scripts and settings — defined in src-tauri/src/lib.rs.',
      'src/lib/tauri.js is a thin platform layer. It detects whether it’s running inside Tauri and, in a plain browser, falls back to BroadcastChannel for cross-window events and window.open for windows — so the UI is reviewable on the web.',
    ],
  },

  contributing: {
    nav: 'Contributing',
    title: 'Contributing',
    description:
      'How to contribute to eyeread.in: the CLA, what we’re looking for, the PR checklist, and commit style.',
    lead: 'It’s a small, focused project. Contributions that sharpen the core experience are very welcome.',
    claHeading: 'Before you start',
    claBody:
      'By submitting a pull request you agree to the Contributor License Agreement. A bot asks you to sign it on your first PR — it takes about 30 seconds.',
    lookingHeading: 'What we’re looking for',
    looking: [
      'Bug fixes with a clear reproduction case.',
      'Performance improvements to voice tracking or scroll.',
      'Accessibility improvements.',
      'Tests for logic in src/lib/ and src/hooks/.',
      'Compatibility reports and compositor testing on Linux.',
    ],
    askFirstHeading: 'Ask first',
    askFirst: [
      'New UI screens or major features without prior discussion.',
      'Changes to the design tokens in design/ — they come from the design source of truth.',
      'Changes to CI, signing, or release config — these are code-owned and gated; open an issue first.',
    ],
    askFirstNote: 'Open an issue to discuss anything large before writing code.',
    checklistHeading: 'Pull request checklist',
    checklist: [
      'npm test passes.',
      'npm run lint passes.',
      'npm run format has been run.',
      'The PR description explains why, not just what.',
      'New logic has tests where practical.',
    ],
    commitHeading: 'Commit style',
    commitBody:
      'Plain imperative — “Fix voice match drift on long scripts”. No emoji, no ticket numbers required.',
  },

  tauriApi: {
    nav: 'Tauri commands & API',
    title: 'Tauri commands & API',
    description:
      'Reference for the Rust commands the eyeread.in front end invokes, the Tauri plugins in use, and the cross-window event layer.',
    lead: 'The front end talks to the Rust backend through a small set of Tauri commands, invoked with @tauri-apps/api.',
    commandsHeading: 'Commands',
    commandsIntro:
      'These are registered in src-tauri/src/lib.rs via invoke_handler and called from src/lib/tauri.js:',
    invokeHeading: 'Invoking from the front end',
    invokeIntro:
      'Call a command by its snake_case name; arguments are passed as a camelCase object. For example, toggling screen-capture exclusion:',
    pluginsHeading: 'Plugins',
    pluginsIntro: 'The native shell composes these Tauri plugins:',
    plugins: [
      { name: 'global-shortcut', note: 'Global hotkeys to toggle the overlay.' },
      { name: 'sql (SQLite)', note: 'Persistence for scripts and settings.' },
      { name: 'store', note: 'Lightweight key/value app state.' },
      { name: 'opener', note: 'Open URLs and files in the OS default app.' },
      { name: 'updater', note: 'Check for and install signed updates.' },
      { name: 'process', note: 'Restart the app after an update.' },
      { name: 'os', note: 'Detect the host platform at runtime.' },
      { name: 'window-state', note: 'Restore the main window’s position and size.' },
    ],
    eventsHeading: 'Cross-window events',
    eventsBody:
      'Windows coordinate over Tauri’s event system. The platform layer wraps emitTo so that, in a plain browser, the same calls fall back to a BroadcastChannel named “eyeread” — keeping multi-window behaviour working in the web demo.',
  },

  packs: {
    nav: 'Build packs',
    title: 'Build packs for eyeread.in',
    description:
      'Build sandboxed packs that extend eyeread.in: permissions, per-permission internet access, Developer mode, and the Verified review process.',
    lead: 'Packs let you build on eyeread.in without touching its code. Users decide, per permission, what each pack may do and whether it may use the internet.',
    conceptsHeading: 'Concepts',
    concepts: [
      'A pack is a .zip holding a pack.json manifest, an AGPL LICENSE and your code. One big main.js is fine.',
      'Permissions are what your pack can do. You declare them, and the user switches each one on. They all start off.',
      'Internet is per permission: a permission can declare the exact https:// sites it needs, and gets internet only for those, once the user allows it.',
      'The app runs your code in sandboxes with no DOM, storage or direct network. Each permission with internet gets its own sandbox; the offline ones share one.',
      'A pack can include other packs, like a mod pack. Shared packs are installed once and keep one set of settings.',
      'Unsigned packs install as Community, with a warning. Reviewed packs are signed by OmniShip and show ✓ Verified by eyeread.in.',
    ],
    firstHeading: 'Your first pack',
    firstIntro:
      'Everything can be done from the app: open Settings → Packs, switch to the Advanced view, and turn on Developer mode. New pack… creates a pack.json, a commented main.js, the license and a README, and loads it with a Dev badge. It reloads within a second of each save; Validate and Build pack produce the zip.',
    manifestHeading: 'The manifest',
    manifestIntro:
      'pack.json says who made the pack, what it may do, and which sites each permission may reach. Unknown fields are rejected, so it means exactly what the user is shown.',
    permissionsHeading: 'Permissions',
    permissions: [
      { name: 'scripts:write', note: 'Add scripts to the library.' },
      { name: 'prompter:load', note: 'Open text in the prompter and start a reading session.' },
      { name: 'prompter:control', note: 'Play, pause, restart, seek or close the prompter.' },
      {
        name: 'prompter:events',
        note: 'Read the prompter’s state; the script is only described during an active session.',
      },
      {
        name: 'files:import',
        note: 'Ask the user to pick a file with the app’s own picker, and receive only that file.',
      },
    ],
    permissionsNote:
      'Ask for as few as you need. Users see every one, and none can read their library.',
    handlerHeading: 'One handler per permission',
    handlerIntro:
      'Register a handler for each permission at the top level of main.js. The app calls it once, with only that permission’s API, and restarts its sandbox without it if the user revokes it.',
    netHeading: 'Internet rules',
    netRules: [
      'Declare exact origins: https://, a host name and an optional port. No paths, wildcards, IP addresses or localhost.',
      'Call them with net.fetch. The app makes the request and refuses any other site, including redirects elsewhere.',
      'No cookies, 60 requests a minute, 1 MiB up and 5 MiB down per request.',
      'Every request shows in the pack’s network log, which the user can see.',
      'Say in your description what you send and where.',
    ],
    rulesHeading: 'Rules the installer enforces',
    rules: [
      'AGPL only, with the license text in the pack.',
      'Readable source: minified code is rejected.',
      'JS, JSON, Markdown, text, CSS and images only. No HTML, WebAssembly or native code.',
      'Up to 20 MiB in total, 5 MiB per file and 500 files.',
    ],
    cliHeading: 'Command-line tools',
    cliIntro:
      'The scaffold, CLI and types live in the packs SDK repository. They aren’t on npm yet: until they are, run them from a clone of the SDK, or use Developer mode’s New pack, Validate and Build pack buttons, which run the same checks.',
    verifiedHeading: 'Getting Verified',
    verifiedIntro:
      'Anyone can share a pack as Community. For the ✓ Verified badge, submit it for review:',
    verifiedSteps: [
      'Open a pull request with your pack’s source in omniship-labs/eyeread.in-packs.',
      'Sign the Pack CLA. The CLA bot asks on your first pull request.',
      'Automated checks run: validation, a license check and, for updates, a summary of new permissions and sites.',
      'A maintainer reviews it against the checklist and the content policy. The target is 2 weeks.',
      'Once approved, it’s signed offline and published as a release. Signing never happens in CI.',
    ],
    verifiedNote:
      'Updates get a diff-only review. Users keep the last Verified version until the new one is signed, and approve again if it asks for new permissions or sites.',
    specHeading: 'Full reference',
    specIntro: 'The exact rules live in the spec and the creator guide in the repository:',
  },
};
