import { describe, it, expect } from 'vitest';
import { locales, resources, DEFAULT_LOCALE, localePath } from './registry.js';

const base = resources[DEFAULT_LOCALE].translation;

/* A structural fingerprint of a bundle: the set of keys at every level and the
   length of every array. Two bundles with the same fingerprint expose exactly
   the same strings to the components — which is what buildConfig() relies on. */
function shape(value) {
  if (Array.isArray(value)) return ['array', value.length, value.map(shape)];
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return ['object', keys, keys.map((k) => shape(value[k]))];
  }
  return typeof value;
}

describe('i18n registry', () => {
  it('lists every resource locale exactly once, with no duplicate codes', () => {
    expect(locales.map((l) => l.code).sort()).toEqual(Object.keys(resources).sort());
    const codes = locales.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('includes the default locale', () => {
    expect(resources[DEFAULT_LOCALE]).toBeDefined();
  });

  it('serves the default locale at root and others in a subdirectory', () => {
    expect(localePath(DEFAULT_LOCALE)).toBe('/');
    for (const { code } of locales.filter((l) => l.code !== DEFAULT_LOCALE)) {
      expect(localePath(code)).toBe(`/${code}/`);
    }
  });

  it('gives every locale switcher metadata (native, region, og)', () => {
    for (const l of locales) {
      expect(l.native, `${l.code}.native`).toBeTruthy();
      expect(l.region, `${l.code}.region`).toBeTruthy();
      expect(l.og, `${l.code}.og`).toMatch(/^[a-z]{2,3}_[A-Z]{2}$/);
    }
  });

  const expected = JSON.stringify(shape(base));
  for (const { code } of locales) {
    it(`${code} matches the en bundle shape (same keys + array lengths)`, () => {
      expect(JSON.stringify(shape(resources[code].translation))).toBe(expected);
    });
  }

  it('every locale has a non-empty head title and description', () => {
    for (const { code } of locales) {
      const { meta } = resources[code].translation;
      expect(meta.title, `${code}.meta.title`).toBeTruthy();
      expect(meta.description, `${code}.meta.description`).toBeTruthy();
    }
  });
});
