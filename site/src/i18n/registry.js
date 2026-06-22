/* ============================================================
   eyeread.in · marketing site — locale registry (pure data)
   ------------------------------------------------------------
   The translation bundles + their metadata, with NO i18next /
   browser dependencies, so this is safe to import from Node at
   build time (scripts/prerender.mjs) as well as from the app.
   index.js layers the live i18next instance on top of this.
   ============================================================ */
import en from './locales/en/translation.json';
import fr from './locales/fr/translation.json';
import de from './locales/de/translation.json';
import es from './locales/es/translation.json';
import hi from './locales/hi/translation.json';
import kn from './locales/kn/translation.json';
import mr from './locales/mr/translation.json';
import ml from './locales/ml/translation.json';
import ta from './locales/ta/translation.json';
import te from './locales/te/translation.json';
import zh from './locales/zh/translation.json';
import ja from './locales/ja/translation.json';
import ru from './locales/ru/translation.json';

// NOTE: Bhojpuri and Tulu were dropped pending native-speaker review (their
// machine translation was low-confidence). To add a language, create its
// locales/<lng>/translation.json, import it here, add a `locales` entry, and
// add it to `resources`.

export const DEFAULT_LOCALE = 'en';

// Canonical origin (custom domain, served at root). Used to build per-locale
// URLs, canonicals, and hreflang/sitemap entries during prerender.
export const SITE_URL = 'https://get.eyeread.in';

// Display order + native names for the language switcher.
// `region` groups them into <optgroup>s in the switcher; `og` is the
// Open Graph locale tag emitted per page during prerender.
export const locales = [
  { code: 'en', label: 'English', native: 'English', region: 'Europe', og: 'en_US' },
  { code: 'fr', label: 'French', native: 'Français', region: 'Europe', og: 'fr_FR' },
  { code: 'de', label: 'German', native: 'Deutsch', region: 'Europe', og: 'de_DE' },
  { code: 'es', label: 'Spanish', native: 'Español', region: 'Europe', og: 'es_ES' },
  { code: 'ru', label: 'Russian', native: 'Русский', region: 'Europe', og: 'ru_RU' },
  { code: 'zh', label: 'Chinese', native: '中文', region: 'East Asia', og: 'zh_CN' },
  { code: 'ja', label: 'Japanese', native: '日本語', region: 'East Asia', og: 'ja_JP' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', region: 'India', og: 'hi_IN' },
  { code: 'mr', label: 'Marathi', native: 'मराठी', region: 'India', og: 'mr_IN' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', region: 'India', og: 'ta_IN' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', region: 'India', og: 'te_IN' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', region: 'India', og: 'kn_IN' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം', region: 'India', og: 'ml_IN' },
];

// Regions in first-appearance order, each with its locales — for grouped UIs.
export const localeGroups = locales.reduce((groups, locale) => {
  const group = groups.find((g) => g.region === locale.region);
  if (group) group.locales.push(locale);
  else groups.push({ region: locale.region, locales: [locale] });
  return groups;
}, []);

// Path a locale is served at (default locale lives at the site root).
export const localePath = (code) => (code === DEFAULT_LOCALE ? '/' : `/${code}/`);

export const resources = {
  en: { translation: en },
  fr: { translation: fr },
  de: { translation: de },
  es: { translation: es },
  hi: { translation: hi },
  kn: { translation: kn },
  mr: { translation: mr },
  ml: { translation: ml },
  ta: { translation: ta },
  te: { translation: te },
  zh: { translation: zh },
  ja: { translation: ja },
  ru: { translation: ru },
};
