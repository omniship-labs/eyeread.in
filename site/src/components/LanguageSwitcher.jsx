import { useTranslation } from 'react-i18next';
import { Icon } from './Icon.jsx';
import { locales } from '../i18n/index.js';

/* Native <select> language picker — keyboard- and screen-reader-friendly
   out of the box. Changing it calls i18next.changeLanguage(), which the
   browser-language detector persists to localStorage automatically. */
export default function LanguageSwitcher({ label }) {
  const { i18n } = useTranslation();
  const current =
    locales.find((l) => l.code === (i18n.resolvedLanguage || i18n.language))?.code ||
    locales[0].code;

  return (
    <label className="lang-switch" title={label}>
      <Icon name="globe" size={15} />
      <select
        className="lang-select"
        aria-label={label}
        value={current}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
      >
        {locales.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native}
          </option>
        ))}
      </select>
    </label>
  );
}
