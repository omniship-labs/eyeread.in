import { describe, it, expect } from 'vitest';
import { locales, resources, DEFAULT_LOCALE } from './registry.js';

const base = resources[DEFAULT_LOCALE].translation;

/* A structural fingerprint of a bundle: the set of keys at every level. Two
   bundles with the same fingerprint expose exactly the same strings to the
   components, so the UI never falls back to a raw key in another language. */
function shape(value) {
  if (Array.isArray(value)) return ['array', value.length, value.map(shape)];
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return ['object', keys, keys.map((k) => shape(value[k]))];
  }
  return typeof value;
}

describe('app i18n registry', () => {
  it('lists every resource locale exactly once, with no duplicate codes', () => {
    expect(locales.map((l) => l.code).sort()).toEqual(Object.keys(resources).sort());
    const codes = locales.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('includes the default locale', () => {
    expect(resources[DEFAULT_LOCALE]).toBeDefined();
  });

  it('gives every locale switcher metadata (native, region)', () => {
    for (const l of locales) {
      expect(l.native, `${l.code}.native`).toBeTruthy();
      expect(l.region, `${l.code}.region`).toBeTruthy();
    }
  });

  const expected = JSON.stringify(shape(base));
  for (const { code } of locales) {
    it(`${code} matches the en bundle shape (same keys)`, () => {
      expect(JSON.stringify(shape(resources[code].translation))).toBe(expected);
    });
  }

  it('every locale has a non-empty language switcher label', () => {
    for (const { code } of locales) {
      expect(resources[code].translation.switcher.label, `${code}.switcher.label`).toBeTruthy();
    }
  });
});
