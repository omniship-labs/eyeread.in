import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/Button';
import { Switch } from '../components/Switch';
import { listen, openExternal } from '../lib/tauri';
import {
  extensionsAvailable,
  getExtensionsStatus,
  setExtensionsEnabled,
  revokeExtension,
  SCOPE_LABEL_KEYS,
  EXTENSION_DOCS_URL,
} from '../lib/extensions';

/**
 * Settings ▸ Extensions — the on/off switch for the local extension API and
 * the list of paired extensions, each revocable. State lives in Rust
 * (extensions.json), not the settings store, so it's fetched here and
 * refreshed whenever a pairing or revoke lands (`extensions:changed`).
 */
export function ExtensionsSettings() {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);

  const refresh = useCallback(() => {
    getExtensionsStatus()
      .then(setStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!extensionsAvailable) return undefined;
    refresh();
    let un;
    let cancelled = false;
    listen('extensions:changed', refresh).then((fn) => {
      if (cancelled) fn();
      else un = fn;
    });
    return () => {
      cancelled = true;
      un?.();
    };
  }, [refresh]);

  if (!extensionsAvailable || !status) return null;

  const toggle = (on) => {
    setExtensionsEnabled(on)
      .then(setStatus)
      .catch(() => {});
  };
  const revoke = (id) => {
    revokeExtension(id)
      .then(setStatus)
      .catch(() => {});
  };

  return (
    <div className="set-group">
      <div className="set-group-label">{t('extensions.title')}</div>
      <div className="set-row">
        <div className="set-info">
          <b>{t('extensions.enable')}</b>
          <span>{t('extensions.enableHint', { port: status.port })}</span>
          {status.enabled && status.error && (
            <span className="set-error" role="alert">
              {status.error === 'port_in_use'
                ? t('extensions.errorPortInUse', { port: status.port })
                : t('extensions.errorStart')}
            </span>
          )}
        </div>
        <Switch
          size="sm"
          checked={!!status.enabled}
          label={t('extensions.enable')}
          onChange={toggle}
        />
      </div>

      {status.extensions.length === 0 ? (
        <div className="set-row">
          <div className="set-info">
            <span>{t('extensions.none')}</span>
          </div>
        </div>
      ) : (
        status.extensions.map((ext) => (
          <div className="set-row" key={ext.id}>
            <div className="set-info">
              <b>{ext.name}</b>
              <span>
                {ext.scopes
                  .map((s) =>
                    t(`extensions.scopes.${SCOPE_LABEL_KEYS[s]}`, { defaultValue: s })
                  )
                  .join(' · ')}
              </span>
            </div>
            <Button size="sm" variant="secondary" onClick={() => revoke(ext.id)}>
              {t('extensions.revoke')}
            </Button>
          </div>
        ))
      )}

      <div className="set-row">
        <div className="set-info">
          <b>{t('extensions.docs')}</b>
          <span>{t('extensions.docsHint')}</span>
        </div>
        <button
          type="button"
          className="set-link"
          onClick={() => openExternal(EXTENSION_DOCS_URL)}
        >
          {t('extensions.docsCta')}
        </button>
      </div>
    </div>
  );
}
