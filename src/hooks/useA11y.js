// Accessibility hooks shared across windows.
//
// These translate the user's accessibility *settings* into document-level
// side effects so a single source of truth (the settings store) drives the
// behaviour everywhere the app renders.

import { useEffect } from 'react';

/**
 * Scale the whole UI by `scale` percent (e.g. 125 → 1.25×). Implemented with
 * CSS `zoom` on the document element because the type scale is px-based — so
 * scaling the root font-size wouldn't cascade, but `zoom` reflows everything
 * (text, spacing, controls) uniformly. Intended for the chrome windows
 * (main / settings / about); the overlay is sized to a native window and has
 * its own text-size control, so it opts out.
 */
export function useUiScale(scale) {
  useEffect(() => {
    const pct = Number(scale) || 100;
    const root = document.documentElement;
    root.style.zoom = pct === 100 ? '' : String(pct / 100);
    return () => {
      root.style.zoom = '';
    };
  }, [scale]);
}

/**
 * Reflect the "reduce motion" preference on the document element. CSS in
 * app.css keys off the `reduce-motion` class to neutralise transitions and
 * animations; JS that drives motion directly (e.g. smooth-scroll) should read
 * the setting itself.
 */
export function useReducedMotion(reduceMotion) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('reduce-motion', !!reduceMotion);
    return () => {
      root.classList.remove('reduce-motion');
    };
  }, [reduceMotion]);
}

/**
 * Reflect the "dyslexic-friendly reading" preference on the document
 * element. CSS in app.less keys off the `dyslexic-font` class to redefine
 * `--font-sans` to OpenDyslexic, which cascades into the chrome windows'
 * body text, buttons, and labels. Headings (`--font-display`) and mono
 * badges/labels (`--font-mono`) are left alone — swapping those too would
 * fight the app's type system rather than just aid reading. The prompter's
 * own roomier letter/word-spacing (ScriptViewer's `--dyslexic` class) is
 * separate and unaffected by this.
 */
export function useDyslexicFont(dyslexicFont) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dyslexic-font', !!dyslexicFont);
    return () => {
      root.classList.remove('dyslexic-font');
    };
  }, [dyslexicFont]);
}
