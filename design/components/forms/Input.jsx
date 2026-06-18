import React from 'react';

const CSS = `
.tpd-field{ display:flex; flex-direction:column; gap:7px; }
.tpd-field__label{ font-family:var(--font-sans); font-size:var(--text-sm); font-weight:600; color:var(--text-secondary); }
.tpd-field__hint{ font-size:var(--text-xs); color:var(--text-tertiary); }
.tpd-field__error{ font-size:var(--text-xs); color:var(--record-text); }

.tpd-input-wrap{ position:relative; display:flex; align-items:center; }
.tpd-input-wrap__icon{ position:absolute; left:13px; display:flex; color:var(--text-tertiary); pointer-events:none; }
.tpd-input-wrap__icon svg{ width:17px; height:17px; }

.tpd-input{
  width:100%; height:var(--control-h-md);
  padding:0 14px; font-family:var(--font-sans); font-size:var(--text-base);
  color:var(--text-primary); background:var(--surface-1);
  border:1px solid var(--border-default); border-radius:var(--radius-md);
  transition:border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
}
.tpd-input::placeholder{ color:var(--text-tertiary); }
.tpd-input:hover{ border-color:var(--border-strong); }
.tpd-input:focus{ outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-subtle-bg); background:var(--surface-2); }
.tpd-input--has-icon{ padding-left:38px; }
.tpd-input--error{ border-color:var(--record); }
.tpd-input--error:focus{ box-shadow:0 0 0 3px var(--record-subtle); }
.tpd-input:disabled{ opacity:0.5; cursor:not-allowed; }

textarea.tpd-input{ height:auto; padding:11px 14px; line-height:1.5; resize:vertical; min-height:96px; }
`;

let _injected = false;
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-tpd', 'input');
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function Input({
  label,
  hint,
  error,
  icon = null,
  multiline = false,
  className = '',
  id,
  ...rest
}) {
  ensureCSS();
  const Tag = multiline ? 'textarea' : 'input';
  const inputCls = [
    'tpd-input',
    icon && !multiline ? 'tpd-input--has-icon' : '',
    error ? 'tpd-input--error' : '',
    className,
  ].filter(Boolean).join(' ');

  const field = (
    <div className="tpd-input-wrap">
      {icon && !multiline && <span className="tpd-input-wrap__icon">{icon}</span>}
      <Tag id={id} className={inputCls} {...rest} />
    </div>
  );

  if (!label && !hint && !error) return field;
  return (
    <div className="tpd-field">
      {label && <label className="tpd-field__label" htmlFor={id}>{label}</label>}
      {field}
      {error ? <span className="tpd-field__error">{error}</span>
             : hint ? <span className="tpd-field__hint">{hint}</span> : null}
    </div>
  );
}
