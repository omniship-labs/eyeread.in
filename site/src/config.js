/* ============================================================
   eyeread.in · marketing site — content configuration
   ------------------------------------------------------------
   Translatable COPY now lives per-language under ./i18n/*.js
   (English `en.js` is the source of truth). This file holds the
   NON-translatable structure — brand, links, icons, the Open
   Collective slug — and weaves it together with the active
   locale's strings via buildConfig().

   Components read the result through useConfig() (below), which
   re-renders whenever the language changes. Editing copy? Edit
   the locale files. Editing links/icons/slug? Edit `shared`.
   ============================================================ */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LOCALE } from './i18n/index.js';

// ---- Non-translatable structure ------------------------------
export const shared = {
  brand: {
    name: 'eyeread',
    tld: '.in',
  },

  links: {
    github: 'https://github.com/omniship-labs/eyeread.in',
    repo: 'omniship-labs/eyeread.in',
    license: 'https://github.com/omniship-labs/eyeread.in/blob/main/LICENSE',
    docs: '/docs',
    discord: 'https://discord.gg/4CyywbGyAu',
    download: '/download',
  },

  // Hero CTA destinations (labels come from the locale).
  hero: {
    primaryHref: '/download',
    secondaryHref: 'https://github.com/omniship-labs/eyeread.in',
  },

  // Feature icons, in the same order as each locale's features.items.
  featureIcons: ['eye-off', 'mic', 'aperture'],

  // SPDX id — a fixed string, never translated.
  ossRepoBadge: 'AGPL-3.0',
  // Guarantee icons, in the same order as each locale's oss.guarantees.
  ossIcons: ['check', 'check', 'info', 'heart'],

  // Compatibility section — the matrix rows live in ./data/compat.js;
  // only this report link is non-translatable here.
  compat: {
    reportHref:
      'https://github.com/omniship-labs/eyeread.in/issues/new?template=3-compat-report.yml',
  },

  // Backers & sponsors. Data is fetched in the browser at page load from
  // https://opencollective.com/<slug>/members/all.json
  sponsors: {
    // Open Collective slug — change this to point at a different collective.
    collectiveSlug: 'omniship',
    // Lifetime total (USD) at or above which a contributor is shown as a Sponsor.
    sponsorThreshold: 100,
    ctaHref: 'https://opencollective.com/omniship',
  },

  // The OmniShip Labs collective card above the footer. The org name is a
  // brand lockup and never translated; the copy comes from each locale.
  collective: {
    href: 'https://omniship.dev',
  },

  // Footer link destinations, in the same order as each locale's footer.links.
  footerLinks: [
    { href: 'https://github.com/omniship-labs/eyeread.in' },
    { href: '/docs' },
    { href: 'https://discord.gg/4CyywbGyAu' },
    { href: 'https://github.com/omniship-labs/eyeread.in/blob/main/LICENSE', mono: true },
  ],
};

// ---- Weave locale strings + shared structure into one config -
// `m` is a locale message bundle (the shape of ./i18n/en.js).
export function buildConfig(m) {
  return {
    brand: shared.brand,
    links: shared.links,

    meta: m.meta,

    nav: m.nav,

    hero: {
      ...m.hero,
      primaryCta: { label: m.hero.primaryCta, href: shared.hero.primaryHref },
      secondaryCta: { label: m.hero.secondaryCta, href: shared.hero.secondaryHref },
    },

    demo: m.demo,

    features: {
      eyebrow: m.features.eyebrow,
      heading: m.features.heading,
      items: m.features.items.map((it, i) => ({ ...it, icon: shared.featureIcons[i] })),
    },

    how: m.how,

    oss: {
      heading: m.oss.heading,
      body: m.oss.body,
      repoBadge: shared.ossRepoBadge,
      guarantees: m.oss.guarantees.map((g, i) => ({ ...g, icon: shared.ossIcons[i] })),
    },

    compat: {
      ...m.compat,
      reportHref: shared.compat.reportHref,
    },

    sponsors: {
      ...m.sponsors,
      ...shared.sponsors,
    },

    collective: {
      ...m.collective,
      ...shared.collective,
    },

    footer: {
      links: m.footer.links.map((label, i) => ({ label, ...shared.footerLinks[i] })),
      copy: m.footer.copy,
    },

    download: m.download,

    switcher: m.switcher,
  };
}

// ---- React hook: the active-locale config --------------------
// Re-renders on language change (useTranslation subscribes to it).
export function useConfig() {
  const { i18n } = useTranslation();
  return useMemo(() => {
    const lng = i18n.resolvedLanguage || i18n.language || DEFAULT_LOCALE;
    const messages =
      i18n.getResourceBundle(lng, 'translation') ||
      i18n.getResourceBundle(DEFAULT_LOCALE, 'translation');
    return buildConfig(messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.resolvedLanguage, i18n.language]);
}
