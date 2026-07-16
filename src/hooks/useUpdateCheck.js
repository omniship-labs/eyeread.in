import { useCallback, useEffect, useRef, useState } from 'react';
import { isTauri, checkForUpdate, installUpdate } from '../lib/tauri';

// Shared update-check state for the app's single long-lived main window.
// status: 'idle' | 'checking' | 'up_to_date' | 'available' | 'installing' | 'error'
//
// intervalHours: how often to silently re-check while the app stays open;
// 0 disables periodic checks (still checks once shortly after launch). Every
// check — manual or automatic — updates `lastChecked`, which re-arms the
// periodic timer `intervalHours` out from that point, so a manual click
// doesn't leave a near-duplicate check pending.
export function useUpdateCheck(intervalHours = 6) {
  const [status, setStatus] = useState('idle');
  const [version, setVersion] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [nextCheckAt, setNextCheckAt] = useState(null);
  const inFlight = useRef(false);

  const check = useCallback(async () => {
    if (!isTauri || inFlight.current) return;
    inFlight.current = true;
    setStatus('checking');
    try {
      const result = await checkForUpdate();
      if (result.status === 'update_available') {
        setVersion(result.version);
        setStatus('available');
      } else {
        setStatus('up_to_date');
      }
    } catch {
      setStatus('error');
    } finally {
      inFlight.current = false;
      setLastChecked(Date.now());
    }
  }, []);

  const install = useCallback(async () => {
    if (!isTauri) return;
    setStatus('installing');
    try {
      await installUpdate(); // restarts the app on success
    } catch {
      setStatus('error');
    }
  }, []);

  // First check shortly after launch.
  useEffect(() => {
    if (!isTauri) return undefined;
    const t = setTimeout(check, 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-arms from now whenever a check completes (lastChecked changes) or the
  // user changes the interval — either way the next check is always exactly
  // `intervalHours` out from the most recent of those two events. nextCheckAt
  // mirrors the real setTimeout below (not derivable from props/state alone,
  // since it depends on when this effect actually ran), so it's set here.
  useEffect(() => {
    if (!isTauri || !intervalHours || lastChecked == null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNextCheckAt(null);
      return undefined;
    }
    const delay = intervalHours * 60 * 60 * 1000;
    setNextCheckAt(Date.now() + delay);
    const t = setTimeout(check, delay);
    return () => clearTimeout(t);
  }, [check, intervalHours, lastChecked]);

  return { status, version, lastChecked, nextCheckAt, check, install };
}
