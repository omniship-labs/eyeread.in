import { useEffect, useState } from 'react';
import { Globe, Package, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from './Badge';
import { PERMISSION_LABEL_KEYS } from '../lib/packs';
import './permissions-modal.less';

/**
 * PackInstallModal — review a pack before installing it: what's inside
 * (and any packs it includes), its license and badge, and every permission
 * and internet site combined. An unsigned pack shows a warning, and Install
 * stays disabled until "I understand the risks" is ticked. "Don't install"
 * is the default focus; Esc and the backdrop deny.
 *
 * `review` is packs_inspect's result; `error` a message when the pack can't
 * be installed; `busy` while inspecting or installing.
 */
export function PackInstallModal({ review, error, busy, onInstall, onDeny }) {
  const { t } = useTranslation();
  const [understood, setUnderstood] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onDeny();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDeny]);

  const pack = review?.pack;
  const verified = !!pack?.verified;
  const blocked = !review || !!error || !!review.conflict;
  const canInstall = !busy && !blocked && (verified || understood);

  return (
    <div className="pm-backdrop" onClick={onDeny} role="presentation">
      <div
        className="pm-card pk-install"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pk-install-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pm-head">
          <span className="pm-icon" aria-hidden="true">
            <Package size={18} />
          </span>
          <span className="pm-title" id="pk-install-title">
            {pack ? t('packs.install.title', { name: pack.name }) : t('packs.install.checking')}
          </span>
        </div>

        {pack && (
          <>
            <div className="pk-install-meta">
              <span>
                {t('packs.install.byline', { version: pack.version, author: pack.author.name })}
              </span>
              <Badge tone={verified ? 'success' : 'warning'}>
                {verified ? t('packs.badge.verified') : t('packs.badge.community')}
              </Badge>
            </div>
            {pack.description && <p className="pm-intro">{pack.description}</p>}
            {pack.installed && (
              <p className="pk-install-note">
                {pack.installed.version === pack.version
                  ? t('packs.install.reinstall')
                  : t('packs.install.update', {
                      from: pack.installed.version,
                      to: pack.version,
                    })}
              </p>
            )}

            {review.included.length > 0 && (
              <div className="pk-install-section">
                <div className="pk-install-label">{t('packs.install.includes')}</div>
                <ul className="pk-install-list">
                  {review.included.map((p) => (
                    <li key={p.id}>
                      {p.name} <span className="pk-muted">{p.version}</span>{' '}
                      {!p.verified && (
                        <Badge tone="warning">{t('packs.badge.community')}</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pk-install-section">
              <div className="pk-install-label">{t('packs.install.permissions')}</div>
              {review.permissions.length === 0 ? (
                <p className="pk-muted">{t('packs.install.noPermissions')}</p>
              ) : (
                <ul className="pk-install-list" data-testid="pk-install-permissions">
                  {review.permissions.map((p) => (
                    <li key={p.permission}>
                      <b>{t(`packs.permissions.${PERMISSION_LABEL_KEYS[p.permission]}`)}</b>
                      <span className="pk-muted">
                        {' '}
                        — {t(`packs.permissionHints.${PERMISSION_LABEL_KEYS[p.permission]}`)}
                      </span>
                      {p.network.length > 0 && (
                        <div className="pk-sites">
                          <Globe size={12} aria-hidden="true" />{' '}
                          {t('packs.install.sites', { sites: p.network.join(', ') })}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="pk-install-note">{t('packs.install.permissionsNote')}</p>
            </div>

            <div className="pk-install-label">
              {t('packs.install.license', { license: pack.license })}
            </div>

            {verified ? (
              <div className="pk-verified">
                <ShieldCheck size={16} aria-hidden="true" /> {t('packs.install.verified')}
              </div>
            ) : (
              <div className="pk-warning" role="note">
                <div className="pk-warning-head">
                  <ShieldAlert size={16} aria-hidden="true" />{' '}
                  {t('packs.install.unsignedTitle')}
                </div>
                <p>{t('packs.install.unsignedBody')}</p>
                <label className="pk-check">
                  <input
                    type="checkbox"
                    checked={understood}
                    onChange={(e) => setUnderstood(e.target.checked)}
                  />
                  {t('packs.install.understand')}
                </label>
              </div>
            )}
          </>
        )}

        {(error || review?.conflict) && (
          <div className="pk-error" role="alert">
            <b>{t('packs.install.failed')}</b>
            <span>{error || review.conflict.message}</span>
          </div>
        )}

        <div className="pm-actions">
          <button type="button" className="pm-btn pm-btn-cancel" onClick={onDeny} autoFocus>
            {t('packs.install.deny')}
          </button>
          <button
            type="button"
            className="pm-btn pm-btn-continue"
            onClick={onInstall}
            disabled={!canInstall}
          >
            {t('packs.install.install')}
          </button>
        </div>
      </div>
    </div>
  );
}
