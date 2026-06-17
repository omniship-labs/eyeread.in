/**
 * useVoiceTracking
 *
 * Wires speech recognition to the script pointer.
 * pointer + active are owned by OverlayWindow; this hook drives both
 * voice-match advancement and timed auto-scroll.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { normalizeWord } from '../lib/utils';
import { wordMatches } from '../lib/voiceMatch';
import { useSpeechRecognition, srAvailable } from './useSpeechRecognition';

export const voiceAvailable = srAvailable;

export function useVoiceTracking({
  words,
  playing,
  voiceEnabled,
  wpm,
  pointer,    // owned by caller
  setPointer,
  setActive,
  debug,      // optional { logHeard, logMatch, logSkip, logStop }
}) {
  const normWords = useMemo(() => words.map(normalizeWord), [words]);

  // ---- refs that must always reflect latest values --------------------------
  const pointerRef   = useRef(pointer);
  const normWordsRef = useRef(normWords);
  const playingRef   = useRef(playing);
  const wpmRef       = useRef(wpm);
  const debugRef     = useRef(debug);
  useEffect(() => { pointerRef.current   = pointer;   }, [pointer]);
  useEffect(() => { normWordsRef.current = normWords; }, [normWords]);
  useEffect(() => { playingRef.current   = playing;   }, [playing]);
  useEffect(() => { wpmRef.current       = wpm;       }, [wpm]);
  useEffect(() => { debugRef.current     = debug;     }, [debug]);

  // ---- graceful slide -------------------------------------------------------
  // activeRef tracks where the highlight currently is inside this hook so the
  // slide timer always has the true position regardless of React render timing.
  const activeRef  = useRef(0);
  const slideRef   = useRef(null);
  const targetRef  = useRef(0);

  const cancelSlide = useCallback(() => {
    if (slideRef.current) { clearTimeout(slideRef.current); slideRef.current = null; }
  }, []);

  const slideTo = useCallback((target) => {
    targetRef.current = target;
    // Cancel any in-flight tick and restart — recalculates speed for new gap
    cancelSlide();

    const tick = () => {
      if (!playingRef.current || activeRef.current >= targetRef.current) {
        slideRef.current = null;
        return;
      }
      activeRef.current += 1;
      setActive(activeRef.current);

      // Variable speed: compress interval when lagging behind
      const gap          = targetRef.current - activeRef.current;
      const baseMsPerWord = Math.round(60000 / Math.max(40, wpmRef.current));
      const speedup      = gap <= 1 ? 1 : gap <= 3 ? 1.8 : 3;
      slideRef.current   = setTimeout(tick, Math.round(baseMsPerWord / speedup));
    };

    const gap          = targetRef.current - activeRef.current;
    const baseMsPerWord = Math.round(60000 / Math.max(40, wpmRef.current));
    const speedup      = gap <= 1 ? 1 : gap <= 3 ? 1.8 : 3;
    slideRef.current   = setTimeout(tick, Math.round(baseMsPerWord / speedup));
  }, [cancelSlide, setActive]);

  // jumpTo: instant move with no slide — for restart / skip / word-click / reset
  const jumpTo = useCallback((idx) => {
    cancelSlide();
    activeRef.current  = idx;
    targetRef.current  = idx;
    pointerRef.current = idx;
    setPointer(idx);
    setActive(idx);
  }, [cancelSlide, setPointer, setActive]);

  // ---- voice matching -------------------------------------------------------
  // onWords is kept in a ref so useSpeechRecognition never needs to restart
  // when normWords or other deps change — the ref is always current.
  const onWordsRef = useRef(null);
  onWordsRef.current = useCallback((heardWords) => {
    const nw  = normWordsRef.current;
    const dbg = debugRef.current;
    const normalized = heardWords.map(normalizeWord).filter(Boolean);
    dbg?.logHeard(normalized);

    // Search starts no more than 2 ahead of the visible highlight to prevent
    // jumping to a repeated phrase before the slide catches up
    const searchFrom = Math.min(pointerRef.current, activeRef.current + 2);
    let p = searchFrom;

    for (const hw of normalized) {
      if (!hw) continue;
      const windowEnd = Math.min(nw.length, p + 3);
      let matched = false;
      for (let j = p; j < windowEnd; j++) {
        if (!nw[j]) continue;
        if (wordMatches(nw[j], hw)) {
          if (j > p) dbg?.logSkip(hw, p, j + 1);
          else       dbg?.logMatch(hw, nw[j], j);
          p = j + 1;
          matched = true;
          break;
        }
      }
      if (!matched) dbg?.logStop(hw, p);
    }

    if (p > pointerRef.current) {
      pointerRef.current = p;
      setPointer(p);
      slideTo(Math.min(p - 1, nw.length - 1));
    }
  }, [setPointer, slideTo]); // normWords via ref, no stale closure

  // Stable wrapper so useSpeechRecognition never re-subscribes
  const onWords = useCallback((hw) => onWordsRef.current(hw), []);

  const srEnabled = !!(playing && voiceEnabled && voiceAvailable);
  const { listening, error } = useSpeechRecognition({ enabled: srEnabled, onWords });

  // ---- auto-scroll (voice off) ----------------------------------------------
  useEffect(() => {
    if (!playing || voiceEnabled) return undefined;
    const ms = Math.round(60000 / Math.max(40, wpm));
    const id = setInterval(() => {
      const nw   = normWordsRef.current;
      const next = Math.min(pointerRef.current + 1, nw.length - 1);
      pointerRef.current = next;
      setPointer(next);
      slideTo(next);
    }, ms);
    return () => clearInterval(id);
  }, [playing, voiceEnabled, wpm, setPointer, slideTo]);

  // cleanup
  useEffect(() => cancelSlide, [cancelSlide]);

  return { usingVoice: srEnabled && !error, listening, voiceError: error, jumpTo };
}
