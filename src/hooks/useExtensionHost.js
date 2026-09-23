import {
  createElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { listen } from '../lib/tauri';
import { extensionsAvailable, resolvePairing, serveExtensionCalls } from '../lib/extensions';
import { newScript } from '../lib/store';
import { ExtensionPairModal } from '../components/ExtensionPairModal';

/** Build a library script from validated extension params. */
function extensionScript({ title, text, language }, tag) {
  return {
    ...newScript(),
    title,
    text,
    tag,
    ...(language ? { language } : {}),
    updatedAt: Date.now(),
  };
}

/**
 * Main-window host for the local extension API:
 *   • shows the pairing prompt when an app asks to connect, and
 *   • executes `scripts.create` / `prompter.load` through the same paths the
 *     UI uses — the library state (persisted by MainWindow's debounced save)
 *     and `startReading` (permissions gate → showOverlay, so placement and
 *     share protection apply exactly as when the user presses Play).
 *
 * Every script an extension sends lands in the library, so there is always a
 * visible record of what was shown and which extension sent it.
 *
 * @param setScripts    MainWindow's scripts state setter
 * @param startReading  MainWindow's (script) => void reading entry point
 * @returns { pairingModal } element to render (or null)
 */
export function useExtensionHost({ setScripts, startReading }) {
  const [pairing, setPairing] = useState(null);
  const startReadingRef = useRef(startReading);
  useLayoutEffect(() => {
    startReadingRef.current = startReading;
  });

  useEffect(() => {
    if (!extensionsAvailable) return undefined;
    const unlisteners = [];
    let cancelled = false;
    const keep = (fn) => {
      if (cancelled) fn();
      else unlisteners.push(fn);
    };
    listen('extensions:pair-request', (p) => {
      if (p?.requestId) setPairing(p);
    }).then(keep);
    listen('extensions:pair-cancelled', (p) => {
      setPairing((cur) => (cur?.requestId === p?.requestId ? null : cur));
    }).then(keep);
    serveExtensionCalls('main', {
      'scripts.create': (params) => {
        const s = extensionScript(params, 'draft');
        setScripts((ss) => [s, ...ss]);
        return { scriptId: s.id };
      },
      'prompter.load': (params) => {
        const s = extensionScript(params, 'ready');
        setScripts((ss) => [s, ...ss]);
        startReadingRef.current(s);
        return { scriptId: s.id };
      },
    }).then(keep);
    return () => {
      cancelled = true;
      unlisteners.forEach((fn) => fn());
    };
  }, [setScripts]);

  const decide = useCallback(
    (approve) => {
      if (!pairing) return;
      resolvePairing(pairing.requestId, approve).catch(() => {});
      setPairing(null);
    },
    [pairing]
  );
  const allow = useCallback(() => decide(true), [decide]);
  const deny = useCallback(() => decide(false), [decide]);

  const pairingModal = pairing
    ? createElement(ExtensionPairModal, {
        name: pairing.name,
        scopes: pairing.scopes,
        onAllow: allow,
        onDeny: deny,
      })
    : null;

  return { pairingModal };
}
