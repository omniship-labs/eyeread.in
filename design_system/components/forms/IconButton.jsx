import React from 'react';

const CSS = `
.tpd-iconbtn{
  --_s:40px;
  display:inline-flex; align-items:center; justify-content:center;
  width:var(--_s); height:var(--_s); padding:0;
  border-radius:var(--radius-md); border:1px solid transparent;
  background:transparent; color:var(--text-secondary); cursor:pointer;
  transition:background var(--dur-fast) var(--ease-out),
             color var(--dur-fast) var(--ease-out),
             border-color var(--dur-fast) var(--ease-out),
             transform var(--dur-fast) var(--ease-out),
             box-shadow var(--dur-fast) var(--ease-out);
}
.tpd-iconbtn svg{ width:20px; height:20px; display:block; }
.tpd-iconbtn:focus-visible{ outline:none; box-shadow:var(--ring); }
.tpd-iconbtn:active{ transform:scale(0.92); }
.tpd-iconbtn[disabled]{ opacity:0.4; cursor:not-allowed; }

.tpd-iconbtn--sm{ --_s:32px; border-radius:var(--radius-sm); }
.tpd-iconbtn--sm svg{ width:16px; height:16px; }
.tpd-iconbtn--lg{ --_s:48px; }
.tpd-iconbtn--lg svg{ width:22px; height:22px; }

.tpd-iconbtn--ghost:hover:not([disabled]){ background:var(--surface-hover); color:var(--text-primary); }
.tpd-iconbtn--solid{ background:var(--surface-2); border-color:var(--border-default); color:var(--text-primary); }
.tpd-iconbtn--solid:hover:not([disabled]){ background:var(--surface-3); }
.tpd-iconbtn--accent{ background:var(--accent); color:#fff; box-shadow:var(--glow-accent-sm); }
.tpd-iconbtn--accent:hover:not([disabled]){ background:var(--accent-hover); }
.tpd-iconbtn--active{ background:var(--accent-subtle-bg); color:var(--accent-text); border-color:var(--accent-subtle-border); }
`;

let _injected = false;
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-tpd', 'iconbutton');
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function IconButton({
  variant = 'ghost',
  size = 'md',
  active = false,
  disabled = false,
  label,
  className = '',
  children,
  ...rest
}) {
  ensureCSS();
  const cls = [
    'tpd-iconbtn',
    `tpd-iconbtn--${variant}`,
    size !== 'md' ? `tpd-iconbtn--${size}` : '',
    active ? 'tpd-iconbtn--active' : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} disabled={disabled} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}
