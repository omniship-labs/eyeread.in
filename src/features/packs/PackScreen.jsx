import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Globe, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Segmented } from '../../components/Segmented';
import { Slider } from '../../components/Slider';
import { Switch } from '../../components/Switch';
import { listen } from '../../lib/tauri';
import {
  clearPackNetLog,
  getPackGrants,
  getPackNetLog,
  getPackSettings,
  packBadge,
  packBlocked,
  packErrorMessage,
  packProblem,
  PERMISSION_LABEL_KEYS,
  requestPackInstall,
  setPackEnabled,
  setPackGrant,
  setPackSettings,
  uninstallPack,
} from '../../lib/packs';

const BADGE_TONES = { verified: 'success', community: 'warning', dev: 'accent' };
const LOG_REFRESH_MS = 3000;

export function PackBadge({ pack }) {
  const { t } = useTranslation();
  const badge = packBadge(pack);
  return <Badge tone={BADGE_TONES[badge]}>{t(`packs.badge.${badge}`)}</Badge>;
}

/** Why a pack is disabled (tampered, revoked, crashed), with the reason. */
export function PackProblem({ pack }) {
  const { t } = useTranslation();
  const problem = packProblem(pack);
  if (!problem) return null;
  return (
    <span className="set-error pk-problem" role="alert">
      <ShieldAlert size={13} aria-hidden="true" />{' '}
      {t(`packs.status.${problem.status}`, { reason: problem.reason })}
    </span>
  );
}

