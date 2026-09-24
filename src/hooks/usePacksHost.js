import {
  createElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { listen } from '../lib/tauri';
import {
  callerSource,
  importPayload,
  packsAvailable,
  resolveAppPairing,
  servePackCalls,
} from '../lib/packs';
import { newScript } from '../lib/store';
import { ConnectedAppPairModal } from '../components/ConnectedAppPairModal';
import { PackImportModal } from '../components/PackImportModal';

/** Build a library script from validated call params, labelled with its source. */
export function callerScript({ title, text, language }, tag, caller) {
  const source = callerSource(caller);
  return {
    ...newScript(),
    title,
    text,
    tag,
    ...(language ? { language } : {}),
    ...(source ? { source } : {}),
    updatedAt: Date.now(),
  };
}

/**
 * Main-window host for packs and Connected apps:
 *   • shows the pairing prompt when an app asks to connect,
 *   • shows the app's own file picker for a pack's `files.import`, and
 *   • executes `scripts.create` / `prompter.load` through the same paths the
 *     UI uses — the library state (persisted by MainWindow's debounced save)
 *     and `startReading` (permissions gate → showOverlay, so placement and
 *     share protection apply exactly as when the user presses Play).
 *
 * Every script a caller sends lands in the library, labelled with its source,
 * so there is always a visible record of what was shown and who sent it.
 *
 * @param setScripts    MainWindow's scripts state setter
 * @param startReading  MainWindow's (script) => void reading entry point
 * @returns { pairingModal, importModal } elements to render (or null)
 */
export function usePacksHost({ setScripts, startReading }) {
  const [pairing, setPairing] = useState(null);
  // A pack's files:import request waiting for the user: { caller, params, resolve, reject }.
  const [importRequest, setImportRequest] = useState(null);
  const startReadingRef = useRef(startReading);
  useLayoutEffect(() => {
    startReadingRef.current = startReading;
  });

  useEffect(() => {
    if (!packsAvailable) return undefined;
    const unlisteners = [];
    let cancelled = false;
    const keep = (fn) => {
      if (cancelled) fn();
      else unlisteners.push(fn);
    };
    listen('packs:apps-pair-request', (p) => {
      if (p?.requestId) setPairing(p);
    }).then(keep);
    listen('packs:apps-pair-cancelled', (p) => {
      setPairing((cur) => (cur?.requestId === p?.requestId ? null : cur));
    }).then(keep);
    servePackCalls('main', {
      'scripts.create': (params, caller) => {
        const s = callerScript(params, 'draft', caller);
        setScripts((ss) => [s, ...ss]);
        return { scriptId: s.id };
      },
      'prompter.load': (params, caller) => {
        const s = callerScript(params, 'ready', caller);
        setScripts((ss) => [s, ...ss]);
        startReadingRef.current(s);
        return { scriptId: s.id };
      },
      // The broker only routes this for packs holding files:import, one at a
      // time per pack. Resolves with the chosen file, or null if cancelled.
      'files.import': (params, caller) =>
        new Promise((resolve, reject) => setImportRequest({ caller, params, resolve, reject })),
    }).then(keep);
    return () => {
      cancelled = true;
      unlisteners.forEach((fn) => fn());
    };
  }, [setScripts]);

  const decide = useCallback(
    (approve) => {
      if (!pairing) return;
      resolveAppPairing(pairing.requestId, approve).catch(() => {});
      setPairing(null);
    },
    [pairing]
  );
  const allow = useCallback(() => decide(true), [decide]);
  const deny = useCallback(() => decide(false), [decide]);

  const finishImport = useCallback(
    (file) => {
      if (!importRequest) return;
      const { params, resolve, reject } = importRequest;
      setImportRequest(null);
      if (!file) resolve(null);
      else importPayload(file, params.maxBytes).then(resolve, reject);
    },
    [importRequest]
  );
  const cancelImport = useCallback(() => finishImport(null), [finishImport]);

  const importModal = importRequest
    ? createElement(PackImportModal, {
        name: importRequest.caller?.name,
        accept: importRequest.params?.accept,
        onChoose: finishImport,
        onCancel: cancelImport,
      })
    : null;

  const pairingModal = pairing
    ? createElement(ConnectedAppPairModal, {
        name: pairing.name,
        scopes: pairing.scopes,
        onAllow: allow,
        onDeny: deny,
      })
    : null;

  return { pairingModal, importModal };
}
