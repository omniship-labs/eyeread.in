/**
 * useSpeechRecognition — pure SR lifecycle, no script knowledge.
 * Calls onWords(string[]) with the last few words of the best transcript.
 */
import { useEffect, useRef, useState } from 'react';

const SR =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export const srAvailable = !!SR;

export function useSpeechRecognition({ enabled, onWords }) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const recRef = useRef(null);
  const onWordsRef = useRef(onWords);
  onWordsRef.current = onWords;

  useEffect(() => {
    if (!enabled || !SR) return undefined;

    setError(null);
    const rec = new SR();
    recRef.current = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.lang = (navigator.language || 'en-US').startsWith('en')
      ? navigator.language
      : 'en-US';

    rec.onresult = (e) => {
      const res = e.results[e.results.length - 1];
      // Pick highest-confidence alternative
      let best = '';
      let bestConf = -1;
      for (let alt = 0; alt < res.length; alt++) {
        const t = res[alt]?.transcript?.trim() || '';
        const c = res[alt]?.confidence ?? 0;
        if (t && c > bestConf) { best = t; bestConf = c; }
      }
      if (!best) return;
      const words = best.split(/\s+/).filter(Boolean);
      // Only feed the last word — walking a multi-word chunk causes repeated
      // phrases ("when you … when you") to trip the pointer past the first match.
      const last = words[words.length - 1];
      if (last) onWordsRef.current([last]);
    };

    rec.onstart = () => setListening(true);
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('mic-denied');
      }
    };
    rec.onend = () => {
      setListening(false);
      if (recRef.current === rec) {
        try { rec.start(); } catch { /* already starting */ }
      }
    };

    try { rec.start(); } catch { setError('start-failed'); }

    return () => {
      recRef.current = null;
      rec.onend = null;
      try { rec.stop(); } catch { /* noop */ }
      setListening(false);
    };
  }, [enabled]);

  return { listening, error };
}
