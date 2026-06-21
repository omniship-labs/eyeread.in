import { useEffect, useState } from 'react';

/**
 * Fetch financial contributors from Open Collective in the browser, so the
 * Backers & sponsors section is always current with no rebuild. Contributors
 * are split into Sponsors / Backers by lifetime total (the all.json feed has
 * no tier name, so we derive it from the amount).
 *
 * @returns {{ status: 'loading'|'ready'|'empty'|'error',
 *            sponsors: object[], backers: object[] }}
 */
export function useSponsors({ collectiveSlug, sponsorThreshold = 100 }) {
  const [state, setState] = useState({ status: 'loading', sponsors: [], backers: [] });

  useEffect(() => {
    let cancelled = false;
    const url = `https://opencollective.com/${collectiveSlug}/members/all.json`;

    (async () => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const members = await res.json();
        if (cancelled) return;

        const active = (Array.isArray(members) ? members : [])
          .filter((m) => m.role === 'BACKER' && m.isActive && (m.totalAmountDonated ?? 0) > 0)
          .sort((a, b) => (b.totalAmountDonated ?? 0) - (a.totalAmountDonated ?? 0));

        if (active.length === 0) {
          setState({ status: 'empty', sponsors: [], backers: [] });
          return;
        }
        setState({
          status: 'ready',
          sponsors: active.filter((m) => (m.totalAmountDonated ?? 0) >= sponsorThreshold),
          backers: active.filter((m) => (m.totalAmountDonated ?? 0) < sponsorThreshold),
        });
      } catch {
        if (!cancelled) setState({ status: 'error', sponsors: [], backers: [] });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [collectiveSlug, sponsorThreshold]);

  return state;
}

export default useSponsors;
