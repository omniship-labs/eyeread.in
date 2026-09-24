import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getPackLogs, getPackNetLog, mergeLogs } from '../../lib/packs';

const REFRESH_MS = 1500;

function formatTime(ms) {
  return new Date(ms).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Developer mode's log panel for one pack: console output, errors and
 * permission denials from its sandboxes, and its network requests, newest
 * first. Refreshes while open.
 */
export function PackLog({ id }) {
  const { t } = useTranslation();
  const [lines, setLines] = useState([]);

  useEffect(() => {
    let alive = true;
    const refresh = () =>
      Promise.all([getPackLogs(id).catch(() => []), getPackNetLog(id).catch(() => [])]).then(
        ([logs, net]) => alive && setLines(mergeLogs(logs, net))
      );
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [id]);

  return (
    <>
      <div className="set-subgroup-label">{t('packs.dev.log')}</div>
      <div className="set-row">
        <div className="set-info">
          <span>{t('packs.dev.logHint')}</span>
        </div>
      </div>
      <div className="set-row pk-log-wrap">
        {lines.length === 0 ? (
          <span className="pk-muted">{t('packs.dev.logEmpty')}</span>
        ) : (
          <ol className="pk-devlog" data-testid="pk-dev-log">
            {lines.slice(0, 300).map((l, i) => (
              <li key={`${l.time}-${i}`} className={`pk-devlog-${l.level}`}>
                <span className="pk-devlog-time">{formatTime(l.time)}</span>
                <span className="pk-devlog-level">{l.level}</span>
                <span className="pk-devlog-text">{l.text}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
