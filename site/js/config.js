/* ============================================================
   eyeread.in · marketing site — content configuration
   ------------------------------------------------------------
   SINGLE SOURCE OF TRUTH for everything on the page that changes.
   Editing copy, links, features, steps, or the Open Collective
   slug? Do it here — no need to touch markup or styles.
   ============================================================ */

export const config = {
  // ---- Brand & global links ----------------------------------
  brand: {
    name: 'eyeread',
    tld: '.in',
    logo: 'assets/logos/eyeread-mark-bounded-dark.svg',
  },

  links: {
    github: 'https://github.com/omniship-labs/eyeread',
    repo: 'omniship-labs/eyeread',
    license: 'https://github.com/omniship-labs/eyeread/blob/main/LICENSE',
    docs: '#',
    discord: '#',
    download: '#',
    appStore: '#',
  },

  // ---- Top navigation ----------------------------------------
  nav: {
    cta: 'Download free',
    githubLabel: 'GitHub',
  },

  // ---- Hero ---------------------------------------------------
  hero: {
    eyebrow: 'Invisible to screen-share',
    star: 'Star on GitHub',
    // `emphasis` is rendered in the accent color.
    headline: ['Look at the lens.', { emphasis: 'Not your notes.' }],
    subhead:
      'eyeread.in floats your script over any screen as a glass overlay. It follows your voice — and never shows up in a recording.',
    note: 'Free forever · AGPL-3.0 · No account required',
    primaryCta: { label: 'Download for macOS', href: '#' },
    secondaryCta: { label: 'View on GitHub', href: 'https://github.com/omniship-labs/eyeread' },
  },

  // ---- Live demo (before/after reveal) -----------------------
  demo: {
    cameraBadge: 'Camera · eyeread.in hidden from recording',
    invisibleBadge: 'Hidden from all screen-share software',
    slide: {
      eyebrow: 'Q3 All-Hands · Acme Corp',
      heading: ['Building for the', 'next ten years'],
    },
    overlay: {
      timer: '01:24',
      tag: 'Invisible',
      spoken: 'We have an incredible team and a clear ',
      active: 'roadmap',
      upcoming: ' — what we need now is focus, not just speed. Let the results speak.',
    },
  },

  // ---- Features ----------------------------------------------
  features: {
    eyebrow: 'What makes it different',
    heading: 'Built for how people actually present.',
    items: [
      {
        icon: 'eye-off',
        title: 'Invisible to every recorder',
        body: 'eyeread.in renders outside the captured frame. Zoom, Loom, OBS, QuickTime — none of them see it. Your audience only sees the content.',
        tag: 'Screen-share safe',
      },
      {
        icon: 'mic',
        title: 'Voice tracking',
        body: "Speak, and the script follows. The current word glows. What you've said fades. No tapping, no foot pedal — just talk.",
        tag: 'Auto-scroll',
      },
      {
        icon: 'aperture',
        title: 'Near the camera',
        body: 'The overlay anchors just below your webcam. Your eyes naturally land on the lens — not the corner of the screen. You look present.',
        tag: 'Eye contact',
      },
    ],
  },

  // ---- How it works ------------------------------------------
  how: {
    eyebrow: 'How it works',
    heading: 'Open it. Paste your script. Talk.',
    steps: [
      {
        title: 'Paste or type your script',
        body: 'Drop in anything — a keynote, a YouTube script, talking points, interview answers. eyeread.in works with plain text.',
      },
      {
        title: 'Position the overlay',
        body: 'Drag it near your camera. Adjust font size, opacity, and speed. It floats above every other window.',
      },
      {
        title: 'Start talking',
        body: 'Voice detection takes over. The active word is highlighted. The text scrolls as you speak. Hit record whenever you’re ready.',
      },
    ],
    preview: {
      header: 'Voice tracking active · 00:42',
      spoken: 'Thank you all for being here today. I want to talk about something that ',
      active: 'matters',
      upcoming:
        ' more than any quarterly number — the people we serve and the trust they place in us.',
      caption: '↑ The overlay — only you can see this',
    },
  },

  // ---- Open source -------------------------------------------
  oss: {
    heading: 'Free, open source, and honest about it.',
    body: 'eyeread.in is fully open source. Read the code, audit it, fork it, contribute to it. No tracking, no telemetry, no subscription. If it helps you — donate voluntarily.',
    repoBadge: 'AGPL-3.0',
    guarantees: [
      {
        icon: 'check',
        title: 'No account required',
        body: 'Download and use immediately — no sign-up, no email',
      },
      {
        icon: 'check',
        title: 'No telemetry',
        body: 'Nothing leaves your machine. Your scripts stay private.',
      },
      {
        icon: 'info',
        title: 'macOS only · native app',
        body: 'The overlay requires OS-level window layering. macOS only for now.',
      },
      {
        icon: 'heart',
        title: 'Donation-supported',
        body: 'If eyeread.in helps you, pay it forward — no pressure',
      },
    ],
  },

  // ---- Backers & sponsors (live from Open Collective) --------
  // Data is fetched in the browser at page load from:
  //   https://opencollective.com/<slug>/members/all.json
  sponsors: {
    eyebrow: 'Backed by the community',
    heading: 'Backers & sponsors',
    subhead:
      'eyeread.in is funded entirely by people who believe in honest, open tools. These are the humans keeping it free.',
    // Open Collective slug — change this to point at a different collective.
    collectiveSlug: 'eyereadin',
    // Lifetime total (USD) at or above which a contributor is shown as a Sponsor.
    sponsorThreshold: 100,
    ctaLabel: 'Become a backer',
    ctaHref: 'https://opencollective.com/eyereadin',
    emptyMessage: 'Be the first to back eyeread.in →',
    errorMessage: 'Couldn’t load backers right now. View them on Open Collective →',
  },

  // ---- Footer -------------------------------------------------
  footer: {
    links: [
      { label: 'GitHub', href: 'https://github.com/omniship-labs/eyeread' },
      { label: 'Docs', href: '#' },
      { label: 'Discord', href: '#' },
      {
        label: 'AGPL-3.0',
        href: 'https://github.com/omniship-labs/eyeread/blob/main/LICENSE',
        mono: true,
      },
    ],
    copy: 'Free forever',
  },

  // ---- <head> meta (also used for social share cards) --------
  meta: {
    title: 'eyeread.in — Look at the lens.',
    description:
      'Open source teleprompter. Floats your script over any screen, invisible to every recorder. Voice tracking built in. Free.',
    url: 'https://eyeread.in',
    ogImage: 'https://eyeread.in/og-image.png',
    twitter: '@eyeread_in',
  },
};

export default config;
