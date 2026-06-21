/* ============================================================
   eyeread.in · marketing site — i18n setup (i18next)
   ------------------------------------------------------------
   One i18next instance shared by the whole site. We use i18next
   for the resource store + interpolation and react-i18next for
   the React bindings, and i18next-browser-languagedetector to:
     1. read a remembered choice from localStorage,
     2. otherwise honour the <html lang> a prerendered page was
        served with (so /es/ boots Spanish),
     3. otherwise fall back to the browser's languages.

   The locale data (bundles, native names, regions, URLs) lives
   in ./registry.js — pure data with no browser deps, so the
   build-time prerender script can import it too. Add a language
   there; this file just wires the live instance on top.
   ============================================================ */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import { DEFAULT_LOCALE, locales, resources } from './registry.js';

// Re-export the registry so existing app imports (`from './i18n/index.js'`)
// keep working, while build scripts can import './registry.js' directly.
export {
  DEFAULT_LOCALE,
  SITE_URL,
  locales,
  localeGroups,
  localePath,
  resources,
} from './registry.js';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: locales.map((l) => l.code),
    // Match "en-US" → "en" etc. so browser regional tags still resolve.
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    detection: {
      // Remembered choice first; then the <html lang> a prerendered per-locale
      // page was served with (so /es/ boots Spanish); then the browser.
      order: ['localStorage', 'htmlTag', 'navigator'],
      lookupLocalStorage: 'eyeread.locale',
      caches: ['localStorage'],
    },
    interpolation: {
      // React already escapes; structured copy is trusted authored content.
      escapeValue: false,
    },
    returnObjects: true,
  });

// Keep <html lang="…"> in sync with the active language for a11y + SEO.
const syncHtmlLang = (lng) => {
  if (typeof document !== 'undefined' && lng) {
    document.documentElement.lang = lng.split('-')[0];
  }
};
syncHtmlLang(i18n.resolvedLanguage || i18n.language);
i18n.on('languageChanged', syncHtmlLang);

export default i18n;
