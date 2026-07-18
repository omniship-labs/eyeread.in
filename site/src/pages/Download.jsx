import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icon.jsx';
import { useOSPlatform } from '../hooks/useOSPlatform.js';
import { useDocumentMeta } from '../hooks/useDocumentMeta.js';
import { useReleaseHistory } from '../hooks/useLatestReleases.js';
import { findAssetUrl, displayVersion, relativeReleaseTime } from '../lib/releaseLinks.js';
import { renderReleaseNotesHtml } from '../lib/releaseNotes.js';

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

function ChannelSection({ variant, heading, subhead, release, t, i18n }) {
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
      <p className="dl-version">
        {t('download.version', { version: displayVersion(rel) })}
        <span className="dl-version-age">
          {' '}
          ·{' '}
          {t('download.releasedAgo', {
            time: relativeReleaseTime(rel.published_at, i18n.resolvedLanguage || i18n.language),
          })}
        </span>
      </p>
      <div className="dl-grid">
        {PLATFORM_ORDER.flatMap((platform) =>
          cards[platform].map((card) => <PlatformCard key={card.id} {...card} t={t} />)
        )}
      </div>
    </div>
  );
}

function ReleaseHistory({ t, i18n }) {
  const history = useReleaseHistory();

  // Deep-link support: /download#v1.2.0 opens and scrolls to that release's
  // entry. The list only exists once the fetch resolves, so this can't rely
  // on browsers' native "open a <details> targeted by fragment navigation"
  // behavior — that only sees DOM present at initial navigation, and this
  // list renders later, client-side, off the async fetch.
  useEffect(() => {
    if (!history.data?.length) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const target = document.getElementById(hash);
    if (target instanceof HTMLDetailsElement) {
      target.open = true;
      target.scrollIntoView({ block: 'start' });
    }
  }, [history.data]);

  if (history.loading) {
    return (
      <section className="section dl-history" id="history">
        <h2 className="dl-channel-h">{t('download.historyHeading')}</h2>
        <p className="dl-status">{t('download.loading')}</p>
      </section>
    );
  }

  if (history.error || !history.data?.length) {
    return (
      <section className="section dl-history" id="history">
        <h2 className="dl-channel-h">{t('download.historyHeading')}</h2>
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
      </section>
    );
  }

  return (
    <section className="section dl-history" id="history">
      <h2 className="dl-channel-h">{t('download.historyHeading')}</h2>
      <p className="dl-channel-sub">{t('download.historySub')}</p>
      <div className="dl-history-list">
        {history.data.map((rel) => (
          <details key={rel.id} id={`v${displayVersion(rel)}`} className="dl-history-item">
            <summary>
              <span className="dl-history-version">{displayVersion(rel)}</span>
              <span className="dl-history-date">
                {new Date(rel.published_at).toLocaleDateString(
                  i18n.resolvedLanguage || i18n.language,
                  {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  }
                )}
              </span>
            </summary>
            <div
              className="dl-history-notes"
              dangerouslySetInnerHTML={{ __html: renderReleaseNotesHtml(rel.body) }}
            />
            <a
              className="dl-history-link"
              href={rel.html_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('download.historyViewOnGithub')}
            </a>
          </details>
        ))}
      </div>
    </section>
  );
}

export default function Download({ config, releases }) {
  const { t, i18n } = useTranslation();
  useDocumentMeta(config.download.meta);
  const { stable, glimpse } = releases;

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
          i18n={i18n}
        />

        <div className="dl-glimpse-wrap">
          <div className="dl-glimpse-banner">
            <Icon name="info" size={15} />
            {t('download.glimpseWarning')}
          </div>
          <ChannelSection
            variant="glimpse"
            heading={t('download.glimpseHeading')}
            subhead={t('download.glimpseSub')}
            release={glimpse}
            t={t}
            i18n={i18n}
          />
        </div>
      </section>

      <ReleaseHistory t={t} i18n={i18n} />
    </main>
  );
}
