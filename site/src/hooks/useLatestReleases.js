import { useEffect, useState } from 'react';

/* Fetches both channels' latest.json manifests client-side. Same shape Tauri's
   updater itself reads: { version, pub_date, platforms: { <os-arch>: { url,
   signature } } }. Stable's manifest lives at a fixed GitHub "latest release"
   URL (safe — each v* tag is only ever published once, so there's no
   immutable-release conflict); nightly's lives on the nightly-manifest branch
   because a single rolling release/tag isn't possible there (see
   docs/RELEASING.md). Both are public, static JSON with permissive CORS. */
const MANIFEST_URLS = {
  stable: 'https://github.com/omniship-labs/eyeread.in/releases/latest/download/latest.json',
  nightly:
    'https://raw.githubusercontent.com/omniship-labs/eyeread.in/nightly-manifest/latest.json',
};

function useManifest(url) {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let cancelled = false;
    fetch(url)
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
  const stable = useManifest(MANIFEST_URLS.stable);
  const nightly = useManifest(MANIFEST_URLS.nightly);
  return { stable, nightly };
}
