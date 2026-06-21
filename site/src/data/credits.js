/* ============================================================
   eyeread.in · marketing site — credits / contributors
   ------------------------------------------------------------
   SINGLE SOURCE OF TRUTH for who gets credited and for what.

   Work is organised into BUCKETS (translation, engineering,
   design, …). A person can sit in several buckets. The <Credits>
   component groups people by bucket on render and hides any
   bucket with nobody in it — so this list can grow incrementally
   and the section "appears" only once there's something to show.

   Add a person:
     { name, profile, image, roles: ['translation'], langs: ['kn'] }
   - `profile`  optional link (GitHub, site, …)
   - `image`    optional avatar URL (falls back to initials)
   - `roles`    one or more bucket ids from `creditBuckets`
   - `langs`    optional locale codes, for the translation bucket
   ============================================================ */

// The buckets, in display order. `icon` is an <Icon name> (see Icon.jsx).
export const creditBuckets = [
  { id: 'translation', label: 'Translation', icon: 'languages' },
  { id: 'code', label: 'Engineering', icon: 'code' },
  { id: 'design', label: 'Design', icon: 'palette' },
  { id: 'review', label: 'Review & QA', icon: 'check' },
  { id: 'docs', label: 'Docs', icon: 'file-text' },
  { id: 'infra', label: 'Infrastructure', icon: 'wrench' },
];

// Section copy (kept here, not in i18n, so the buckets stay editable in one
// place; pass overrides to <Credits> if you ever localize these).
export const creditsMeta = {
  eyebrow: 'Made with help',
  heading: 'Contributors & credits',
  subhead: 'The people who translate, build, design, and review eyeread.in.',
};

// The contributors. Seeded empty — fill as people pitch in.
export const credits = [
  // {
  //   name: 'Ada Lovelace',
  //   profile: 'https://github.com/ada',
  //   image: 'https://github.com/ada.png',
  //   roles: ['code', 'review'],
  // },
  // {
  //   name: 'Kuvempu',
  //   profile: 'https://github.com/kuvempu',
  //   roles: ['translation'],
  //   langs: ['kn'],
  // },
];

/**
 * Pure grouping: bucket a list of contributors. Kept separate from the live
 * `credits` data so it's trivially testable with fixtures.
 * @param {Array} people - contributor objects
 * @param {string[]} [only] - restrict to these bucket ids
 * @returns ordered buckets that actually have people, each with `members`.
 */
export function groupContributors(people, only) {
  const buckets =
    only && only.length ? creditBuckets.filter((b) => only.includes(b.id)) : creditBuckets;
  return buckets
    .map((bucket) => ({
      ...bucket,
      members: people.filter((c) => c.roles?.includes(bucket.id)),
    }))
    .filter((bucket) => bucket.members.length > 0);
}

/**
 * Group the live credits by bucket for rendering.
 * @param {string[]} [only] - restrict to these bucket ids (inject one bucket on
 *   demand, e.g. groupCredits(['translation'])). Omit for all buckets.
 */
export function groupCredits(only) {
  return groupContributors(credits, only);
}
