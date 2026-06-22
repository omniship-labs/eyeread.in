import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { openExternal, listen } from '../lib/tauri';
import { fetchSettings } from '../lib/store';
import { getTesters } from '../lib/credits';
import sponsors from '../data/sponsors.json';
import './about/about-window.css';

const OC_URL = 'https://opencollective.com/eyereadin';

const REPO_URL = 'https://github.com/omniship-labs/eyeread.in';
const COMPAT_REPORT_URL =
  'https://github.com/omniship-labs/eyeread.in/issues/new?template=3-compat-report.yml';
const MJ_URL = 'https://m.halinge.in';
const TERMS_URL = 'https://github.com/omniship-labs/eyeread.in/blob/main/TERMS.md';
const PRIVACY_URL = 'https://github.com/omniship-labs/eyeread.in/blob/main/PRIVACY.md';

function getVersion() {
  const ver = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
  try {
    if (typeof __RELEASE_CHANNEL__ !== 'undefined' && __RELEASE_CHANNEL__ !== 'stable') {
      return `${ver} · ${__RELEASE_CHANNEL__}`;
    }
  } catch {
    /* */
  }
  return ver;
}

export function AboutWindow() {
  const { t } = useTranslation();
  const [shielded, setShielded] = useState(true);
  const testers = getTesters();

  useEffect(() => {
    fetchSettings().then((s) => setShielded(s.hideFromShare));
    let unlisten;
    listen('settings:sync', (p) => {
      if (p?.settings?.hideFromShare !== undefined) setShielded(p.settings.hideFromShare);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, []);

  return (
    <div className={'aw-root' + (shielded ? ' shielded' : ' exposed')}>
      {/* drag region — clear strip at top, avoids traffic lights */}
      <div className="aw-titlebar" data-tauri-drag-region />

      <div className="aw-hero">
        <img className="aw-icon" src="/app-icon.png" alt="eyeread.in" draggable={false} />
        <div className="aw-name">eyeread.in</div>
        <div className="aw-version">{getVersion()}</div>
        <div className="aw-org">© 2026 OmniShip Labs</div>
      </div>

      <div className="aw-credit">
        {t('about.createdBy')}{' '}
        <span className="aw-link" onClick={() => openExternal(MJ_URL)}>
          MJ
        </span>
      </div>

      <div className="aw-divider" />

      <div className="aw-section">
        <div className="aw-section-label">{t('about.sourceLicense')}</div>
        <div className="aw-row">
          <span>{t('about.openSource')}</span>
          <span className="aw-link" onClick={() => openExternal(REPO_URL)}>
            {t('about.github')}
          </span>
        </div>
      </div>

      <div className="aw-section">
        <div className="aw-section-label">{t('about.legal')}</div>
        <div className="aw-row">
          <span className="aw-link" onClick={() => openExternal(TERMS_URL)}>
            {t('about.terms')}
          </span>
          <span className="aw-link" onClick={() => openExternal(PRIVACY_URL)}>
            {t('about.privacy')}
          </span>
        </div>
      </div>

      <div className="aw-section">
        <div className="aw-section-label">{t('about.testedBy')}</div>
        {testers.length > 0 ? (
          <div className="aw-testers">
            {testers.map((t, i) => (
              <span key={t.profile || t.name}>
                {i > 0 && ', '}
                {t.profile ? (
                  <span className="aw-link" onClick={() => openExternal(t.profile)}>
                    @{t.name}
                  </span>
                ) : (
                  <span className="aw-tester">@{t.name}</span>
                )}
              </span>
            ))}
          </div>
        ) : (
          <div className="aw-supporters-empty">
            {t('about.helpVerify')}{' '}
            <span className="aw-link" onClick={() => openExternal(COMPAT_REPORT_URL)}>
              {t('about.testYourSetup')}
            </span>
          </div>
        )}
      </div>

      <div className="aw-divider" />

      <div className="aw-section aw-section-supporters">
        <div className="aw-section-label">{t('about.supporters')}</div>
        {sponsors.length > 0 ? (
          <>
            <div className="aw-supporters-scroll">
              <SupporterGroup
                title={t('about.sponsors')}
                tier="sponsor"
                people={sponsors.filter((s) => s.tier === 'sponsor')}
                onOpen={openExternal}
              />
              <SupporterGroup
                title={t('about.backers')}
                tier="backer"
                people={sponsors.filter((s) => s.tier !== 'sponsor')}
                onOpen={openExternal}
              />
            </div>
            <span className="aw-link aw-supporters-all" onClick={() => openExternal(OC_URL)}>
              {t('about.viewAllOC')}
            </span>
          </>
        ) : (
          <div className="aw-supporters-empty">
            {t('about.beFirst')}{' '}
            <span className="aw-link" onClick={() => openExternal(OC_URL)}>
              {t('about.supportEyeread')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function SupporterGroup({ title, tier, people, onOpen }) {
  if (people.length === 0) return null;
  return (
    <div className={`aw-tier aw-tier-${tier}`}>
      <div className="aw-tier-label">{title}</div>
      <div className="aw-supporters-list">
        {people.map((s) => (
          <span
            key={s.profile || s.name}
            className="aw-supporter"
            onClick={s.profile ? () => onOpen(s.profile) : undefined}
            style={s.profile ? { cursor: 'pointer' } : undefined}
          >
            {s.image && (
              <img className="aw-supporter-avatar" src={s.image} alt="" draggable={false} />
            )}
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
