import { createElement, useCallback, useEffect, useState } from 'react';
import { onFileDrop } from '../lib/tauri';
import {
  inspectPackFile,
  inspectPackPath,
  installPack,
  onPackInstallRequest,
  packErrorMessage,
  packPathsIn,
  packsAvailable,
} from '../lib/packs';
import { PackInstallModal } from '../components/PackInstallModal';

/**
 * Main-window pack installer. A `.zip` dropped anywhere on the window, or
 * picked with Settings ▸ Packs ▸ "Install pack…", is validated by Rust and
 * shown in the install prompt; nothing is installed until the user confirms,
 * and Rust refuses if the file changed after they reviewed it.
 *
 * @returns { installModal } element to render (or null)
 */
export function usePackInstaller() {
  // null, or { review?, error?, busy }
  const [flow, setFlow] = useState(null);

  const review = useCallback((inspect) => {
    setFlow({ busy: true });
    inspect()
      .then((result) => setFlow({ review: result, busy: false }))
      .catch((e) => setFlow({ error: packErrorMessage(e), busy: false }));
  }, []);

  useEffect(() => {
    if (!packsAvailable) return undefined;
    let unlistenDrop;
    let cancelled = false;
    onFileDrop((paths) => {
      const [path] = packPathsIn(paths);
      if (path) review(() => inspectPackPath(path));
    }).then((fn) => {
      if (cancelled) fn();
      else unlistenDrop = fn;
    });
    const unlistenPick = onPackInstallRequest(({ file }) =>
      review(() => inspectPackFile(file))
    );
    return () => {
      cancelled = true;
      unlistenDrop?.();
      unlistenPick();
    };
  }, [review]);

  const deny = useCallback(() => setFlow(null), []);
  const install = useCallback(() => {
    const r = flow?.review;
    if (!r) return;
    setFlow({ ...flow, busy: true });
    installPack(r.path, r.bundleHash)
      .then(() => setFlow(null))
      .catch((e) => setFlow({ review: r, error: packErrorMessage(e), busy: false }));
  }, [flow]);

  const installModal = flow
    ? createElement(PackInstallModal, {
        review: flow.review,
        error: flow.error,
        busy: flow.busy,
        onInstall: install,
        onDeny: deny,
      })
    : null;
  return { installModal };
}
