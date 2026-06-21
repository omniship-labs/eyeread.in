import { Eye, EyeOff } from 'lucide-react';

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
export function ShieldToggle({ shielded, onChange, className = 'tl-shield', size = 14, label }) {
  return (
    <button
      className={`${className}${shielded ? ' shielded' : ' exposed'}`}
      onClick={() => onChange(!shielded)}
      title={shielded ? 'Hidden from screen share — click to expose' : 'Visible in screen share — click to hide'}
    >
      {shielded ? <EyeOff size={size} /> : <Eye size={size} />}
      {label && <span className="ov-shield-label">{label}</span>}
    </button>
  );
}
