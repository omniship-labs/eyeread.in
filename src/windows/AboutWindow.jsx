import { useEffect, useState } from 'react';
import { openExternal, listen } from '../lib/tauri';
import { fetchSettings } from '../lib/store';
import { getTesters } from '../lib/credits';
import { useUiScale, useReducedMotion } from '../hooks/useA11y';
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
  const [shielded, setShielded] = useState(true);
  const [uiScale, setUiScale] = useState(100);
  const [reduceMotion, setReduceMotion] = useState(false);
  const testers = getTesters();

  useUiScale(uiScale);
  useReducedMotion(reduceMotion);

  useEffect(() => {
    fetchSettings().then((s) => {
      setShielded(s.hideFromShare);
      setUiScale(s.uiScale ?? 100);
      setReduceMotion(!!s.reduceMotion);
    });
    let unlisten;
    listen('settings:sync', (p) => {
      if (p?.settings?.hideFromShare !== undefined) setShielded(p.settings.hideFromShare);
      if (p?.settings?.uiScale !== undefined) setUiScale(p.settings.uiScale);
      if (p?.settings?.reduceMotion !== undefined) setReduceMotion(!!p.settings.reduceMotion);
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
        Created with ❤️ by{' '}
        <button type="button" className="aw-link" onClick={() => openExternal(MJ_URL)}>
          MJ
        </button>
      </div>

      <div className="aw-divider" />

      <div className="aw-section">
        <div className="aw-section-label">Source &amp; License</div>
        <div className="aw-row">
          <span>Open source · AGPL-3.0</span>
          <button type="button" className="aw-link" onClick={() => openExternal(REPO_URL)}>
            GitHub ↗
          </button>
        </div>
      </div>

      <div className="aw-section">
        <div className="aw-section-label">Legal</div>
        <div className="aw-row">
          <button type="button" className="aw-link" onClick={() => openExternal(TERMS_URL)}>
            Terms of use ↗
          </button>
          <button type="button" className="aw-link" onClick={() => openExternal(PRIVACY_URL)}>
            Privacy policy ↗
          </button>
        </div>
      </div>

      <div className="aw-section">
        <div className="aw-section-label">Tested by</div>
        {testers.length > 0 ? (
          <div className="aw-testers">
            {testers.map((t, i) => (
              <span key={t.profile || t.name}>
                {i > 0 && ', '}
                {t.profile ? (
                  <button
                    type="button"
                    className="aw-link"
                    onClick={() => openExternal(t.profile)}
                  >
                    @{t.name}
                  </button>
                ) : (
                  <span className="aw-tester">@{t.name}</span>
                )}
              </span>
            ))}
          </div>
        ) : (
          <div className="aw-supporters-empty">
            Help verify screen-share invisibility —{' '}
            <button
              type="button"
              className="aw-link"
              onClick={() => openExternal(COMPAT_REPORT_URL)}
            >
              test your setup ↗
            </button>
          </div>
        )}
      </div>

      <div className="aw-divider" />

      <div className="aw-section aw-section-supporters">
        <div className="aw-section-label">Supporters</div>
        {sponsors.length > 0 ? (
          <>
            <div className="aw-supporters-scroll">
              <SupporterGroup
                title="Sponsors"
                tier="sponsor"
                people={sponsors.filter((s) => s.tier === 'sponsor')}
                onOpen={openExternal}
              />
              <SupporterGroup
                title="Backers"
                tier="backer"
                people={sponsors.filter((s) => s.tier !== 'sponsor')}
                onOpen={openExternal}
              />
            </div>
            <button
              type="button"
              className="aw-link aw-supporters-all"
              onClick={() => openExternal(OC_URL)}
            >
              View all on Open Collective ↗
            </button>
          </>
        ) : (
          <div className="aw-supporters-empty">
            Be the first to{' '}
            <button type="button" className="aw-link" onClick={() => openExternal(OC_URL)}>
              support eyeread.in ↗
            </button>
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
        {people.map((s) =>
          s.profile ? (
            <button
              key={s.profile || s.name}
              type="button"
              className="aw-supporter"
              aria-label={`${s.name} — open profile`}
              onClick={() => onOpen(s.profile)}
            >
              {s.image && (
                <img className="aw-supporter-avatar" src={s.image} alt="" draggable={false} />
              )}
              {s.name}
            </button>
          ) : (
            <span key={s.profile || s.name} className="aw-supporter">
              {s.image && (
                <img className="aw-supporter-avatar" src={s.image} alt="" draggable={false} />
              )}
              {s.name}
            </span>
          )
        )}
      </div>
    </div>
  );
}
