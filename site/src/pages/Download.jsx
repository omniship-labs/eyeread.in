import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icon.jsx';
import { useOSPlatform } from '../hooks/useOSPlatform.js';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';
import { findAssetUrl, displayVersion } from '../lib/releaseLinks.js';

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

function ChannelSection({ variant, heading, subhead, release, t }) {
  const os = useOSPlatform();

  if (release.loading) {
    return (
      <div className={`dl-channel dl-channel-${variant}`}>
        <h2 className="dl-channel-h">{heading}</h2>
        <p className="dl-channel-sub">{subhead}</p>
        <p className="dl-status">{t('download.loading')}</p>
      </div>
    );
  }

  if (release.error || !release.data) {
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

  const rel = release.data;
  const cards = {
    macos: [
      {
        id: 'macos',
        icon: 'apple',
        label: t('download.macos'),
        sublabel: t('download.macosSub'),
        href: findAssetUrl(rel, 'macos'),
        recommended: os === 'macos',
      },
    ],
    windows: [
      {
        id: 'windows-x64',
        icon: 'windows',
        label: t('download.windowsX64'),
        href: findAssetUrl(rel, 'windows-x64'),
        recommended: os === 'windows',
      },
      {
        id: 'windows-arm64',
        icon: 'windows',
        label: t('download.windowsArm64'),
        href: findAssetUrl(rel, 'windows-arm64'),
        recommended: false,
      },
    ],
    linux: [
      {
        id: 'linux',
        icon: 'linux',
        label: t('download.linux'),
        sublabel: t('download.linuxSub'),
        href: findAssetUrl(rel, 'linux'),
        recommended: os === 'linux',
      },
    ],
  };

  return (
    <div className={`dl-channel dl-channel-${variant}`}>
      <h2 className="dl-channel-h">{heading}</h2>
      <p className="dl-channel-sub">{subhead}</p>
      <p className="dl-version">{t('download.version', { version: displayVersion(rel) })}</p>
      <div className="dl-grid">
        {PLATFORM_ORDER.flatMap((platform) =>
          cards[platform].map((card) => <PlatformCard key={card.id} {...card} t={t} />)
        )}
      </div>
    </div>
  );
}

export default function Download({ config, releases }) {
  const { t } = useTranslation();
  useDocumentMeta(config.download.meta);
  const { stable, nightly } = releases;

  return (
    <main className="dl-page">
      <section className="section dl-hero">
        <div className="sec-ey">{t('download.eyebrow')}</div>
        <h1 className="sec-h">{t('download.heading')}</h1>

        <ChannelSection
          variant="stable"
          heading={t('download.stableHeading')}
          subhead={t('download.stableSub')}
          release={stable}
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
            release={nightly}
            t={t}
          />
        </div>
      </section>
    </main>
  );
}
