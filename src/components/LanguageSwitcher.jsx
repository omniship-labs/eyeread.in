import { useTranslation } from 'react-i18next';
import { localeGroups, locales } from '../i18n/index.js';

/**
 * LanguageSwitcher — native <select> picker for the app's interface language.
 *
 * Keyboard- and screen-reader-friendly out of the box. Changing it calls
 * i18next.changeLanguage(), which the browser-language detector persists to
 * localStorage ('eyeread.locale'); other windows pick it up the next time they
 * open. Styled with the existing `ep-select` class.
 */
export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current =
    locales.find((l) => l.code === (i18n.resolvedLanguage || i18n.language))?.code ||
    locales[0].code;

  return (
    <select
      className="ep-select"
      style={{ width: 160 }}
      value={current}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
    >
      {localeGroups.map((group) => (
        <optgroup key={group.region} label={group.region}>
          {group.locales.map((l) => (
            <option key={l.code} value={l.code}>
              {l.native}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
