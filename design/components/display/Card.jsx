import React from 'react';

const CSS = `
.tpd-card{
  background:var(--surface-1); border:1px solid var(--border-subtle);
  border-radius:var(--radius-lg); padding:var(--space-5);
  transition:border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out);
}
.tpd-card--raised{ background:var(--surface-2); box-shadow:var(--shadow-lg); }
.tpd-card--glass{
  background:var(--glass-bg); backdrop-filter:var(--blur-glass); -webkit-backdrop-filter:var(--blur-glass);
  border-color:var(--glass-border);
}
.tpd-card--accent{ border-color:var(--accent-subtle-border); box-shadow:var(--glow-accent); }
.tpd-card--interactive{ cursor:pointer; }
.tpd-card--interactive:hover{ border-color:var(--border-strong); transform:translateY(-2px); box-shadow:var(--shadow-lg); }
.tpd-card--interactive:active{ transform:translateY(0); }
.tpd-card--pad-sm{ padding:var(--space-4); }
.tpd-card--pad-lg{ padding:var(--space-6); }
.tpd-card--pad-none{ padding:0; }
`;

let _injected = false;
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-tpd', 'card');
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function Card({
  variant = 'default',
  padding = 'md',
  interactive = false,
  className = '',
  children,
  ...rest
}) {
  ensureCSS();
  const cls = [
    'tpd-card',
    variant !== 'default' ? `tpd-card--${variant}` : '',
    padding !== 'md' ? `tpd-card--pad-${padding}` : '',
    interactive ? 'tpd-card--interactive' : '',
    className,
  ].filter(Boolean).join(' ');
  return <div className={cls} {...rest}>{children}</div>;
}
