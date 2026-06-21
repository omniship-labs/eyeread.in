import React from 'react';

/* Inject component CSS once. Classes reference design tokens via var(). */
const CSS = `
.tpd-btn{
  --_h:40px; --_px:18px; --_fs:15px;
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  min-height:var(--_h); padding:0 var(--_px); font-size:var(--_fs);
  font-family:var(--font-sans); font-weight:600; letter-spacing:-0.01em;
  border-radius:var(--radius-md); border:1px solid transparent;
  cursor:pointer; white-space:nowrap; user-select:none;
  transition:background var(--dur-fast) var(--ease-out),
             border-color var(--dur-fast) var(--ease-out),
             box-shadow var(--dur-fast) var(--ease-out),
             transform var(--dur-fast) var(--ease-out),
             color var(--dur-fast) var(--ease-out);
}
.tpd-btn:focus-visible{ outline:none; box-shadow:var(--ring); }
.tpd-btn:active{ transform:translateY(0.5px) scale(0.985); }
.tpd-btn[disabled]{ opacity:0.45; cursor:not-allowed; transform:none; box-shadow:none; }

.tpd-btn--xs{ --_h:24px; --_px:8px;  --_fs:11px; border-radius:var(--radius-sm); }
.tpd-btn--sm{ --_h:32px; --_px:13px; --_fs:13px; border-radius:var(--radius-sm); }
.tpd-btn--lg{ --_h:48px; --_px:24px; --_fs:16px; border-radius:var(--radius-lg); }

.tpd-btn--primary{ background:var(--accent); color:var(--text-on-accent); box-shadow:var(--glow-accent-sm); }
.tpd-btn--primary:hover:not([disabled]){ background:var(--accent-hover); box-shadow:0 0 18px rgba(110,86,247,0.6); }
.tpd-btn--primary:active:not([disabled]){ background:var(--accent-press); }

.tpd-btn--secondary{ background:var(--surface-2); color:var(--text-primary); border-color:var(--border-default); }
.tpd-btn--secondary:hover:not([disabled]){ background:var(--surface-3); border-color:var(--border-strong); }

.tpd-btn--ghost{ background:transparent; color:var(--text-secondary); }
.tpd-btn--ghost:hover:not([disabled]){ background:var(--surface-hover); color:var(--text-primary); }

.tpd-btn--subtle{ background:var(--accent-subtle-bg); color:var(--accent-text); border-color:var(--accent-subtle-border); }
.tpd-btn--subtle:hover:not([disabled]){ background:var(--accent-subtle-bg-hover); }

.tpd-btn--danger{ background:var(--record); color:#fff; box-shadow:var(--glow-record); }
.tpd-btn--danger:hover:not([disabled]){ background:var(--signal-600); }

.tpd-btn--link{ background:transparent; border-color:transparent; color:var(--accent-text);
  padding:0; min-height:auto; letter-spacing:inherit; }
.tpd-btn--link:hover:not([disabled]){ color:var(--text-primary); }

.tpd-btn--block{ width:100%; }
`;

let _injected = false;
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-tpd', 'button');
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  iconLeft = null,
  iconRight = null,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  ensureCSS();
  const cls = [
    'tpd-btn',
    `tpd-btn--${variant}`,
    size && size !== 'md' ? `tpd-btn--${size}` : '',
    block ? 'tpd-btn--block' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button type={type} className={cls} disabled={disabled} {...rest}>
      {iconLeft}
      {children != null && <span>{children}</span>}
      {iconRight}
    </button>
  );
}
