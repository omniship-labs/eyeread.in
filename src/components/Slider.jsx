// Design-system range slider with accent fill (the `.ep-slider` pattern).
export function Slider({ min, max, value, onChange, ariaLabel, style }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      className="er-slider"
      min={min}
      max={max}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange?.(+e.target.value)}
      style={{
        background: `linear-gradient(90deg, var(--accent) ${pct}%, var(--surface-3) ${pct}%)`,
        ...style,
      }}
    />
  );
}