/** One declared setting, drawn with the app's own control for its type. */
function SettingControl({ setting, value, onChange }) {
  const label = setting.label;
  switch (setting.type) {
    case 'toggle':
      return <Switch size="sm" checked={!!value} label={label} onChange={onChange} />;
    case 'select':
      return setting.options.length <= 4 ? (
        <Segmented
          options={setting.options.map((o) => ({ value: o.value, label: o.label }))}
          value={value}
          onChange={onChange}
        />
      ) : (
        <select
          className="er-input pk-select"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {setting.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case 'number':
      if (setting.min != null && setting.max != null) {
        return (
          <div className="pk-slider">
            <Slider
              min={setting.min}
              max={setting.max}
              value={value}
              ariaLabel={label}
              onChange={onChange}
            />
            <span className="set-mono">
              {value}
              {setting.unit ? ` ${setting.unit}` : ''}
            </span>
          </div>
        );
      }
      return (
        <Input
          type="number"
          aria-label={label}
          value={value}
          min={setting.min}
          max={setting.max}
          step={setting.step}
          onChange={(e) => e.target.value !== '' && onChange(Number(e.target.value))}
        />
      );
    default:
      return (
        <Input
          multiline={!!setting.multiline}
          aria-label={label}
          value={value}
          maxLength={setting.maxLength ?? 200}
          placeholder={setting.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

function formatTime(ms) {
  return new Date(ms).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Settings ▸ Packs ▸ <pack>. The header, the permission grid and the network
 * log are drawn by the app; only the declared settings come from the pack,
 * and they use the app's own controls (no custom HTML in v1).
 */
export function PackScreen({ pack, onBack }) {
  const { t } = useTranslation();
  const [grants, setGrants] = useState([]);
  const [settings, setSettings] = useState({});
  const [log, setLog] = useState([]);
  const [error, setError] = useState(null);
  const [confirmUninstall, setConfirmUninstall] = useState(false);
  const updateInput = useRef(null);
  const id = pack.id;

  const fail = useCallback((e) => setError(packErrorMessage(e)), []);

  useEffect(() => {
    getPackGrants(id).then(setGrants).catch(fail);
    getPackSettings(id).then(setSettings).catch(fail);
  }, [id, fail]);

  useEffect(() => {
    let alive = true;
    const refresh = () =>
      getPackNetLog(id)
        .then((entries) => alive && setLog(entries))
        .catch(() => {});
    refresh();
    const timer = setInterval(refresh, LOG_REFRESH_MS);
    let unlisten;
    listen('packs:settings-changed', (p) => {
      if (p?.id === id && alive) setSettings(p.values);
    }).then((fn) => (alive ? (unlisten = fn) : fn()));
    return () => {
      alive = false;
      clearInterval(timer);
      unlisten?.();
    };
  }, [id]);

  const grant = (permission, allowed, internet) => {
    setError(null);
    setPackGrant(id, permission, allowed, internet).then(setGrants).catch(fail);
  };
  const changeSetting = (key, value) => {
    setError(null);
    setSettings((s) => ({ ...s, [key]: value }));
    setPackSettings(id, { [key]: value })
      .then(setSettings)
      .catch(fail);
  };
  const toggle = (on) => {
    setError(null);
    setPackEnabled(id, on).catch(fail);
  };
  const uninstall = () => {
    uninstallPack(id).then(onBack).catch(fail);
  };

  const m = pack.manifest;

  return (
    <div className="pk-screen">
      <div className="set-row pk-screen-head">
        <button type="button" className="set-link pk-back" onClick={onBack}>
          <ArrowLeft size={14} aria-hidden="true" /> {t('packs.screen.back')}
        </button>
      </div>

      <div className="set-row">
        <div className="set-info">
          <b className="pk-name">
            {m.name} <PackBadge pack={pack} />
          </b>
          <span>
            {t('packs.screen.meta', {
              version: pack.version,
              author: m.author.name,
              license: m.license,
            })}
          </span>
          {m.description && <span className="pk-desc">{m.description}</span>}
          {!pack.topLevel && pack.usedBy.length > 0 && (
            <span className="pk-desc">
              {t('packs.screen.includedBy', { names: pack.usedBy.join(', ') })}
            </span>
          )}
          <PackProblem pack={pack} />
        </div>
        <Switch
          size="sm"
          checked={!!pack.enabled}
          disabled={packBlocked(pack)}
          label={t('packs.toggle', { name: m.name })}
          onChange={toggle}
        />
      </div>

      <div className="set-row pk-actions">
        <input
          ref={updateInput}
          type="file"
          accept=".zip"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) requestPackInstall(file);
          }}
        />
        <Button size="sm" variant="secondary" onClick={() => updateInput.current?.click()}>
          {packBlocked(pack) ? t('packs.screen.reinstall') : t('packs.screen.update')}
        </Button>
        {pack.topLevel &&
          (confirmUninstall ? (
            <>
              <span className="pk-confirm">
                {t('packs.screen.uninstallConfirm', { name: m.name })}
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setConfirmUninstall(false)}
                autoFocus
              >
                {t('packs.screen.cancel')}
              </Button>
              <Button size="sm" variant="danger" onClick={uninstall}>
                {t('packs.screen.uninstall')}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirmUninstall(true)}>
              {t('packs.screen.uninstall')}
            </Button>
          ))}
      </div>

      {error && (
        <div className="set-row">
          <span className="set-error" role="alert">
            {error}
          </span>
        </div>
      )}

      <div className="set-subgroup-label">{t('packs.screen.permissions')}</div>
      {grants.length === 0 ? (
        <div className="set-row">
          <div className="set-info">
            <span>{t('packs.screen.noPermissions')}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="set-row pk-grid-head" aria-hidden="true">
            <span className="pk-grid-name">{t('packs.screen.permissionsHint')}</span>
            <span className="pk-grid-col">{t('packs.screen.allow')}</span>
            <span className="pk-grid-col">{t('packs.screen.internet')}</span>
          </div>
          {grants.map((g) => {
            const key = PERMISSION_LABEL_KEYS[g.permission];
            const label = t(`packs.permissions.${key}`);
            return (
              <div
                className="set-row pk-grid-row"
                key={g.permission}
                data-permission={g.permission}
              >
                <div className="set-info pk-grid-name">
                  <b>{label}</b>
                  <span>{t(`packs.permissionHints.${key}`)}</span>
                  {g.network.length > 0 && (
                    <span className="pk-sites">
                      <Globe size={12} aria-hidden="true" />{' '}
                      {t('packs.install.sites', { sites: g.network.join(', ') })}
                    </span>
                  )}
                </div>
                <span className="pk-grid-col">
                  <Switch
                    size="sm"
                    checked={g.allowed}
                    label={t('packs.screen.allowLabel', { permission: label })}
                    onChange={(on) => grant(g.permission, on, on && g.internet)}
                  />
                </span>
                <span className="pk-grid-col">
                  {g.network.length > 0 ? (
                    <Switch
                      size="sm"
                      checked={g.internet}
                      disabled={!g.allowed}
                      label={t('packs.screen.internetLabel', { permission: label })}
                      onChange={(on) => grant(g.permission, g.allowed, on)}
                    />
                  ) : (
                    <span className="pk-muted">{t('packs.screen.noInternet')}</span>
                  )}
                </span>
              </div>
            );
          })}
        </>
      )}

      {m.settings.length > 0 && (
        <>
          <div className="set-subgroup-label">{t('packs.screen.settings')}</div>
          {m.settings.map((s) => (
            <div className="set-row pk-setting" key={s.key}>
              <div className="set-info">
                <b>{s.label}</b>
                {s.description && <span>{s.description}</span>}
              </div>
              <div className="pk-setting-control">
                <SettingControl
                  setting={s}
                  value={settings[s.key]}
                  onChange={(v) => changeSetting(s.key, v)}
                />
              </div>
            </div>
          ))}
        </>
      )}

      <div className="set-subgroup-label">{t('packs.screen.network')}</div>
      <div className="set-row">
        <div className="set-info">
          <span>{t('packs.screen.networkHint')}</span>
        </div>
        {log.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              clearPackNetLog(id)
                .then(() => setLog([]))
                .catch(fail)
            }
          >
            {t('packs.screen.networkClear')}
          </Button>
        )}
      </div>
      {log.length === 0 ? (
        <div className="set-row">
          <div className="set-info">
            <span>{t('packs.screen.networkEmpty')}</span>
          </div>
        </div>
      ) : (
        <div className="set-row pk-log-wrap">
          <table className="pk-log" data-testid="pk-net-log">
            <thead>
              <tr>
                <th>{t('packs.screen.logTime')}</th>
                <th>{t('packs.screen.logPermission')}</th>
                <th>{t('packs.screen.logRequest')}</th>
                <th>{t('packs.screen.logResult')}</th>
                <th>{t('packs.screen.logBytes')}</th>
              </tr>
            </thead>
            <tbody>
              {[...log].reverse().map((e, i) => (
                <tr
                  key={`${e.time}-${i}`}
                  className={e.outcome === 'ok' ? '' : 'pk-log-denied'}
                >
                  <td>{formatTime(e.time)}</td>
                  <td>{e.permission}</td>
                  <td>
                    {e.method} {e.host}
                  </td>
                  <td>
                    {e.outcome === 'ok' ? e.status : `${e.status ?? ''} ${e.outcome}`.trim()}
                  </td>
                  <td>
                    ↑{e.bytesOut} ↓{e.bytesIn}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
