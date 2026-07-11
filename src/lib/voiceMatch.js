/**
 * Pure word-alignment for voice tracking (no DOM, no React — unit-testable).
 *
 * Key design:
 * - Tiny lookahead (3 words) so repeated phrases ("this is the … this is the")
 *   always match the nearest occurrence, never skip ahead.
 * - Advance by 1 per heard word that matches within that tiny window.
 * - No minimum-match gate — every matching word moves the pointer forward.
 * - Bigram resync: after 2+ consecutive misses the last two heard words are
 *   searched as a pair in a wider window (both directions — speakers restart
 *   flubbed sentences), nearest occurrence wins. A lone miss never jumps.
 */

export const LOOKAHEAD = 3;
export const RESYNC_BEHIND = 12;
export const RESYNC_AHEAD = 20;
const RESYNC_MISSES = 2;
/** After this many misses the bigram search widens to the whole script. */
const LOST_MISSES = 5;

/** Levenshtein distance, bails early once > maxDist */
function editDistance(a, b, maxDist = 2) {
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
  const m = a.length,
    n = b.length;
  const row = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : 1 + Math.min(prev, row[j], row[j - 1]);
      row[j - 1] = prev;
      prev = val;
    }
    row[n] = prev;
  }
  return row[n];
}

export function wordMatches(sw, hw) {
  if (sw === hw) return true;
  // prefix/suffix — handles truncation mid-utterance
  if (hw.length > 3 && sw.startsWith(hw)) return true;
  if (sw.length > 3 && hw.startsWith(sw)) return true;
  // fuzzy: allow 1 edit for longer words (accent tolerance)
  if (sw.length > 4 && hw.length > 4 && editDistance(sw, hw, 1) <= 1) return true;
  return false;
}

/** Mutable per-session match state — create one per playback run. */
export function createMatchState() {
  return { misses: 0, prev: null };
}

/**
 * Process ONE heard word and return the new pointer.
 *
 * 1. Nearest match inside the tiny lookahead window advances the pointer;
 *    this is the hot path and can never skip a repeated phrase.
 * 2. On a miss, count it. From RESYNC_MISSES misses onward, try to re-lock:
 *    the previous + current heard words must match two consecutive script
 *    words inside [pointer − RESYNC_BEHIND, pointer + RESYNC_AHEAD); the
 *    candidate closest to the pointer wins, so common pairs ("of the")
 *    re-lock at the natural spot. Backward wins let the tracker follow a
 *    speaker who restarts a sentence.
 * 3. From LOST_MISSES misses the same bigram search covers the whole script
 *    as a last resort — still nearest-first.
 *
 * @param {string[]} scriptWords - normalized script words
 * @param {string}   hw          - one normalized heard word
 * @param {number}   pointer     - current search position
 * @param {{misses:number, prev:?string}} state - from createMatchState(), mutated
 * @returns {number} new pointer
 */
export function stepPointer(scriptWords, hw, pointer, state) {
  if (!hw) return pointer;

  const end = Math.min(scriptWords.length, pointer + LOOKAHEAD);
  for (let j = pointer; j < end; j++) {
    if (scriptWords[j] && wordMatches(scriptWords[j], hw)) {
      state.misses = 0;
      state.prev = hw;
      return j + 1;
    }
  }

  state.misses += 1;

  if (state.misses >= RESYNC_MISSES && state.prev) {
    const wide = state.misses >= LOST_MISSES;
    const lo = wide ? 0 : Math.max(0, pointer - RESYNC_BEHIND);
    const hi = wide
      ? scriptWords.length - 1
      : Math.min(scriptWords.length - 1, pointer + RESYNC_AHEAD);
    let best = -1;
    let bestDist = Infinity;
    for (let j = lo; j < hi; j++) {
      if (!scriptWords[j] || !scriptWords[j + 1]) continue;
      if (wordMatches(scriptWords[j], state.prev) && wordMatches(scriptWords[j + 1], hw)) {
        const dist = Math.abs(j - pointer);
        if (dist < bestDist) {
          best = j;
          bestDist = dist;
        }
      }
    }
    if (best >= 0) {
      state.misses = 0;
      state.prev = hw;
      return best + 2;
    }
  }

  state.prev = hw;
  return pointer;
}

/**
 * Smallest index >= idx whose normalized word is speakable (non-empty).
 * Standalone punctuation tokens ("—", "---", "•") normalize to "" and can
 * never be spoken, so the highlight peak should never rest on them.
 * Falls back to the last speakable word when nothing speakable lies ahead.
 */
export function nextSpeakable(normWords, idx) {
  let j = Math.max(0, idx);
  while (j < normWords.length && !normWords[j]) j++;
  if (j < normWords.length) return j;
  j = Math.min(Math.max(0, idx), normWords.length - 1);
  while (j > 0 && !normWords[j]) j--;
  return j;
}

/**
 * Convenience wrapper: run a batch of heard words through stepPointer.
 * Stateless (fresh match state) — kept for tests and simple callers.
 */
export function advancePointer(scriptWords, heardWords, pointer) {
  const state = createMatchState();
  let p = pointer;
  for (const hw of heardWords) {
    if (!hw) continue;
    p = stepPointer(scriptWords, hw, p, state);
  }
  return p;
}
