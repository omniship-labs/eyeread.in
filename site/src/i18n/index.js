/* ============================================================
   eyeread.in · marketing site — i18n setup (i18next)
   ------------------------------------------------------------
   One i18next instance shared by the whole site. We use i18next
   for the resource store + interpolation and react-i18next for
   the React bindings, and i18next-browser-languagedetector to:
     1. read a remembered choice from localStorage,
     2. otherwise fall back to the browser's languages,
     3. persist whatever the user picks back to localStorage.

   The page copy is structured content (arrays, nested objects),
   not flat strings, so each locale is registered as a single
   `translation` bundle and read back wholesale by useConfig()
   in ../config.js — i18next is the store, buildConfig() is the
   shape. Add a new language by importing its bundle and listing
   its code in `locales` below.
   ============================================================ */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './en.js';
import fr from './fr.js';
import de from './de.js';
import es from './es.js';
import hi from './hi.js';
import kn from './kn.js';

export const DEFAULT_LOCALE = 'en';

// Display order + native names for the language switcher.
export const locales = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'de', label: 'German', native: 'Deutsch' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
];

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  de: { translation: de },
  es: { translation: es },
  hi: { translation: hi },
  kn: { translation: kn },
};

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
      // localStorage first (remembered choice), then the browser.
      order: ['localStorage', 'navigator'],
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
