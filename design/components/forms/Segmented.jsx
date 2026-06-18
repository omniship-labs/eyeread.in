import React from 'react';

const CSS = `
.tpd-seg{
  display:inline-flex; padding:3px; gap:2px;
  background:var(--surface-1); border:1px solid var(--border-default);
  border-radius:var(--radius-md);
}
.tpd-seg--block{ display:flex; width:100%; }
.tpd-seg--block .tpd-seg__btn{ flex:1; }
.tpd-seg__btn{
  display:inline-flex; align-items:center; justify-content:center; gap:6px;
  height:30px; padding:0 14px; border:none; background:transparent; cursor:pointer;
  font-family:var(--font-sans); font-size:var(--text-sm); font-weight:600;
  color:var(--text-secondary); border-radius:var(--radius-sm); white-space:nowrap;
  transition:color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
}
.tpd-seg__btn svg{ width:15px; height:15px; }
.tpd-seg__btn:hover{ color:var(--text-primary); }
.tpd-seg__btn[aria-pressed="true"]{
  background:var(--accent-subtle-bg); color:var(--accent-text);
  box-shadow:inset 0 0 0 1px var(--accent-subtle-border);
}
.tpd-seg--sm .tpd-seg__btn{ height:26px; padding:0 11px; font-size:var(--text-xs); }
`;

let _injected = false;
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-tpd', 'segmented');
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function Segmented({ options = [], value, onChange, size = 'md', block = false, className = '' }) {
  ensureCSS();
  const cls = [
    'tpd-seg',
    size === 'sm' ? 'tpd-seg--sm' : '',
    block ? 'tpd-seg--block' : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <div className={cls} role="group">
      {options.map((opt) => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const lbl = typeof opt === 'string' ? opt : opt.label;
        const icon = typeof opt === 'string' ? null : opt.icon;
        return (
          <button
            key={val}
            type="button"
            className="tpd-seg__btn"
            aria-pressed={value === val}
            onClick={() => onChange && onChange(val)}
          >
            {icon}{lbl != null && <span>{lbl}</span>}
          </button>
        );
      })}
    </div>
  );
}
