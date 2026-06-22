/* ============================================================
   eyeread.in · desktop app — locale registry (pure data)
   ------------------------------------------------------------
   The app's translation bundles + their metadata, with NO
   i18next / browser dependencies, so this stays safe to import
   from tests (and any tooling) without pulling in the live
   instance. index.js layers the i18next instance on top.

   This ships the same set of languages as the marketing site,
   but the app's translations are authored fresh here — the site
   bundles are not treated as a source of truth. Translation copy
   lives in the industry-standard i18next layout under
   ./locales/<lng>/translation.json. To add a language: create
   its translation.json, import it here, add a `locales` entry,
   and add it to `resources` — the shape test enforces key parity
   with the `en` source bundle.
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

export const DEFAULT_LOCALE = 'en';

// Display order + native names for the language switcher. `region` groups them
// into <optgroup>s, matching the marketing site's switcher.
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
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', region: 'India' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', region: 'India' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', region: 'India' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം', region: 'India' },
];

// Regions in first-appearance order, each with its locales — for grouped UIs.
export const localeGroups = locales.reduce((groups, locale) => {
  const group = groups.find((g) => g.region === locale.region);
  if (group) group.locales.push(locale);
  else groups.push({ region: locale.region, locales: [locale] });
  return groups;
}, []);

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
