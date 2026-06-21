import { describe, it, expect } from 'vitest';
import { creditBuckets, credits, groupCredits, groupContributors } from './credits.js';

const sample = [
  { name: 'Ada', roles: ['code', 'review'] },
  { name: 'Kuvempu', roles: ['translation'], langs: ['kn'] },
  { name: 'Grace', roles: ['code'] },
];

describe('credits buckets', () => {
  it('has unique bucket ids, each with a label and icon', () => {
    const ids = creditBuckets.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of creditBuckets) {
      expect(b.label).toBeTruthy();
      expect(b.icon).toBeTruthy();
    }
  });

  it('seed credits reference only known bucket ids', () => {
    const ids = new Set(creditBuckets.map((b) => b.id));
    for (const c of credits) for (const r of c.roles ?? []) expect(ids.has(r)).toBe(true);
  });

  it('groups people by bucket, in bucket order, dropping empty buckets', () => {
    const groups = groupContributors(sample);
    expect(groups.map((g) => g.id)).toEqual(['translation', 'code', 'review']);
    expect(groups.find((g) => g.id === 'code').members.map((m) => m.name)).toEqual([
      'Ada',
      'Grace',
    ]);
    expect(groups.find((g) => g.id === 'translation').members).toHaveLength(1);
  });

  it('honors `only` to inject a single bucket on demand', () => {
    const groups = groupContributors(sample, ['translation']);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe('translation');
  });

  it('returns nothing when there are no people (section self-hides)', () => {
    expect(groupContributors([])).toEqual([]);
    expect(Array.isArray(groupCredits())).toBe(true);
  });
});
