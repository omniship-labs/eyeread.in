/**
 * useSpeechRecognition — pure SR lifecycle, no script knowledge.
 * Calls onWords(string[]) with the words newly heard since the last event
 * (delta feeding): each word is delivered exactly once, so fast speech
 * never drops words and repeated phrases are never re-fed.
 *
 * Failure handling, by cause:
 * - Transient (session dies without ever starting, or dies almost instantly
 *   after starting — thrashing, seen on some MacBooks' mic pipeline) →
 *   automatic retry with exponential backoff (300ms → 8s), which also caps
 *   how often the overlay's mic indicator can flicker.
 * - Activation-denied ("not-allowed"): WebKit requires a user gesture in
 *   THIS webview to start SR, so timed retries can never succeed. Instead
 *   we retry synchronously inside the next pointerdown anywhere in the
 *   window — any drag/click re-arms the mic without a dedicated button.
 *   `retry` stays exposed for an explicit recovery control.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const SR =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export const srAvailable = !!SR;

const BACKOFF_MIN = 300; // ms
const BACKOFF_MAX = 8000;

// Continuous SR sessions end and restart on their own (see onend below).
// The restart is synchronous but the replacement session's onstart is not —
// its timing is decided by the OS/WebKit and varies by machine. Delaying the
// "not listening" transition by this much absorbs a normal restart gap so
// the overlay's mic indicator doesn't flicker off/on every cycle.
const LISTENING_OFF_GRACE_MS = 400;

// A session that dies before staying up this long isn't a normal silence
// timeout (those run many seconds) — it's the mic pipeline thrashing, seen
// on some MacBooks where a session starts, dies almost immediately, and
// restarts in a tight loop (~every 500ms, bounded only by real audio
// hardware setup/teardown time). Only a session that clears this bar counts
// as "healthy" for backoff-reset purposes, so a thrashing loop backs off
// instead of hammering the hardware at zero delay forever.
const MIN_HEALTHY_SESSION_MS = 1500;

export function useSpeechRecognition({ enabled, onWords, language }) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const recRef = useRef(null);
  const onWordsRef = useRef(onWords);
  const enabledRef = useRef(enabled);
  const languageRef = useRef(language);
  useLayoutEffect(() => {
    onWordsRef.current = onWords;
    enabledRef.current = enabled;
    languageRef.current = language;
  });

  const backoffRef = useRef(BACKOFF_MIN);
  const restartTimerRef = useRef(null);
  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const listeningOffTimerRef = useRef(null);
  const clearListeningOffTimer = useCallback(() => {
    if (listeningOffTimerRef.current) {
      clearTimeout(listeningOffTimerRef.current);
      listeningOffTimerRef.current = null;
    }
  }, []);

  const stopSession = useCallback(() => {
    clearRestartTimer();
    clearListeningOffTimer();
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
  }, [clearRestartTimer, clearListeningOffTimer]);

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
    let startedAt = 0;

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
      startedAt = Date.now();
      // Backoff is reset in onend once this session proves it can stay up —
      // resetting it here unconditionally is what let a thrashing session
      // (starts, dies almost instantly) restart at zero delay forever.
      clearListeningOffTimer(); // cancel a pending "off" from the session we replaced
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
      if (recRef.current !== rec) {
        // Already detached (e.g. mic-denied) — no restart is coming, so
        // reflect "not listening" immediately.
        clearListeningOffTimer();
        setListening(false);
        return;
      }
      recRef.current = null;

      // Absorb a quick restart without flipping the overlay's mic badge off
      // and back on — the replacement session's onstart is async, so only
      // reflect "not listening" if it doesn't arrive within the grace
      // window.
      clearListeningOffTimer();
      listeningOffTimerRef.current = setTimeout(() => {
        listeningOffTimerRef.current = null;
        setListening(false);
      }, LISTENING_OFF_GRACE_MS);

      const healthy = sawStart && Date.now() - startedAt >= MIN_HEALTHY_SESSION_MS;
      if (healthy) {
        // Normal end of a healthy continuous session (silence timeout etc.)
        // — restart immediately to keep tracking seamless.
        backoffRef.current = BACKOFF_MIN;
        startSessionRef.current();
      } else {
        // Either died before ever starting, or started and died almost
        // instantly — a thrashing pipeline, not a real silence timeout.
        // Back off before retrying so a bad mic session can't spin at zero
        // delay forever (that's what produced the rapid on/off flicker).
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
      recRef.current = null;
      // Defer off the synchronous throw path so this never sets state within
      // the same tick as the caller's effect (rare: most SR implementations
      // fail via onerror, not a thrown start()).
      queueMicrotask(() => setError('start-failed'));
    }
  }, [clearListeningOffTimer]);
  useLayoutEffect(() => {
    startSessionRef.current = startSession;
  });

  useEffect(() => {
    if (!enabled || !SR) return undefined;
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
