import { describe, it, expect } from 'vitest';
import { advancePointer } from './voiceMatch';

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
