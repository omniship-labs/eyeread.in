/* ============================================================
   eyeread.in · desktop app — i18n setup (i18next)
   ------------------------------------------------------------
   One i18next instance shared by every window (main, overlay,
   settings, about). We use i18next for the resource store +
   interpolation, react-i18next for the React bindings, and
   i18next-browser-languagedetector to:
     1. read a remembered choice from localStorage, then
     2. fall back to the system / browser languages.

   The remembered choice uses the same localStorage key as the
   marketing site ('eyeread.locale'), so the web demo and the
   site agree on language. In the native app each Tauri window
   is its own webview but they share the app's localStorage
   origin, so a choice made in the main window is picked up by
   the overlay / settings / about windows the next time they
   open.

   Locale data (bundles, native names, regions) lives in
   ./registry.js — pure data with no browser deps — so tests can
   import it directly. This file just wires the live instance.
   ============================================================ */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import { DEFAULT_LOCALE, locales, resources } from './registry.js';

export { DEFAULT_LOCALE, locales, localeGroups, resources } from './registry.js';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: locales.map((l) => l.code),
    // Match "en-US" → "en" etc. so system regional tags still resolve.
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'eyeread.locale',
      caches: ['localStorage'],
    },
    interpolation: {
      // React already escapes; authored copy is trusted.
      escapeValue: false,
    },
  });

// Keep <html lang="…"> in sync with the active language for a11y.
const syncHtmlLang = (lng) => {
  if (typeof document !== 'undefined' && lng) {
    document.documentElement.lang = lng.split('-')[0];
  }
};
syncHtmlLang(i18n.resolvedLanguage || i18n.language);
i18n.on('languageChanged', syncHtmlLang);

export default i18n;
