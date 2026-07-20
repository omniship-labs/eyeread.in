// The site fetches live GitHub data at runtime on every page — a star count
// (OpenSource.jsx, home page only) and release manifests (useLatestReleases,
// rendered via Nav/Hero on every page, and Download.jsx). That's genuinely
// non-deterministic across two captures a few seconds apart in CI: this
// exact thing once produced a real page-height diff between a base and head
// capture with zero site code changed, because the unauthenticated
// api.github.com rate limit (60/hr, shared across every worker/viewport/leg
// in one run) got hit on one capture but not the other. Any spec that loads
// a page should call mockExternalData(page) before navigating, so its
// rendered content — and thus any screenshot — is identical every run.
export const FIXTURE_RELEASE = {
  id: 1,
  tag_name: 'v0.1.0',
  name: 'eyeread.in (0.1.0)',
  published_at: '2026-01-01T00:00:00Z',
  html_url: 'https://github.com/omniship-labs/eyeread.in/releases/tag/v0.1.0',
  body: 'Initial release notes.',
  draft: false,
  assets: [
    {
      name: 'eyeread.in_0.1.0_x64-setup.exe',
      browser_download_url: 'https://example.com/x64-setup.exe',
    },
    {
      name: 'eyeread.in_0.1.0_arm64-setup.exe',
      browser_download_url: 'https://example.com/arm64-setup.exe',
    },
    {
      name: 'eyeread.in_0.1.0_amd64.AppImage',
      browser_download_url: 'https://example.com/app.AppImage',
    },
    { name: 'eyeread.in_0.1.0.dmg', browser_download_url: 'https://example.com/app.dmg' },
  ],
};

// A second, glimpse-tagged release — useLatestReleases picks the first
// glimpse-v* entry out of the releases list, and Download.jsx's glimpse
// channel needs one to render its real UI rather than the no-glimpse
// fallback state.
export const FIXTURE_GLIMPSE_RELEASE = {
  ...FIXTURE_RELEASE,
  id: 2,
  tag_name: 'glimpse-v0.1.0-20260101',
  name: 'eyeread.in glimpse (0.1.0-glimpse.20260101)',
  html_url: 'https://github.com/omniship-labs/eyeread.in/releases/tag/glimpse-v0.1.0-20260101',
};

const SHIELDS_BADGE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#555"/></svg>';

export async function mockExternalData(page) {
  await page.route('https://api.github.com/repos/omniship-labs/eyeread.in**', (route) => {
    const url = route.request().url();
    if (url.includes('/releases/latest')) {
      return route.fulfill({ json: FIXTURE_RELEASE });
    }
    if (url.includes('/releases')) {
      return route.fulfill({ json: [FIXTURE_RELEASE, FIXTURE_GLIMPSE_RELEASE] });
    }
    return route.fulfill({ json: { stargazers_count: 1234 } });
  });
  await page.route('https://img.shields.io/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/svg+xml', body: SHIELDS_BADGE_SVG })
  );
}
