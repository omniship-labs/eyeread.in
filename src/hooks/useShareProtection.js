import { useState, useCallback, createElement } from 'react';
import { setAppProtected, isLinux } from '../lib/tauri';
import { LinuxShareConsent } from '../components/LinuxShareConsent';

/**
 * useShareProtection — single source of truth for toggling "Hide from
 * screen-share", with a Linux risk-acknowledgement gate.
 *
 * On macOS/Windows the toggle applies immediately. On Linux, the FIRST time
 * the user turns it ON we show a consent modal; acceptance is remembered via
 * the `linuxShareRiskAccepted` setting so we never nag again.
 *
 * @param settings     current settings object (needs hideFromShare + linuxShareRiskAccepted)
 * @param patchSettings (partial) => void — merges a settings patch (and persists/syncs)
 * @returns { setShielded, consentModal }
 *   setShielded(next)  — handler for the ShieldToggle / Switch
 *   consentModal       — JSX to render somewhere in the tree (null when closed)
 */
export function useShareProtection(settings, patchSettings) {
  const [pending, setPending] = useState(false);

  const apply = useCallback(
    (on, extra) => {
      patchSettings({ hideFromShare: on, ...extra });
      setAppProtected(on);
    },
    [patchSettings]
  );

  const setShielded = useCallback(
    (next) => {
      // Linux + turning on + not yet acknowledged → ask first.
      if (next && isLinux && !settings.linuxShareRiskAccepted) {
        setPending(true);
        return;
      }
      apply(next);
    },
    [apply, settings.linuxShareRiskAccepted]
  );

  const accept = useCallback(() => {
    setPending(false);
    apply(true, { linuxShareRiskAccepted: true });
  }, [apply]);

  const cancel = useCallback(() => setPending(false), []);

  const consentModal = pending
    ? createElement(LinuxShareConsent, { onAccept: accept, onCancel: cancel })
    : null;

  return { setShielded, consentModal };
}
