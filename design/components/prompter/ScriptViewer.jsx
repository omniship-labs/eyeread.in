import React from 'react';

const CSS = `
.tpd-script{
  font-family:var(--font-prompt); font-weight:500; line-height:var(--leading-reading);
  letter-spacing:-0.01em; color:var(--text-primary);
}
.tpd-script--center{ text-align:center; }
.tpd-script--mirror{ transform:scaleX(-1); }
.tpd-script__w{ transition:color var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out); }
.tpd-script__w--spoken{ color:var(--prompt-upcoming); opacity:0.45; }
.tpd-script__w--upcoming{ color:var(--prompt-spoken); opacity:0.7; }
.tpd-script__w--active{ color:var(--prompt-active); opacity:1; font-weight:600; text-shadow:var(--glow-text); }

.tpd-script__sizes-sm{ font-size:var(--prompt-sm); }
.tpd-script__sizes-md{ font-size:var(--prompt-md); }
.tpd-script__sizes-lg{ font-size:var(--prompt-lg); }
.tpd-script__sizes-xl{ font-size:var(--prompt-xl); }
`;

let _injected = false;
function ensureCSS() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-tpd', 'script');
  s.textContent = CSS;
  document.head.appendChild(s);
}

const SIZE_CLASS = { sm: 'tpd-script__sizes-sm', md: 'tpd-script__sizes-md', lg: 'tpd-script__sizes-lg', xl: 'tpd-script__sizes-xl' };

export function ScriptViewer({
  text = '',
  active = 0,
  size = 'md',
  mirror = false,
  align = 'left',
  className = '',
  style = {},
  ...rest
}) {
  ensureCSS();
  const words = React.useMemo(() => text.split(/(\s+)/), [text]);
  // active counts non-space tokens; map to token index
  let wordCount = -1;
  const cls = [
    'tpd-script',
    typeof size === 'string' ? SIZE_CLASS[size] : '',
    align === 'center' ? 'tpd-script--center' : '',
    mirror ? 'tpd-script--mirror' : '',
    className,
  ].filter(Boolean).join(' ');
  const inlineStyle = typeof size === 'number' ? { ...style, fontSize: size + 'px' } : style;

  return (
    <div className={cls} style={inlineStyle} {...rest}>
      {words.map((tok, i) => {
        if (/^\s+$/.test(tok)) return tok;
        wordCount += 1;
        const wc = wordCount;
        const stateCls = wc < active ? 'tpd-script__w--spoken'
          : wc === active ? 'tpd-script__w--active'
          : 'tpd-script__w--upcoming';
        return <span key={i} className={`tpd-script__w ${stateCls}`}>{tok}</span>;
      })}
    </div>
  );
}
