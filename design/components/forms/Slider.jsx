import React from 'react';

const CSS = `
.tpd-slider{ display:flex; flex-direction:column; gap:9px; width:100%; }
.tpd-slider__top{ display:flex; align-items:baseline; justify-content:space-between; }
.tpd-slider__label{ font-family:var(--font-sans); font-size:var(--text-sm); font-weight:600; color:var(--text-secondary); }
.tpd-slider__val{ font-family:var(--font-mono); font-size:var(--text-xs); color:var(--accent-text); }
.tpd-slider input[type=range]{
  -webkit-appearance:none; appearance:none; width:100%; height:6px; margin:6px 0;
  background:var(--surface-3); border-radius:var(--radius-pill); cursor:pointer;
}
.tpd-slider input[type=range]::-webkit-slider-runnable-track{ height:6px; border-radius:var(--radius-pill); background:transparent; }
.tpd-slider input[type=range]::-webkit-slider-thumb{
  -webkit-appearance:none; appearance:none; width:18px; height:18px; margin-top:-6px;
  border-radius:50%; background:#fff; border:3px solid var(--accent);
  box-shadow:var(--glow-accent-sm); transition:transform var(--dur-fast) var(--ease-out);
}
.tpd-slider input[type=range]::-webkit-slider-thumb:hover{ transform:scale(1.12); }
.tpd-slider input[type=range]::-moz-range-thumb{
  width:18px; height:18px; border-radius:50%; background:#fff; border:3px solid var(--accent);
  box-shadow:var(--glow-accent-sm); cursor:pointer;
}
.tpd-slider input[type=range]::-moz-range-track{ height:6px; border-radius:var(--radius-pill); background:var(--surface-3); }
.tpd-slider input[type=range]:focus-visible{ outline:none; }
.tpd-slider input[type=range]:focus-visible::-webkit-slider-thumb{ box-shadow:var(--ring); }
`;

let _injected = false;
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-tpd', 'slider');
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function Slider({
  label,
  value,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  formatValue,
  suffix = '',
  id,
  ...rest
}) {
  ensureCSS();
  const shown = value != null ? value : defaultValue;
  const display = formatValue ? formatValue(shown) : (shown != null ? `${shown}${suffix}` : null);
  // Fill the track up to the thumb using a gradient.
  const pct = shown != null ? ((shown - min) / (max - min)) * 100 : 0;
  const trackStyle = {
    background: `linear-gradient(90deg, var(--accent) 0%, var(--accent) ${pct}%, var(--surface-3) ${pct}%, var(--surface-3) 100%)`,
  };

  return (
    <div className="tpd-slider">
      {(label || display != null) && (
        <div className="tpd-slider__top">
          {label && <span className="tpd-slider__label">{label}</span>}
          {display != null && <span className="tpd-slider__val">{display}</span>}
        </div>
      )}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        style={trackStyle}
        {...rest}
      />
    </div>
  );
}
