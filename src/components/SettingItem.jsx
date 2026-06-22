import { Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * SettingItem — a labeled row in a settings panel with a cascade origin badge.
 *
 * Props:
 *   keys      — string or string[] — the overrides key(s) this row controls
 *   label     — display label
 *   value     — optional formatted value string shown right of the badge
 *   overrides — the current script overrides object
 *   onRevert  — called with (...keys) when the user clicks the undo badge
 *   children  — the control (Slider, Switch, Segmented, …) rendered below the label
 *   style     — optional style on the root element
 */
export function SettingItem({
  keys: rawKeys,
  label,
  value,
  overrides,
  onRevert,
  children,
  style,
}) {
  const { t } = useTranslation();
  const keys = Array.isArray(rawKeys) ? rawKeys : [rawKeys];
  const isOverridden = keys.some((k) => Object.prototype.hasOwnProperty.call(overrides, k));

  const badge = isOverridden ? (
    <button
      className="si-origin overridden"
      onClick={() => onRevert(...keys)}
      title={t('settingItem.useGlobalValue')}
    >
      <Undo2 size={10} />
    </button>
  ) : (
    <span className="si-origin inherited">{t('settingItem.global')}</span>
  );

  return (
    <div className="si-root" style={style}>
      <div className="si-label-row">
        <span className="si-label">{label}</span>
        <span className="si-meta">
          {badge}
          {value != null && <span className="si-val">{value}</span>}
        </span>
      </div>
      {children}
    </div>
  );
}
