// Design-system Switch — the `.sw-wrap` pattern from the desktop UI kit.
export function Switch({ checked, onChange, size = 'md', disabled = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`er-switch er-switch--${size}${checked ? ' on' : ''}`}
      onClick={() => !disabled && onChange?.(!checked)}
    >
      <span className="th" />
    </button>
  );
}
