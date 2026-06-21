import { Eye, EyeOff } from 'lucide-react';

/**
 * ShieldToggle — eye icon button that signals screen-share protection state.
 * Violet = shielded (hidden from capture), red = exposed (visible in capture).
 *
 * Props:
 *   shielded  — boolean
 *   onChange  — (next: boolean) => void
 *   className — optional extra class on the button
 */
export function ShieldToggle({ shielded, onChange, className = '' }) {
  return (
    <button
      className={`tl-shield${shielded ? ' shielded' : ' exposed'}${className ? ' ' + className : ''}`}
      onClick={() => onChange(!shielded)}
      title={shielded ? 'Hidden from screen share' : 'Visible in screen share'}
    >
      {shielded ? <EyeOff size={14} /> : <Eye size={14} />}
    </button>
  );
}
