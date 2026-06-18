import React from 'react';

const CSS = `
.tpd-switch{ display:inline-flex; align-items:center; gap:11px; cursor:pointer; user-select:none; }
.tpd-switch[data-disabled="true"]{ opacity:0.45; cursor:not-allowed; }
.tpd-switch__track{
  position:relative; width:42px; height:24px; flex:none;
  background:var(--surface-3); border:1px solid var(--border-default);
  border-radius:var(--radius-pill);
  transition:background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out);
}
.tpd-switch__thumb{
  position:absolute; top:2px; left:2px; width:18px; height:18px;
  background:var(--paper-200); border-radius:50%;
  box-shadow:var(--shadow-sm);
  transition:transform var(--dur-base) var(--ease-spring), background var(--dur-base) var(--ease-out);
}
.tpd-switch input{ position:absolute; opacity:0; width:0; height:0; }
.tpd-switch input:checked + .tpd-switch__track{
  background:var(--accent); border-color:transparent; box-shadow:var(--glow-accent-sm);
}
.tpd-switch input:checked + .tpd-switch__track .tpd-switch__thumb{ transform:translateX(18px); background:#fff; }
.tpd-switch input:focus-visible + .tpd-switch__track{ box-shadow:var(--ring); }
.tpd-switch__label{ font-family:var(--font-sans); font-size:var(--text-base); color:var(--text-primary); }
`;

let _injected = false;
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-tpd', 'switch');
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function Switch({ checked, defaultChecked, onChange, disabled = false, label, id, ...rest }) {
  ensureCSS();
  return (
    <label className="tpd-switch" data-disabled={disabled} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        disabled={disabled}
        {...rest}
      />
      <span className="tpd-switch__track"><span className="tpd-switch__thumb" /></span>
      {label && <span className="tpd-switch__label">{label}</span>}
    </label>
  );
}
