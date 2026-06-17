/**
 * Pure word-alignment for voice tracking (no DOM, no React — unit-testable).
 *
 * Key design:
 * - Tiny lookahead (3 words) so repeated phrases ("this is the … this is the")
 *   always match the nearest occurrence, never skip ahead.
 * - Advance by 1 per heard word that matches within that tiny window.
 * - No minimum-match gate — every matching word moves the pointer forward.
 */

/** Levenshtein distance, bails early once > maxDist */
function editDistance(a, b, maxDist = 2) {
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
  const m = a.length, n = b.length;
  const row = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      const val = a[i - 1] === b[j - 1]
        ? row[j - 1]
        : 1 + Math.min(prev, row[j], row[j - 1]);
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

/**
 * Advance the pointer one word at a time, tiny lookahead to prevent
 * jumping over repeated phrases.
 *
 * @param {string[]} scriptWords
 * @param {string[]} heardWords   - last few words from SR (normalized)
 * @param {number}   pointer      - current search position
 * @param {number}   lookahead    - keep this small (3) to avoid phrase-skipping
 */
export function advancePointer(scriptWords, heardWords, pointer, lookahead = 3) {
  let p = pointer;
  for (const hw of heardWords) {
    if (!hw) continue;
    const end = Math.min(scriptWords.length, p + lookahead);
    for (let j = p; j < end; j++) {
      const sw = scriptWords[j];
      if (!sw) continue;
      if (wordMatches(sw, hw)) {
        p = j + 1;
        break;
      }
    }
    // no match in tiny window — stay put, don't skip
  }
  return p;
}
