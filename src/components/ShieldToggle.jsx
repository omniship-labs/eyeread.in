import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * ShieldToggle — eye icon button signalling screen-share protection state.
 * Adds `shielded` or `exposed` class so callers can style each state.
 *
 * Props:
 *   shielded  — boolean
 *   onChange  — (next: boolean) => void
 *   className — base class(es) for the button (e.g. "tl-shield" or "ic ic-sm ov-shield")
 *   size      — icon size in px (default 14)
 *   label     — optional text rendered beside the icon
 */
export function ShieldToggle({
  shielded,
  onChange,
  className = 'tl-shield',
  size = 14,
  showLabel = false,
  ...rest
}) {
  const { t } = useTranslation();
  return (
    <button
      className={`${className}${shielded ? ' shielded' : ' exposed'}`}
      onClick={() => onChange(!shielded)}
      title={shielded ? t('shield.hiddenTitle') : t('shield.visibleTitle')}
      {...rest}
    >
      {shielded ? <EyeOff size={size} /> : <Eye size={size} />}
      {showLabel && (
        <span className="ov-shield-label">
          {shielded ? t('overlay.hidden') : t('overlay.visible')}
        </span>
      )}
    </button>
  );
}
