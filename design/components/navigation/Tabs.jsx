import React from 'react';

const CSS = `
.tpd-tabs{ display:flex; gap:2px; position:relative; }
.tpd-tabs--line{ border-bottom:1px solid var(--border-subtle); gap:4px; }
.tpd-tabs--pill{ background:var(--surface-1); border:1px solid var(--border-default); border-radius:var(--radius-md); padding:3px; gap:2px; display:inline-flex; }

.tpd-tab{
  display:inline-flex; align-items:center; gap:7px; cursor:pointer; border:none; background:transparent;
  font-family:var(--font-sans); font-size:var(--text-sm); font-weight:600; color:var(--text-tertiary);
  transition:color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}
.tpd-tab svg{ width:16px; height:16px; }
.tpd-tab:hover{ color:var(--text-secondary); }

.tpd-tabs--line .tpd-tab{ padding:10px 4px; position:relative; }
.tpd-tabs--line .tpd-tab[aria-selected="true"]{ color:var(--text-primary); }
.tpd-tabs--line .tpd-tab[aria-selected="true"]::after{
  content:""; position:absolute; left:0; right:0; bottom:-1px; height:2px;
  background:var(--accent); border-radius:2px; box-shadow:var(--glow-accent-sm);
}

.tpd-tabs--pill .tpd-tab{ padding:7px 14px; border-radius:var(--radius-sm); }
.tpd-tabs--pill .tpd-tab[aria-selected="true"]{ background:var(--accent-subtle-bg); color:var(--accent-text); box-shadow:inset 0 0 0 1px var(--accent-subtle-border); }

.tpd-tab__count{ font-family:var(--font-mono); font-size:10px; padding:1px 6px; border-radius:var(--radius-pill); background:var(--surface-3); color:var(--text-tertiary); }
.tpd-tab[aria-selected="true"] .tpd-tab__count{ background:var(--accent-subtle-bg); color:var(--accent-text); }
`;

let _injected = false;
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-tpd', 'tabs');
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function Tabs({ items = [], value, onChange, variant = 'line', className = '' }) {
  ensureCSS();
  const cls = ['tpd-tabs', `tpd-tabs--${variant}`, className].filter(Boolean).join(' ');
  return (
    <div className={cls} role="tablist">
      {items.map((it) => {
        const val = typeof it === 'string' ? it : it.value;
        const lbl = typeof it === 'string' ? it : it.label;
        const icon = typeof it === 'string' ? null : it.icon;
        const count = typeof it === 'string' ? null : it.count;
        return (
          <button
            key={val}
            type="button"
            role="tab"
            className="tpd-tab"
            aria-selected={value === val}
            onClick={() => onChange && onChange(val)}
          >
            {icon}
            <span>{lbl}</span>
            {count != null && <span className="tpd-tab__count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
