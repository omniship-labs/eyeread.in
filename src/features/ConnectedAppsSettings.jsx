import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/Button';
import { Switch } from '../components/Switch';
import { listen, openExternal } from '../lib/tauri';
import {
  packsAvailable,
  getConnectedAppsStatus,
  setConnectedAppsEnabled,
  revokeConnectedApp,
  PERMISSION_LABEL_KEYS,
  PACKS_DOCS_URL,
} from '../lib/packs';

/**
 * Settings ▸ Packs ▸ Connected apps — the on/off switch for the local HTTP
 * API and the list of paired apps, each revocable. State lives in Rust
 * (packs.json), not the settings store, so it's fetched here and refreshed
 * whenever a pairing or revoke lands (`packs:apps-changed`).
 */
export function ConnectedAppsSettings() {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);

  const refresh = useCallback(() => {
    getConnectedAppsStatus()
      .then(setStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!packsAvailable) return undefined;
    refresh();
    let un;
    let cancelled = false;
    listen('packs:apps-changed', refresh).then((fn) => {
      if (cancelled) fn();
      else un = fn;
    });
    return () => {
      cancelled = true;
      un?.();
    };
  }, [refresh]);

  if (!packsAvailable || !status) return null;

  const toggle = (on) => {
    setConnectedAppsEnabled(on)
      .then(setStatus)
      .catch(() => {});
  };
  const revoke = (id) => {
    revokeConnectedApp(id)
      .then(setStatus)
      .catch(() => {});
  };

  return (
    <>
      <div className="set-subgroup-label">{t('packs.apps.title')}</div>
      <div className="set-row">
        <div className="set-info">
          <b>{t('packs.apps.enable')}</b>
          <span>{t('packs.apps.enableHint', { port: status.port })}</span>
          {status.enabled && status.error && (
            <span className="set-error" role="alert">
              {status.error === 'port_in_use'
                ? t('packs.apps.errorPortInUse', { port: status.port })
                : t('packs.apps.errorStart')}
            </span>
          )}
        </div>
        <Switch
          size="sm"
          checked={!!status.enabled}
          label={t('packs.apps.enable')}
          onChange={toggle}
        />
      </div>

      {status.apps.length === 0 ? (
        <div className="set-row">
          <div className="set-info">
            <span>{t('packs.apps.none')}</span>
          </div>
        </div>
      ) : (
        status.apps.map((app) => (
          <div className="set-row" key={app.id}>
            <div className="set-info">
              <b>{app.name}</b>
              <span>
                {app.scopes
                  .map((s) =>
                    t(`packs.permissions.${PERMISSION_LABEL_KEYS[s]}`, { defaultValue: s })
                  )
                  .join(' · ')}
              </span>
            </div>
            <Button size="sm" variant="secondary" onClick={() => revoke(app.id)}>
              {t('packs.apps.revoke')}
            </Button>
          </div>
        ))
      )}

      <div className="set-row">
        <div className="set-info">
          <b>{t('packs.apps.docs')}</b>
          <span>{t('packs.apps.docsHint')}</span>
        </div>
        <button type="button" className="set-link" onClick={() => openExternal(PACKS_DOCS_URL)}>
          {t('packs.apps.docsCta')}
        </button>
      </div>
    </>
  );
}
