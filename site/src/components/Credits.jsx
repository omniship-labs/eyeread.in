import { Group } from './Sponsors.jsx';
import { groupCredits, creditsMeta } from '../data/credits.js';

/* Contributor credits, grouped by kind of work (buckets). Reuses the sponsor
   avatar/Group visuals for a consistent look.

   Inject on demand:
   - <Credits />                       → all non-empty buckets, full section
   - <Credits only={['translation']} /> → just one bucket (drop anywhere)
   - <Credits bare />                   → groups only, no <section>/heading wrapper

   Renders nothing when there are no people in the requested buckets, so it can
   sit in the page permanently and only surface once credits.js has entries. */
export default function Credits({ only, bare = false, meta = creditsMeta }) {
  const groups = groupCredits(only);
  if (!groups.length) return null;

  const rows = (
    <div className="sp-mount">
      {groups.map((bucket) => (
        <Group
          key={bucket.id}
          label={bucket.label}
          icon={bucket.icon}
          members={bucket.members}
          size={44}
        />
      ))}
    </div>
  );

  if (bare) return rows;

  return (
    <section className="section credits" id="credits">
      <div className="sec-ey">{meta.eyebrow}</div>
      <h2 className="sec-h">{meta.heading}</h2>
      {meta.subhead && <p className="sponsors-sub">{meta.subhead}</p>}
      {rows}
    </section>
  );
}
