import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, X } from 'lucide-react';
import {
  openExternal,
  listen,
  hideAboutWindow,
  setAboutProtected,
  installUpdate,
} from '../lib/tauri';
import i18n from '../i18n/index.js';
import { fetchSettings } from '../lib/store';
import { getTesters } from '../lib/credits';
import { useUiScale, useReducedMotion, useDyslexicFont } from '../hooks/useA11y';
import sponsors from '../data/sponsors.json';
import omnishipMark from '../assets/logos/omniship-mark-beacon.svg';
import { LOGO_MARK_DARK } from '../lib/branding';
import { isGlimpse } from '../lib/channel';
import './about/about-window.less';

const OC_URL = 'https://opencollective.com/omniship';
const OMNISHIP_URL = 'https://omniship.dev';

const REPO_URL = 'https://github.com/omniship-labs/eyeread.in';
const COMPAT_REPORT_URL =
  'https://github.com/omniship-labs/eyeread.in/issues/new?template=3-compat-report.yml';
const MJ_URL = 'https://m.halinge.in';
const TERMS_URL = 'https://github.com/omniship-labs/eyeread.in/blob/main/TERMS.md';
const PRIVACY_URL = 'https://github.com/omniship-labs/eyeread.in/blob/main/PRIVACY.md';
const DOWNLOAD_URL = 'https://get.eyeread.in/download';

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function getVersion() {
  return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
}

export function AboutWindow() {
  const { t } = useTranslation();
  const [shielded, setShielded] = useState(true);
  const [uiScale, setUiScale] = useState(100);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [dyslexicFont, setDyslexicFont] = useState(false);
  const [update, setUpdate] = useState(null);
  const testers = getTesters();

  // ✨ Easter egg on the app icon. Drag to bend the glass, click to toggle the
  // shield. Effects use the same theme as the overlay (violet glass tint +
  // glass blur) and stay LOCAL to this About window for the session — nothing
  // is persisted or pushed to the other windows.
  //   • drag up / down    → transparency (--aw-alpha)
  //   • drag left / right → blur (--aw-blur)
  //   • click (no drag)   → toggle screen-share shield (violet ⇄ red tint)
  //   • double-click      → reset transparency + blur
  const [alpha, setAlpha_] = useState(0);
  const [blur, setBlur_] = useState(0);
  const [iconNudge, setIconNudge] = useState({ x: 0, y: 0 });
  const [eggShielded, setEggShielded] = useState(null); // null → follow settings
  const dragRef = useRef(null);
  const iconPressedRef = useRef(false);

  useUiScale(uiScale);
  useReducedMotion(reduceMotion);
  useDyslexicFont(dyslexicFont);

  // The session-local shield wins once the user has flipped it via the egg.
  const shieldOn = eggShielded ?? shielded;

  const onIconPointerDown = (e) => {
    e.preventDefault();
    iconPressedRef.current = true;
    dragRef.current = { x: e.clientX, y: e.clientY, alpha, blur, moved: false };

    const onMove = (ev) => {
      if (!iconPressedRef.current) return;
      const start = dragRef.current;
      if (!start) return;
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) start.moved = true;
      // horizontal distance → blur, vertical distance → transparency
      setAlpha_(clamp(Math.abs(dy) / 120, 0, 0.85));
      setBlur_(clamp(Math.abs(dx) / 8, 0, 16));
      setIconNudge({ x: dx / 18, y: dy / 18 });
    };

    const onUp = () => {
      const start = dragRef.current;
      iconPressedRef.current = false;
      dragRef.current = null;
      setIconNudge({ x: 0, y: 0 });
      if (start?.moved) {
        setAlpha_(0);
        setBlur_(0);
      }
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      if (start && !start.moved) {
        setEggShielded((v) => {
          const next = !(v ?? shielded);
          setAboutProtected(next);
          return next;
        });
      }
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  };

  const resetEgg = () => {
    setAlpha_(0);
    setBlur_(0);
    setIconNudge({ x: 0, y: 0 });
  };

  useEffect(() => {
    fetchSettings().then((s) => {
      setShielded(s.hideFromShare);
      setUiScale(s.uiScale ?? 100);
      setReduceMotion(!!s.reduceMotion);
      setDyslexicFont(!!s.dyslexicFont);
    });
    let unlisten;
    listen('settings:sync', (p) => {
      if (p?.settings?.hideFromShare !== undefined) setShielded(p.settings.hideFromShare);
      if (p?.settings?.uiScale !== undefined) setUiScale(p.settings.uiScale);
      if (p?.settings?.reduceMotion !== undefined) setReduceMotion(!!p.settings.reduceMotion);
      if (p?.settings?.dyslexicFont !== undefined) setDyslexicFont(!!p.settings.dyslexicFont);
    }).then((fn) => {
      unlisten = fn;
    });
    listen('locale:changed', (p) => {
      if (p?.lng) i18n.changeLanguage(p.lng);
    });
    listen('update:sync', (p) => {
      if (p?.status === 'available') setUpdate(p);
      else if (p?.status) setUpdate(null);
    });
    return () => unlisten?.();
  }, []);

  return (
    <div
      className={'aw-root' + (shieldOn ? ' shielded' : ' exposed')}
      style={{ '--aw-alpha': alpha, '--aw-blur': `${blur}px` }}
    >
      <div className="aw-titlebar" data-tauri-drag-region>
        <button
          type="button"
          className="ic ic-sm aw-close"
          aria-label="Close"
          onClick={hideAboutWindow}
        >
          <X />
        </button>
      </div>

      <div className="aw-hero">
        <img
          className="aw-icon"
          src={LOGO_MARK_DARK}
          alt="eyeread.in"
          draggable={false}
          style={{
            transform: `translate(${iconNudge.x}px, ${iconNudge.y}px)`,
            transition:
              iconNudge.x === 0 && iconNudge.y === 0
                ? `transform 600ms var(--ease-spring)`
                : 'none',
          }}
          onPointerDown={onIconPointerDown}
          onDoubleClick={resetEgg}
        />
        <div className="aw-name">eyeread.in</div>
        <div className="aw-version">{getVersion()}</div>
        {update && (
          <button type="button" className="aw-update" onClick={() => installUpdate()}>
            <Download size={11} />
            {t('settings.updateAvailable', { version: update.version })}
          </button>
        )}
        <div className="aw-org">© 2026 OmniShip Labs</div>
        <OtherChannelLink />
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

      <div className="aw-divider" />

      <button
        type="button"
        className="aw-omniship"
        title="omniship.dev"
        onClick={() => openExternal(OMNISHIP_URL)}
      >
        <img src={omnishipMark} alt="" width={26} height={26} draggable={false} />
        <span className="aw-omniship-text">
          <span className="aw-omniship-byline">{t('about.orgByline')}</span>
          <span className="aw-omniship-tagline">Open Meets New Ideas</span>
        </span>
      </button>
    </div>
  );
}

function OtherChannelLink() {
  const { t } = useTranslation();
  const promptKey = isGlimpse ? 'about.otherChannelStable' : 'about.otherChannelGlimpse';
  return (
    <div className="aw-other-channel">
      {t(promptKey)}{' '}
      <button type="button" className="aw-link" onClick={() => openExternal(DOWNLOAD_URL)}>
        {t('about.getOtherChannel')}
      </button>
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
