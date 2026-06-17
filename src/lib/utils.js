export function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

export function readingMins(text, wpm = 135) {
  return Math.max(1, Math.ceil(wordCount(text) / wpm));
}

/** mm:ss, supports negative values for countdown overrun. */
export function fmtTime(t) {
  const sign = t < 0 ? '-' : '';
  t = Math.abs(Math.floor(t));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Lowercase, strip punctuation — for voice/word matching. */
export function normalizeWord(w) {
  return w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');
}
