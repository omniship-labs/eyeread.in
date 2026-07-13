import { useEffect, useState } from 'react';

/* Fetches release data client-side via the GitHub REST API — NOT the raw
   release-asset download URLs (github.com/.../releases/download/... and its
   release-assets.githubusercontent.com redirect target send no CORS headers
   at all, so a browser fetch() against them fails outright, regardless of
   whether the release exists). api.github.com is designed for public API
   consumption and sends `Access-Control-Allow-Origin: *` on every response,
   including 404s, so it's the only one of the three GitHub domains involved
   here that's actually usable from client-side JS.

   Unauthenticated api.github.com calls are rate-limited (60/hr per IP) — fine
   for this traffic level; revisit with a cached edge proxy if that changes. */
const API = 'https://api.github.com/repos/omniship-labs/eyeread.in';

function useApiFetch(url) {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let cancelled = false;
    fetch(url, { headers: { Accept: 'application/vnd.github+json' } })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setState({ loading: false, error: null, data });
      })
      .catch((error) => {
        if (!cancelled) setState({ loading: false, error, data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}

export function useLatestReleases() {
  const stable = useApiFetch(`${API}/releases/latest`);
  // Glimpse has no single "latest" release — immutable releases forbid
  // reusing one tag, so every glimpse build gets its own permanent tag (see
  // docs/RELEASING.md). List recent releases and take the first glimpse-*
  // one (the list is already sorted newest-first by GitHub).
  const glimpseList = useApiFetch(`${API}/releases?per_page=10`);
  const glimpse = {
    loading: glimpseList.loading,
    error: glimpseList.error,
    data: glimpseList.data?.find((r) => r.tag_name.startsWith('glimpse-v')) ?? null,
  };

  return { stable, glimpse };
}
