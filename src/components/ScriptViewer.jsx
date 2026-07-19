import React from 'react';

/**
 * ScriptViewer — renders script words with a bell-curve highlight.
 *
 * `active` = index of the word currently being read (the peak of the bell).
 * Words before active → spoken (dim). Words after → upcoming (dim).
 * The bell tapers gradually over `bellAhead` words (default 15), all kept
 * readable, then drops off to upcoming. Behind the peak only 1 step is
 * shown, then spoken.
 */
const BELL_START = 0.92; // opacity of the word right after the peak
const BELL_END = 0.5; // opacity of the last word inside the bell
const CONTRAST_LIFT = 0.12; // high-contrast mode raises the whole taper

function bellOpacity(delta, bellAhead, highContrast) {
  const span = Math.max(1, bellAhead - 1);
  const o = BELL_START - ((BELL_START - BELL_END) * (delta - 1)) / span;
  return Math.min(1, highContrast ? o + CONTRAST_LIFT : o);
}

export const ScriptViewer = React.memo(function ScriptViewer({
  text = '',
  active = 0,
  bellAhead = 15,
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
  // Word index per token (-1 for whitespace tokens), computed outside the
  // JSX-producing callback below so that callback stays a pure render of
  // already-known indices rather than a stateful loop.
  const wordIndices = React.useMemo(() => {
    const indices = new Array(tokens.length);
    let idx = -1;
    for (let i = 0; i < tokens.length; i++) {
      indices[i] = /^\s+$/.test(tokens[i]) ? -1 : (idx += 1);
    }
    return indices;
  }, [tokens]);

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
        const wc = wordIndices[i];
        if (wc === -1) return tok;
        const delta = wc - active; // negative = behind, 0 = peak, positive = ahead

        let state;
        let wordStyle;
        if (delta === 0) {
          state = 'active'; // peak
        } else if (delta === -1) {
          state = 'near near-lead'; // one behind — still glowing
          wordStyle = { opacity: bellOpacity(1, bellAhead, highContrast) };
        } else if (delta < -1) {
          state = 'spoken'; // further behind — dim
        } else if (delta <= bellAhead) {
          state = delta === 1 ? 'near near-lead' : 'near'; // ahead — readable taper
          wordStyle = { opacity: bellOpacity(delta, bellAhead, highContrast) };
        } else {
          state = 'upcoming'; // far ahead — dim
        }

        return (
          <span
            key={i}
            ref={wc === active ? activeWordRef : null}
            className={[
              'er-script__w',
              ...state.split(' ').map((s) => `er-script__w--${s}`),
            ].join(' ')}
            style={wordStyle}
            onClick={onWordClick ? () => onWordClick(wc) : undefined}
            data-tip={onWordClick ? 'Read from here' : undefined}
          >
            {tok}
          </span>
        );
      })}
    </div>
  );
});
