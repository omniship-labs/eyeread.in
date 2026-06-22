// In-app credits helpers. The screen-share testers shown in the About window
// are derived from the SAME source of truth the marketing site uses
// (site/src/data/compat.js), so a verified tester is credited everywhere at
// once — no second list to maintain.
import { compat } from '../../site/src/data/compat.js';

/**
 * Unique screen-share testers (verifiers) across all compatibility rows,
 * de-duped by profile||name and kept in first-seen order.
 * @returns {{name: string, profile?: string}[]}
 */
export function getTesters() {
  const seen = new Set();
  const testers = [];
  for (const row of compat) {
    for (const v of row.verifiers || []) {
      const key = v.profile || v.name;
      if (key && !seen.has(key)) {
        seen.add(key);
        testers.push(v);
      }
    }
  }
  return testers;
}
