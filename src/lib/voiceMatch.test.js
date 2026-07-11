import { describe, it, expect } from 'vitest';
import { advancePointer, stepPointer, createMatchState, nextSpeakable } from './voiceMatch';

const script = 'look right at the lens not at your notes'.split(' ');

describe('advancePointer', () => {
  it('advances past exactly matched words', () => {
    expect(advancePointer(script, ['look', 'right', 'at'], 0)).toBe(3);
  });

  it('skips recognizer noise between matches', () => {
    expect(advancePointer(script, ['look', 'um', 'right'], 0)).toBe(2);
  });

  it('jumps over a few skipped script words within the lookahead', () => {
    // speaker skipped "right at" — "the" is 3 ahead
    expect(advancePointer(script, ['look', 'the', 'lens'], 0)).toBe(5);
  });

  it('does not match words beyond the lookahead window', () => {
    // "notes" is the last word — far outside lookahead from 0
    expect(advancePointer(script, ['notes'], 0)).toBe(0);
  });

  it('matches by prefix in both directions for words longer than 3 chars', () => {
    expect(advancePointer(['presentation'], ['present'], 0)).toBe(1);
    expect(advancePointer(['present'], ['presentation'], 0)).toBe(1);
  });

  it('never matches short words by prefix', () => {
    expect(advancePointer(['ant'], ['an'], 0)).toBe(0);
  });

  it('returns the pointer unchanged for empty input', () => {
    expect(advancePointer(script, [], 4)).toBe(4);
  });
});

describe('stepPointer resync', () => {
  const long = (
    'welcome everyone today we will talk about shipping fast and breaking nothing ' +
    'because quality matters more than speed in the long run'
  ).split(' ');

  function feed(words, pointer = 0, state = createMatchState()) {
    let p = pointer;
    for (const hw of words) p = stepPointer(long, hw, p, state);
    return p;
  }

  it('a single miss never moves the pointer', () => {
    const state = createMatchState();
    expect(stepPointer(long, 'quality', 0, state)).toBe(0);
    expect(state.misses).toBe(1);
  });

  it('re-locks ahead via bigram after the speaker skips past the lookahead', () => {
    // speaker jumps from the start straight to "quality matters" (index 13-14)
    expect(feed(['welcome', 'quality', 'matters'])).toBe(15);
  });

  it('follows the speaker backwards when they restart a sentence', () => {
    // tracked to "breaking" (p=11), speaker restarts "today we ..."
    const state = createMatchState();
    let p = 11;
    p = stepPointer(long, 'today', p, state); // miss
    p = stepPointer(long, 'we', p, state); // bigram → back to index 4
    expect(p).toBe(4);
  });

  it('prefers the occurrence nearest the pointer for repeated bigrams', () => {
    const rep = 'this is one thing and this is another thing entirely'.split(' ');
    const state = createMatchState();
    let p = 4; // sitting at "and"
    p = stepPointer(rep, 'thing', p, state); // miss ("and this is" in window)
    p = stepPointer(rep, 'entirely', p, state); // second miss → bigram resync

    expect(p).toBe(10); // "thing entirely" near the end, not the earlier "thing"
  });

  it('recovers from a full stall once misses accumulate (wide search)', () => {
    const state = createMatchState();
    let p = 0;
    for (const hw of ['xxx', 'yyy', 'zzz', 'www', 'vvv']) p = stepPointer(long, hw, p, state);
    expect(p).toBe(0); // gibberish never moves it
    p = stepPointer(long, 'long', p, state); // miss count high, still no bigram
    p = stepPointer(long, 'run', p, state); // "long run" found script-wide
    expect(p).toBe(long.length);
  });
});

describe('nextSpeakable', () => {
  // normalized script: punctuation-only tokens become ''
  const nw = ['say', '', 'what', 'this', '', '', 'team', ''];

  it('returns the index itself when already speakable', () => {
    expect(nextSpeakable(nw, 2)).toBe(2);
  });

  it('skips over unspeakable tokens', () => {
    expect(nextSpeakable(nw, 1)).toBe(2);
    expect(nextSpeakable(nw, 4)).toBe(6);
  });

  it('falls back to the last speakable word at the end', () => {
    expect(nextSpeakable(nw, 7)).toBe(6);
    expect(nextSpeakable(nw, 99)).toBe(6);
  });

  it('clamps negative indices', () => {
    expect(nextSpeakable(nw, -3)).toBe(0);
  });
});
