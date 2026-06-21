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
import mr from './mr.js';
import bho from './bho.js';
import tcy from './tcy.js';
import ml from './ml.js';
import ta from './ta.js';
import te from './te.js';
import zh from './zh.js';
import ja from './ja.js';
import ru from './ru.js';

export const DEFAULT_LOCALE = 'en';

// Display order + native names for the language switcher.
// `region` groups them into <optgroup>s in the switcher.
export const locales = [
  { code: 'en', label: 'English', native: 'English', region: 'Europe' },
  { code: 'fr', label: 'French', native: 'Français', region: 'Europe' },
  { code: 'de', label: 'German', native: 'Deutsch', region: 'Europe' },
  { code: 'es', label: 'Spanish', native: 'Español', region: 'Europe' },
  { code: 'ru', label: 'Russian', native: 'Русский', region: 'Europe' },
  { code: 'zh', label: 'Chinese', native: '中文', region: 'East Asia' },
  { code: 'ja', label: 'Japanese', native: '日本語', region: 'East Asia' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', region: 'India' },
  { code: 'mr', label: 'Marathi', native: 'मराठी', region: 'India' },
  { code: 'bho', label: 'Bhojpuri', native: 'भोजपुरी', region: 'India' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', region: 'India' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', region: 'India' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', region: 'India' },
  { code: 'tcy', label: 'Tulu', native: 'ತುಳು', region: 'India' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം', region: 'India' },
];

// Regions in first-appearance order, each with its locales — for grouped UIs.
export const localeGroups = locales.reduce((groups, locale) => {
  const group = groups.find((g) => g.region === locale.region);
  if (group) group.locales.push(locale);
  else groups.push({ region: locale.region, locales: [locale] });
  return groups;
}, []);

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  de: { translation: de },
  es: { translation: es },
  hi: { translation: hi },
  kn: { translation: kn },
  mr: { translation: mr },
  bho: { translation: bho },
  tcy: { translation: tcy },
  ml: { translation: ml },
  ta: { translation: ta },
  te: { translation: te },
  zh: { translation: zh },
  ja: { translation: ja },
  ru: { translation: ru },
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
