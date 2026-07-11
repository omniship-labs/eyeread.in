/**
 * useSpeechRecognition — pure SR lifecycle, no script knowledge.
 * Calls onWords(string[]) with the words newly heard since the last event
 * (delta feeding): each word is delivered exactly once, so fast speech
 * never drops words and repeated phrases are never re-fed.
 *
 * Failure handling, by cause:
 * - Transient (session dies without ever starting: network / service
 *   hiccups) → automatic retry with exponential backoff (300ms → 8s).
 * - Activation-denied ("not-allowed"): WebKit requires a user gesture in
 *   THIS webview to start SR, so timed retries can never succeed. Instead
 *   we retry synchronously inside the next pointerdown anywhere in the
 *   window — any drag/click re-arms the mic without a dedicated button.
 *   `retry` stays exposed for an explicit recovery control.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const SR =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export const srAvailable = !!SR;

const BACKOFF_MIN = 300; // ms
const BACKOFF_MAX = 8000;

export function useSpeechRecognition({ enabled, onWords, language }) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const recRef = useRef(null);
  const onWordsRef = useRef(onWords);
  onWordsRef.current = onWords;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const languageRef = useRef(language);
  languageRef.current = language;

  const backoffRef = useRef(BACKOFF_MIN);
  const restartTimerRef = useRef(null);
  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const stopSession = useCallback(() => {
    clearRestartTimer();
    const rec = recRef.current;
    recRef.current = null;
    if (rec) {
      rec.onend = null;
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    }
    setListening(false);
  }, [clearRestartTimer]);

  const startSessionRef = useRef(null);
  const startSession = useCallback(() => {
    if (!SR || recRef.current || !enabledRef.current) return;

    const rec = new SR();
    recRef.current = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.lang = languageRef.current || navigator.language || 'en-US';

    // Words already delivered to onWords for the current SR session.
    // Interim revisions can shrink the transcript; we clamp rather than
    // re-feed — a revised word is lost, which the matcher's resync absorbs.
    let fedCount = 0;
    let sawStart = false;

    rec.onresult = (e) => {
      // Rebuild the session transcript: finalized results + current interim.
      let full = '';
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        // Pick highest-confidence alternative
        let best = '';
        let bestConf = -1;
        for (let alt = 0; alt < res.length; alt++) {
          const t = res[alt]?.transcript?.trim() || '';
          const c = res[alt]?.confidence ?? 0;
          if (t && c > bestConf) {
            best = t;
            bestConf = c;
          }
        }
        if (best) full += ' ' + best;
      }
      const words = full.split(/\s+/).filter(Boolean);
      if (words.length < fedCount) fedCount = words.length;
      const fresh = words.slice(fedCount);
      fedCount = words.length;
      if (fresh.length) onWordsRef.current(fresh);
    };

    rec.onstart = () => {
      fedCount = 0; // results array resets on every (re)start
      sawStart = true;
      backoffRef.current = BACKOFF_MIN; // healthy session — reset backoff
      setError(null);
      setListening(true);
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('mic-denied');
        // Needs a user gesture — detach so onend does NOT schedule timed
        // retries that can never succeed. The pointerdown healer takes over.
        if (recRef.current === rec) recRef.current = null;
      }
    };
    rec.onend = () => {
      setListening(false);
      if (recRef.current !== rec) return;
      recRef.current = null;
      if (sawStart) {
        // Normal end of a healthy continuous session (silence timeout etc.)
        // — restart immediately to keep tracking seamless.
        startSessionRef.current();
      } else {
        // Died before ever starting — transient failure; back off and retry.
        backoffRef.current = Math.min(backoffRef.current * 2, BACKOFF_MAX);
        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null;
          startSessionRef.current();
        }, backoffRef.current);
      }
    };

    try {
      rec.start();
    } catch {
      setError('start-failed');
      recRef.current = null;
    }
  }, []);
  startSessionRef.current = startSession;

  useEffect(() => {
    if (!enabled || !SR) return undefined;
    setError(null);
    startSession();
    return stopSession;
  }, [enabled, language, startSession, stopSession]);

  // Manual restart — safe no-op while a session is live. Call synchronously
  // from a click so start() carries the user activation WebKit requires.
  const retry = useCallback(() => {
    if (!enabledRef.current || !SR || recRef.current) return;
    clearRestartTimer();
    startSession();
  }, [startSession, clearRestartTimer]);

  // Gesture healer: while denied, ANY pointerdown in this window (drag,
  // pause, word-click…) retries inside the gesture — most users never need
  // the explicit chip. Throttled so a failing retry isn't spammed.
  useEffect(() => {
    if (!enabled || !SR || error !== 'mic-denied') return undefined;
    let last = 0;
    const onGesture = () => {
      const now = Date.now();
      if (now - last < 1500) return;
      last = now;
      retry();
    };
    window.addEventListener('pointerdown', onGesture, true);
    return () => window.removeEventListener('pointerdown', onGesture, true);
  }, [enabled, error, retry]);

  return { listening, error, retry };
}
