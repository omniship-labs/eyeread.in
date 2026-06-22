import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './linux-consent.css';

/**
 * LinuxShareConsent — risk-acknowledgement modal shown before enabling
 * "Hide from screen-share" on Linux.
 *
 * Unlike macOS (NSWindowSharingType) and Windows (WDA_EXCLUDEFROMCAPTURE),
 * Linux has no portable compositor-level capture exclusion. Whether the
 * overlay is actually hidden depends entirely on the user's compositor, so we
 * make the user explicitly accept that it may NOT work before turning it on.
 *
 * Props:
 *   onAccept — () => void  user accepts the risk; caller enables protection
 *   onCancel — () => void  user backs out; protection stays off
 */
export function LinuxShareConsent({ onAccept, onCancel }) {
  const { t } = useTranslation();
  // Esc cancels, like every other dismissible surface in the app.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="lsc-backdrop" onClick={onCancel} role="presentation">
      <div
        className="lsc-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="lsc-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lsc-head">
          <span className="lsc-icon" aria-hidden="true">
            <AlertTriangle size={18} />
          </span>
          <span className="lsc-title" id="lsc-title">
            {t('consent.title')}
          </span>
        </div>

        <div className="lsc-body">
          <p>
            {t('consent.introA')} <b>{t('consent.introB')}</b>
          </p>
          <ul className="lsc-list">
            <li>
              {t('consent.li0a')} <b>{t('consent.li0b')}</b>
            </li>
            <li>{t('consent.li1')}</li>
            <li>
              <b>{t('consent.li2')}</b>
            </li>
          </ul>
          <p>{t('consent.question')}</p>
        </div>

        <div className="lsc-actions">
          <button type="button" className="lsc-btn lsc-btn-cancel" onClick={onCancel}>
            {t('consent.cancel')}
          </button>
          <button type="button" className="lsc-btn lsc-btn-accept" onClick={onAccept} autoFocus>
            {t('consent.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
