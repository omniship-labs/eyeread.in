import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/Button';
import { Switch } from '../components/Switch';
import { listen } from '../lib/tauri';
import {
  getPackGrants,
  listPacks,
  packBlocked,
  packErrorMessage,
  packsAvailable,
  requestPackInstall,
  setPackEnabled,
} from '../lib/packs';
import { ConnectedAppsSettings } from './ConnectedAppsSettings';
import { PackBadge, PackProblem, PackScreen } from './packs/PackScreen';

/** Whether any of a pack's permissions has internet switched on. */
async function usesInternet(id) {
  const grants = await getPackGrants(id).catch(() => []);
  return grants.some((g) => g.allowed && g.internet);
}

/**
 * Settings ▸ Packs: installed packs (badge, 🌐 when internet is on, on/off,
 * problems), "Install pack…" (or drop a .zip on the window), each pack's own
 * screen, and — in the advanced view — Connected apps. Native only.
 */
export function PacksSettings({ advanced }) {
  const { t } = useTranslation();
  const [packs, setPacks] = useState(null);
  const [online, setOnline] = useState({});
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState(null);
  const fileInput = useRef(null);

  const refresh = useCallback(() => {
    listPacks()
      .then(async (list) => {
        setPacks(list);
        const entries = await Promise.all(
          list.map(async (p) => [p.id, await usesInternet(p.id)])
        );
        setOnline(Object.fromEntries(entries));
      })
      .catch((e) => setError(packErrorMessage(e)));
  }, []);

  useEffect(() => {
    if (!packsAvailable) return undefined;
    refresh();
    const unlisteners = [];
    let cancelled = false;
    for (const event of ['packs:changed', 'packs:grants-changed']) {
      listen(event, refresh).then((fn) => (cancelled ? fn() : unlisteners.push(fn)));
    }
    return () => {
      cancelled = true;
      unlisteners.forEach((fn) => fn());
    };
  }, [refresh]);

  if (!packsAvailable || !packs) return null;

  // Only packs the user installed are listed; included packs are reached
  // through their bundle's screen.
  const topLevel = packs.filter((p) => p.topLevel);
  const open = packs.find((p) => p.id === openId);

  return (
    <div className="set-group">
      <div className="set-group-label">{t('packs.title')}</div>

      {open ? (
        <PackScreen pack={open} onBack={() => setOpenId(null)} />
      ) : (
        <>
          <div className="set-row">
            <div className="set-info">
              <b>{t('packs.installTitle')}</b>
              <span>{t('packs.dropHint')}</span>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept=".zip"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) requestPackInstall(file);
              }}
            />
            <Button size="sm" variant="secondary" onClick={() => fileInput.current?.click()}>
              {t('packs.installButton')}
            </Button>
          </div>

          {error && (
            <div className="set-row">
              <span className="set-error" role="alert">
                {error}
              </span>
            </div>
          )}

          {topLevel.length === 0 ? (
            <div className="set-row">
              <div className="set-info">
                <span>{t('packs.none')}</span>
              </div>
            </div>
          ) : (
            <ul className="pk-list" aria-label={t('packs.title')}>
              {topLevel.map((p) => (
                <li className="set-row pk-row" key={p.id} data-pack={p.id}>
                  <button type="button" className="pk-row-open" onClick={() => setOpenId(p.id)}>
                    <span className="set-info">
                      <b className="pk-name">
                        {p.manifest.name} <PackBadge pack={p} />
                        {online[p.id] && (
                          <Globe
                            size={13}
                            className="pk-globe"
                            role="img"
                            aria-label={t('packs.internetOn')}
                          />
                        )}
                      </b>
                      <span>
                        {t('packs.rowMeta', {
                          version: p.version,
                          author: p.manifest.author.name,
                        })}
                      </span>
                      <PackProblem pack={p} />
                    </span>
                    <ChevronRight size={16} aria-hidden="true" className="pk-chevron" />
                  </button>
                  <Switch
                    size="sm"
                    checked={!!p.enabled}
                    disabled={packBlocked(p)}
                    label={t('packs.toggle', { name: p.manifest.name })}
                    onChange={(on) =>
                      setPackEnabled(p.id, on).catch((e) => setError(packErrorMessage(e)))
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {advanced && !open && <ConnectedAppsSettings />}
    </div>
  );
}
