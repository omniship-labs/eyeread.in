import React from 'react';

const CSS = `
.tpd-avatar{
  display:inline-flex; align-items:center; justify-content:center;
  width:var(--_s,36px); height:var(--_s,36px); flex:none;
  border-radius:50%; position:relative;
  font-family:var(--font-sans); font-weight:600; font-size:calc(var(--_s,36px) * 0.4);
  user-select:none;
}
/* Inner clip — keeps the image/initials circular without cutting the badge */
.tpd-avatar__inner{
  width:100%; height:100%; border-radius:50%; overflow:hidden;
  display:flex; align-items:center; justify-content:center;
  background:var(--surface-3); color:var(--text-primary);
  border:1px solid var(--border-default);
}
.tpd-avatar img{ width:100%; height:100%; object-fit:cover; }
.tpd-avatar--accent .tpd-avatar__inner{ background:var(--accent-subtle-bg); color:var(--accent-text); border-color:var(--accent-subtle-border); }
.tpd-avatar__status{
  position:absolute; right:-1px; bottom:-1px; width:30%; height:30%; min-width:8px; min-height:8px;
  border-radius:50%; border:2px solid var(--bg-base); background:var(--text-tertiary);
}
.tpd-avatar__status--online{ background:var(--success); }
.tpd-avatar__status--live{ background:var(--accent); box-shadow:var(--glow-accent-sm); }
`;

let _injected = false;
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-tpd', 'avatar');
  s.textContent = CSS;
  document.head.appendChild(s);
}

const SIZES = { sm: 28, md: 36, lg: 48, xl: 64 };

export function Avatar({ src, name = '', size = 'md', accent = false, status, className = '', ...rest }) {
  ensureCSS();
  const px = typeof size === 'number' ? size : (SIZES[size] || 36);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const cls = ['tpd-avatar', accent ? 'tpd-avatar--accent' : '', className].filter(Boolean).join(' ');
  return (
    <span className={cls} style={{ ['--_s']: px + 'px' }} {...rest}>
      <span className="tpd-avatar__inner">
        {src ? <img src={src} alt={name} /> : (initials || '?')}
      </span>
      {status && <span className={`tpd-avatar__status tpd-avatar__status--${status}`} />}
    </span>
  );
}
