import React from 'react';

/**
 * ScriptViewer — renders script words with a bell-curve highlight.
 *
 * `active` = index of the word currently being read (the peak of the bell).
 * Words before active → spoken (dim). Words after → upcoming (dim).
 * Bell radiates out symmetrically ahead, tapering over 4 steps.
 * Behind the peak only 1 step of near-1 is shown, then spoken.
 */
export function ScriptViewer({
  text = '',
  active = 0,
  size = 'md',
  mirror = false,
  align = 'left',
  highContrast = false,
  dyslexic = false,
  reduceMotion = false,
  activeWordRef,
  onWordClick,
  className = '',
  style = {},
  ...rest
}) {
  const tokens = React.useMemo(() => text.split(/(\s+)/), [text]);
  let wordIdx = -1;

  const cls = [
    'er-script',
    typeof size === 'string' ? `er-script--${size}` : '',
    align === 'center' ? 'er-script--center' : '',
    mirror ? 'er-script--mirror' : '',
    highContrast ? 'er-script--contrast' : '',
    dyslexic ? 'er-script--dyslexic' : '',
    reduceMotion ? 'er-script--no-motion' : '',
    onWordClick ? 'er-script--clickable' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const inlineStyle = typeof size === 'number' ? { ...style, fontSize: `${size}px` } : style;

  return (
    <div className={cls} style={inlineStyle} {...rest}>
      {tokens.map((tok, i) => {
        if (/^\s+$/.test(tok)) return tok;
        wordIdx += 1;
        const wc = wordIdx;
        const delta = wc - active; // negative = behind, 0 = peak, positive = ahead

        let state;
        if (delta === 0)
          state = 'active'; // peak
        else if (delta === -1)
          state = 'near-1'; // one behind — still glowing
        else if (delta < -1)
          state = 'spoken'; // further behind — dim
        else if (delta === 1)
          state = 'near-1'; // one ahead
        else if (delta === 2) state = 'near-2';
        else if (delta === 3) state = 'near-3';
        else if (delta === 4) state = 'near-4';
        else state = 'upcoming'; // far ahead — dim

        return (
          <span
            key={i}
            ref={wc === active ? activeWordRef : null}
            className={`er-script__w er-script__w--${state}`}
            onClick={onWordClick ? () => onWordClick(wc) : undefined}
            title={onWordClick ? 'Read from here' : undefined}
          >
            {tok}
          </span>
        );
      })}
    </div>
  );
}
