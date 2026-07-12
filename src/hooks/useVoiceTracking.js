/**
 * useVoiceTracking
 *
 * Wires speech recognition to the script pointer.
 * pointer + active are owned by OverlayWindow; this hook drives both
 * voice-match advancement and timed auto-scroll.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { normalizeWord } from '../lib/utils';
import { stepPointer, createMatchState, nextSpeakable } from '../lib/voiceMatch';
import { expandNumberToken } from '../lib/numberWords';
import { useSpeechRecognition, srAvailable } from './useSpeechRecognition';

export const voiceAvailable = srAvailable;

export function useVoiceTracking({
  words,
  playing,
  voiceEnabled,
  wpm,
  pointer, // owned by caller
  setPointer,
  setActive,
  language,
  // Keep the SR session alive while paused (overlay still open). Avoids the
  // OS "listening" chime WebKit plays on every fresh session start, and
  // avoids needing a new user-activation to resume. Matches are ignored
  // while paused.
  keepMicOpen = false,
  sessionActive = true,
}) {
  const normWords = useMemo(() => words.map(normalizeWord), [words]);

  // ---- refs that must always reflect latest values --------------------------
  const pointerRef = useRef(pointer);
  const normWordsRef = useRef(normWords);
  const playingRef = useRef(playing);
  const wpmRef = useRef(wpm);
  useEffect(() => {
    pointerRef.current = pointer;
  }, [pointer]);
  useEffect(() => {
    normWordsRef.current = normWords;
  }, [normWords]);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    wpmRef.current = wpm;
  }, [wpm]);

  // ---- graceful slide -------------------------------------------------------
  // activeRef tracks where the highlight currently is inside this hook so the
  // slide timer always has the true position regardless of React render timing.
  const activeRef = useRef(0);
  const slideRef = useRef(null);
  const targetRef = useRef(0);
  // Base ms/word the in-flight slide ticks at — measured speech rate in voice
  // mode, the wpm setting in auto-scroll mode. Set by slideTo per call.
  const slideRateRef = useRef(400);

  const cancelSlide = useCallback(() => {
    if (slideRef.current) {
      clearTimeout(slideRef.current);
      slideRef.current = null;
    }
  }, []);

  const slideTo = useCallback(
    (target, msPerWord) => {
      targetRef.current = target;
      slideRateRef.current = msPerWord ?? Math.round(60000 / Math.max(40, wpmRef.current));
      // Cancel any in-flight tick and restart — recalculates speed for new gap
      cancelSlide();

      // Backward target (speaker restarted a sentence) — move immediately;
      // sliding backwards word-by-word would read as glitching.
      if (target < activeRef.current) {
        activeRef.current = target;
        setActive(target);
        return;
      }

      // Way behind (resync jump) — snap most of the way, slide the rest.
      if (target - activeRef.current > 8) {
        activeRef.current = nextSpeakable(normWordsRef.current, target - 3);
        setActive(activeRef.current);
      }

      // One step forward, landing on the next speakable word — the peak
      // never rests on standalone punctuation ("—", "---").
      const step = () => {
        activeRef.current = Math.min(
          targetRef.current,
          nextSpeakable(normWordsRef.current, activeRef.current + 1)
        );
        setActive(activeRef.current);
      };

      // Step once immediately so the peak leads onto the next word the
      // moment a match lands; only the remainder of a burst is smoothed.
      if (activeRef.current < targetRef.current) step();
      if (activeRef.current >= targetRef.current) return;

      const interval = () => {
        // Compress the interval when lagging so the peak hugs the spoken word
        const gap = targetRef.current - activeRef.current;
        const speedup = gap <= 1 ? 1 : gap <= 3 ? 2 : 3.5;
        return Math.round(slideRateRef.current / speedup);
      };

      const tick = () => {
        if (!playingRef.current || activeRef.current >= targetRef.current) {
          slideRef.current = null;
          return;
        }
        step();
        slideRef.current = setTimeout(tick, interval());
      };

      slideRef.current = setTimeout(tick, interval());
    },
    [cancelSlide, setActive]
  );

  // ---- voice matching -------------------------------------------------------
  // Persistent across SR events: miss count + previous heard word feed the
  // matcher's bigram resync. Reset on any manual jump.
  const matchStateRef = useRef(createMatchState());

  // Measured speaking rate (ms per script word, EMA) — drives the slide so the
  // highlight follows YOUR pace, not the wpm setting (which is auto-scroll's).
  const rateRef = useRef({ at: 0, msPerWord: 400 });

  // jumpTo: instant move with no slide — for restart / skip / word-click / reset
  const jumpTo = useCallback(
    (idx) => {
      cancelSlide();
      idx = nextSpeakable(normWordsRef.current, idx);
      activeRef.current = idx;
      targetRef.current = idx;
      pointerRef.current = idx;
      matchStateRef.current = createMatchState();
      rateRef.current.at = 0;
      setPointer(idx);
      setActive(idx);
    },
    [cancelSlide, setPointer, setActive]
  );

  // onWords is kept in a ref so useSpeechRecognition never needs to restart
  // when normWords or other deps change — the ref is always current.
  const onWordsRef = useRef(null);
  onWordsRef.current = useCallback(
    (heardWords) => {
      if (!playingRef.current) return; // mic kept warm while paused — ignore
      const nw = normWordsRef.current;
      // Recognizers format spoken numbers as digits ("fourteen thousand" →
      // "14,000"); expand them back into words so they can match the script.
      // The word list is English-only, so gate on the recognition language.
      const expandNums = /^en/i.test(language || navigator.language || 'en');
      const normalized = heardWords
        .flatMap((w) => (expandNums && expandNumberToken(w)) || [w])
        .map(normalizeWord)
        .filter(Boolean);
      const state = matchStateRef.current;

      const start = pointerRef.current;
      let p = start;
      for (const hw of normalized) {
        p = stepPointer(nw, hw, p, state);
      }

      if (p === start) return;

      // Update the measured rate on forward progress only — the clamp keeps
      // pauses between phrases from stretching the average.
      if (p > start) {
        const now = Date.now();
        const { at, msPerWord } = rateRef.current;
        if (at) {
          const sample = Math.min(1200, Math.max(120, (now - at) / (p - start)));
          rateRef.current.msPerWord = Math.round(msPerWord * 0.7 + sample * 0.3);
        }
        rateRef.current.at = now;
      }

      pointerRef.current = p;
      setPointer(p);
      // Peak leads: highlight the NEXT word to be spoken (the pointer),
      // not the last word matched — skipping unspeakable tokens.
      slideTo(nextSpeakable(nw, Math.min(p, nw.length - 1)), rateRef.current.msPerWord);
    },
    [setPointer, slideTo, language]
  );

  // Stable wrapper so useSpeechRecognition never re-subscribes
  const onWords = useCallback((hw) => onWordsRef.current(hw), []);

  const srEnabled = !!(
    voiceEnabled &&
    voiceAvailable &&
    (playing || (keepMicOpen && sessionActive))
  );
  const {
    listening,
    error,
    retry: retryVoice,
  } = useSpeechRecognition({ enabled: srEnabled, onWords, language });

  // ---- auto-scroll (voice off) ----------------------------------------------
  useEffect(() => {
    if (!playing || voiceEnabled) return undefined;
    const ms = Math.round(60000 / Math.max(40, wpm));
    const id = setInterval(() => {
      const nw = normWordsRef.current;
      // Skip unspeakable tokens so a "—" never consumes a wpm tick.
      const next = Math.min(nextSpeakable(nw, pointerRef.current + 1), nw.length - 1);
      pointerRef.current = next;
      setPointer(next);
      slideTo(next);
    }, ms);
    return () => clearInterval(id);
  }, [playing, voiceEnabled, wpm, setPointer, slideTo]);

  // cleanup
  useEffect(() => cancelSlide, [cancelSlide]);

  return { usingVoice: srEnabled && !error, listening, voiceError: error, retryVoice, jumpTo };
}
