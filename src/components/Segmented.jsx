// Design-system segmented control (the `.ep-seg` / `.seg` pattern).
export function Segmented({ options, value, onChange, size = 'sm', style }) {
  return (
    <div className={`er-seg er-seg--${size}`} style={style}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange?.(o.value)}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
