import { describe, it, expect } from 'vitest';
import { fmtTime, wordCount, readingMins, normalizeWord } from './utils';

describe('fmtTime', () => {
  it('formats mm:ss', () => {
    expect(fmtTime(0)).toBe('00:00');
    expect(fmtTime(75)).toBe('01:15');
    expect(fmtTime(3599)).toBe('59:59');
  });
  it('keeps the sign for countdown overrun', () => {
    expect(fmtTime(-61)).toBe('-01:01');
  });
});

describe('wordCount', () => {
  it('counts words across whitespace and newlines', () => {
    expect(wordCount('one two\nthree\n\nfour')).toBe(4);
  });
  it('handles empty text', () => {
    expect(wordCount('')).toBe(0);
  });
});

describe('readingMins', () => {
  it('rounds up and never returns zero', () => {
    expect(readingMins('word', 135)).toBe(1);
    expect(readingMins(Array(300).fill('w').join(' '), 135)).toBe(3);
  });
});

describe('normalizeWord', () => {
  it('lowercases and strips punctuation, keeping apostrophes', () => {
    expect(normalizeWord('Hello,')).toBe('hello');
    expect(normalizeWord("don't")).toBe("don't");
    expect(normalizeWord('— remarkable.')).toBe('remarkable');
  });
});
