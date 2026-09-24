import { useEffect } from 'react';
import { Plug } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PERMISSION_LABEL_KEYS } from '../lib/packs';
import './permissions-modal.less';

/**
 * ConnectedAppPairModal — an app on this computer asked to connect over the
 * Connected apps API (Settings → Packs → Connected apps). Shows its self-reported name and exactly what it
 * asked to do; nothing is granted until the user clicks Allow. Reuses the
 * PermissionsModal card shell. Deny is the default focus and Esc/backdrop
 * deny, so a stray keypress can never approve.
 */
export function ConnectedAppPairModal({ name, scopes, onAllow, onDeny }) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onDeny();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDeny]);

  return (
    <div className="pm-backdrop" onClick={onDeny} role="presentation">
      <div
        className="pm-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cap-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pm-head">
          <span className="pm-icon" aria-hidden="true">
            <Plug size={18} />
          </span>
          <span className="pm-title" id="cap-title">
            {t('packs.apps.pairTitle', { name })}
          </span>
        </div>

        <p className="pm-intro">{t('packs.apps.pairIntro')}</p>

        <div className="pm-rows">
          {scopes.map((scope) => (
            <div className="pm-row" key={scope}>
              <div className="pm-row-info">
                <b>{t(`packs.permissions.${PERMISSION_LABEL_KEYS[scope]}`)}</b>
                <span>{t(`packs.permissionHints.${PERMISSION_LABEL_KEYS[scope]}`)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="pm-actions">
          <button type="button" className="pm-btn pm-btn-cancel" onClick={onDeny} autoFocus>
            {t('packs.apps.deny')}
          </button>
          <button type="button" className="pm-btn pm-btn-continue" onClick={onAllow}>
            {t('packs.apps.allow')}
          </button>
        </div>
      </div>
    </div>
  );
}
