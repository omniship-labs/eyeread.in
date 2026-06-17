import React from 'react';

const CSS = `
.tpd-badge{
  display:inline-flex; align-items:center; gap:5px;
  height:22px; padding:0 9px; border-radius:var(--radius-pill);
  font-family:var(--font-mono); font-size:11px; font-weight:500;
  letter-spacing:var(--tracking-label); text-transform:uppercase;
  border:1px solid transparent; white-space:nowrap;
}
.tpd-badge svg{ width:12px; height:12px; }
.tpd-badge__dot{ width:6px; height:6px; border-radius:50%; background:currentColor; flex:none; }
.tpd-badge--neutral{ background:var(--surface-2); color:var(--text-secondary); border-color:var(--border-default); }
.tpd-badge--accent{ background:var(--accent-subtle-bg); color:var(--accent-text); border-color:var(--accent-subtle-border); }
.tpd-badge--record{ background:var(--record-subtle); color:var(--record-text); }
.tpd-badge--record .tpd-badge__dot{ box-shadow:var(--glow-record); animation:tpd-pulse 1.6s var(--ease-in-out) infinite; }
.tpd-badge--success{ background:rgba(52,211,153,0.13); color:var(--success); }
.tpd-badge--warning{ background:rgba(255,184,77,0.13); color:var(--warning); }

.tpd-badge--solid{ font-family:var(--font-sans); font-weight:600; letter-spacing:0; text-transform:none; }

@keyframes tpd-pulse{ 0%,100%{opacity:1} 50%{opacity:0.35} }
@media (prefers-reduced-motion: reduce){ .tpd-badge--record .tpd-badge__dot{ animation:none; } }
`;

let _injected = false;
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-tpd', 'badge');
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function Badge({ tone = 'neutral', dot = false, solid = false, icon = null, className = '', children, ...rest }) {
  ensureCSS();
  const cls = ['tpd-badge', `tpd-badge--${tone}`, solid ? 'tpd-badge--solid' : '', className].filter(Boolean).join(' ');
  return (
    <span className={cls} {...rest}>
      {dot && <span className="tpd-badge__dot" />}
      {icon}
      {children}
    </span>
  );
}
