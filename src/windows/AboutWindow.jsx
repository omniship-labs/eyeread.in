import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { openExternal, listen } from '../lib/tauri';
import i18n from '../i18n/index.js';
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

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

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
  const [uiScale, setUiScale] = useState(100);
  const [reduceMotion, setReduceMotion] = useState(false);
  const testers = getTesters();

  // ✨ Easter egg on the app icon. Drag to bend the glass, click to toggle the
  // shield. Effects use the same theme as the overlay (violet glass tint +
  // glass blur) and stay LOCAL to this About window for the session — nothing
  // is persisted or pushed to the other windows.
  //   • drag up / down    → transparency (--aw-alpha)
  //   • drag left / right → blur (--aw-blur)
  //   • click (no drag)   → toggle screen-share shield (violet ⇄ red tint)
  //   • double-click      → reset transparency + blur
  const [alpha, setAlpha] = useState(0); // 0 = solid window, 1 = fully sheer
  const [blur, setBlur] = useState(0); // px of glass blur
  const [eggShielded, setEggShielded] = useState(null); // null → follow settings
  const dragRef = useRef(null);

  useUiScale(uiScale);
  useReducedMotion(reduceMotion);

  // The session-local shield wins once the user has flipped it via the egg.
  const shieldOn = eggShielded ?? shielded;

  const onIconPointerDown = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, alpha, blur, moved: false };
  };

  const onIconPointerMove = (e) => {
    const start = dragRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) start.moved = true;
    // drag down sheers the glass, drag up makes it solid; right blurs, left sharpens.
    setAlpha(clamp(start.alpha + dy / 320, 0, 0.85));
    setBlur(clamp(start.blur + dx / 36, 0, 16));
  };

  const onIconPointerUp = (e) => {
    const start = dragRef.current;
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    // A click (no meaningful drag) toggles the shield for this window only.
    if (start && !start.moved) setEggShielded((v) => !(v ?? shielded));
  };

  const resetEgg = () => {
    setAlpha(0);
    setBlur(0);
  };

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
    listen('locale:changed', (p) => {
      if (p?.lng) i18n.changeLanguage(p.lng);
    });
    return () => unlisten?.();
  }, []);

  return (
    <div
      className={'aw-root' + (shieldOn ? ' shielded' : ' exposed')}
      style={{ '--aw-alpha': alpha, '--aw-blur': `${blur}px` }}
    >
      {/* drag region — clear strip at top, avoids traffic lights */}
      <div className="aw-titlebar" data-tauri-drag-region />

      <div className="aw-hero">
        <img
          className="aw-icon"
          src="/app-icon.png"
          alt="eyeread.in"
          draggable={false}
          onPointerDown={onIconPointerDown}
          onPointerMove={onIconPointerMove}
          onPointerUp={onIconPointerUp}
          onDoubleClick={resetEgg}
        />
        <div className="aw-name">eyeread.in</div>
        <div className="aw-version">{getVersion()}</div>
        <div className="aw-org">© 2026 OmniShip Labs</div>
      </div>

      <div className="aw-credit">
        {t('about.createdBy')}{' '}
        <button type="button" className="aw-link" onClick={() => openExternal(MJ_URL)}>
          MJ
        </button>
      </div>

      <div className="aw-divider" />

      <div className="aw-section">
        <div className="aw-section-label">{t('about.sourceLicense')}</div>
        <div className="aw-row">
          <span>{t('about.openSource')}</span>
          <button type="button" className="aw-link" onClick={() => openExternal(REPO_URL)}>
            {t('about.github')}
          </button>
        </div>
      </div>

      <div className="aw-section">
        <div className="aw-section-label">{t('about.legal')}</div>
        <div className="aw-row">
          <button type="button" className="aw-link" onClick={() => openExternal(TERMS_URL)}>
            {t('about.terms')}
          </button>
          <button type="button" className="aw-link" onClick={() => openExternal(PRIVACY_URL)}>
            {t('about.privacy')}
          </button>
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
            {t('about.helpVerify')}{' '}
            <button
              type="button"
              className="aw-link"
              onClick={() => openExternal(COMPAT_REPORT_URL)}
            >
              {t('about.testYourSetup')}
            </button>
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
            <button
              type="button"
              className="aw-link aw-supporters-all"
              onClick={() => openExternal(OC_URL)}
            >
              {t('about.viewAllOC')}
            </button>
          </>
        ) : (
          <div className="aw-supporters-empty">
            {t('about.beFirst')}{' '}
            <button type="button" className="aw-link" onClick={() => openExternal(OC_URL)}>
              {t('about.supportEyeread')}
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
