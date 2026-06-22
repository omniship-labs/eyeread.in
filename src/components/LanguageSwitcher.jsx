import { useTranslation } from 'react-i18next';
import { localeGroups, locales } from '../i18n/index.js';
import { emitTo } from '../lib/tauri.js';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current =
    locales.find((l) => l.code === (i18n.resolvedLanguage || i18n.language))?.code ||
    locales[0].code;

  async function handleChange(lng) {
    await i18n.changeLanguage(lng);
    // Overlay is a separate webview — localStorage changes don't reach it live.
    emitTo('*', 'locale:changed', { lng });
  }

  return (
    <select
      className="ep-select"
      style={{ width: 160 }}
      value={current}
      onChange={(e) => handleChange(e.target.value)}
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
