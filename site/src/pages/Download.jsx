import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icon.jsx';
import { useOSPlatform } from '../hooks/useOSPlatform.js';
import { useLatestReleases } from '../hooks/useLatestReleases.js';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';

// The manifest's macOS entry is the updater's .app.tar.gz (a plain tarball,
// not the friendlier .dmg) — Tauri's updater only ever needs the tarball, so
// that's the only mac asset with a fixed, version-agnostic manifest entry.
// Rather than link people to a raw tarball, extract the release tag from the
// URL (".../releases/download/<tag>/filename") and send them to that
// release's normal GitHub page, where the .dmg is right there. Zero extra
// network calls — this is just string-parsing a URL we already fetched.
function releasePageFromAssetUrl(url) {
  const match = url?.match(/\/releases\/download\/([^/]+)\//);
  return match ? `https://github.com/omniship-labs/eyeread.in/releases/tag/${match[1]}` : null;
}

const PLATFORM_ORDER = ['macos', 'windows', 'linux'];

function PlatformCard({ id, icon, label, sublabel, href, recommended, t }) {
  if (!href) return null;
  return (
    <a className={`dl-card${recommended ? ' dl-card-rec' : ''}`} href={href} data-platform={id}>
      {recommended && <span className="dl-rec-badge">{t('download.recommended')}</span>}
      <Icon name={icon} size={28} />
      <span className="dl-card-label">{label}</span>
      {sublabel && <span className="dl-card-sub">{sublabel}</span>}
    </a>
  );
}

function ChannelSection({ variant, heading, subhead, manifest, t }) {
  const os = useOSPlatform();

  if (manifest.loading) {
    return (
      <div className={`dl-channel dl-channel-${variant}`}>
        <h2 className="dl-channel-h">{heading}</h2>
        <p className="dl-channel-sub">{subhead}</p>
        <p className="dl-status">{t('download.loading')}</p>
      </div>
    );
  }

  if (manifest.error || !manifest.data) {
    return (
      <div className={`dl-channel dl-channel-${variant}`}>
        <h2 className="dl-channel-h">{heading}</h2>
        <p className="dl-channel-sub">{subhead}</p>
        <p className="dl-status dl-status-error">
          {t('download.error')}{' '}
          <a
            href="https://github.com/omniship-labs/eyeread.in/releases"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('download.errorLink')}
          </a>
        </p>
      </div>
    );
  }

  const { platforms, version } = manifest.data;
  const macHref = releasePageFromAssetUrl(platforms['darwin-aarch64']?.url);
  const cards = {
    macos: [
      {
        id: 'macos',
        icon: 'apple',
        label: t('download.macos'),
        sublabel: t('download.macosSub'),
        href: macHref,
        recommended: os === 'macos',
      },
    ],
    windows: [
      {
        id: 'windows-x64',
        icon: 'windows',
        label: t('download.windowsX64'),
        href: platforms['windows-x86_64']?.url,
        recommended: os === 'windows',
      },
      {
        id: 'windows-arm64',
        icon: 'windows',
        label: t('download.windowsArm64'),
        href: platforms['windows-aarch64']?.url,
        recommended: false,
      },
    ],
    linux: [
      {
        id: 'linux',
        icon: 'linux',
        label: t('download.linux'),
        sublabel: t('download.linuxSub'),
        href: platforms['linux-x86_64']?.url,
        recommended: os === 'linux',
      },
    ],
  };

  return (
    <div className={`dl-channel dl-channel-${variant}`}>
      <h2 className="dl-channel-h">{heading}</h2>
      <p className="dl-channel-sub">{subhead}</p>
      <p className="dl-version">{t('download.version', { version })}</p>
      <div className="dl-grid">
        {PLATFORM_ORDER.flatMap((platform) =>
          cards[platform].map((card) => <PlatformCard key={card.id} {...card} t={t} />)
        )}
      </div>
    </div>
  );
}

export default function Download({ config }) {
  const { t } = useTranslation();
  useDocumentMeta(config.download.meta);
  const { stable, nightly } = useLatestReleases();

  return (
    <main className="dl-page">
      <section className="section dl-hero">
        <div className="sec-ey">{t('download.eyebrow')}</div>
        <h1 className="sec-h">{t('download.heading')}</h1>

        <ChannelSection
          variant="stable"
          heading={t('download.stableHeading')}
          subhead={t('download.stableSub')}
          manifest={stable}
          t={t}
        />

        <div className="dl-nightly-wrap">
          <div className="dl-nightly-banner">
            <Icon name="info" size={15} />
            {t('download.nightlyWarning')}
          </div>
          <ChannelSection
            variant="nightly"
            heading={t('download.nightlyHeading')}
            subhead={t('download.nightlySub')}
            manifest={nightly}
            t={t}
          />
        </div>
      </section>
    </main>
  );
}
