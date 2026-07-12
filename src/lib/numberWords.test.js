import { describe, it, expect } from 'vitest';
import { expandNumberToken } from './numberWords';
import { advancePointer, wordMatches } from './voiceMatch';
import { normalizeWord } from './utils';

describe('expandNumberToken', () => {
  it('expands plain integers', () => {
    expect(expandNumberToken('92')).toEqual(['ninety', 'two']);
    expect(expandNumberToken('7')).toEqual(['seven']);
    expect(expandNumberToken('215')).toEqual(['two', 'hundred', 'fifteen']);
  });

  it('expands comma-grouped thousands', () => {
    expect(expandNumberToken('14,000')).toEqual(['fourteen', 'thousand']);
    expect(expandNumberToken('1,200,000')).toEqual([
      'one',
      'million',
      'two',
      'hundred',
      'thousand',
    ]);
  });

  it('expands decimals digit by digit', () => {
    expect(expandNumberToken('1.4')).toEqual(['one', 'point', 'four']);
  });

  it('expands percent and dollars', () => {
    expect(expandNumberToken('92%')).toEqual(['ninety', 'two', 'percent']);
    expect(expandNumberToken('$40')).toEqual(['forty', 'dollars']);
    expect(expandNumberToken('$1')).toEqual(['one', 'dollar']);
  });

  it('expands clock times', () => {
    expect(expandNumberToken('10:30')).toEqual(['ten', 'thirty']);
    expect(expandNumberToken('9:05')).toEqual(['nine', 'oh', 'five']);
  });

  it('ignores trailing sentence punctuation', () => {
    expect(expandNumberToken('14,000,')).toEqual(['fourteen', 'thousand']);
    expect(expandNumberToken('92%.')).toEqual(['ninety', 'two', 'percent']);
  });

  it('returns null for non-numeric tokens', () => {
    expect(expandNumberToken('installs')).toBeNull();
    expect(expandNumberToken('10:99')).toBeNull(); // not a time, not a number
    expect(expandNumberToken('')).toBeNull();
  });
});

describe('digit-formatted recognizer output vs worded script', () => {
  // "Three numbers define this quarter: fourteen thousand active installs,"
  // heard by Apple SR as "three numbers define this quarter 14,000 active installs"
  const script = 'Three numbers define this quarter: fourteen thousand active installs,'
    .split(/\s+/)
    .map(normalizeWord);

  it('tracks through the number once the heard token is expanded', () => {
    const heard = [
      'three',
      'numbers',
      'define',
      'this',
      'quarter',
      '14,000',
      'active',
      'installs',
    ]
      .flatMap((w) => expandNumberToken(w) ?? [w])
      .map(normalizeWord);
    expect(advancePointer(script, heard, 0)).toBe(script.length);
  });
});

describe('worded speech vs digit-formatted script token', () => {
  it('matches spoken number words against a digit script token', () => {
    expect(wordMatches('14000', 'fourteen')).toBe(true);
    expect(wordMatches('14000', 'thousand')).toBe(true);
    expect(wordMatches('14000', 'active')).toBe(false);
  });
});
