import { useEffect, useRef } from 'react';
import { isTauri } from '../lib/tauri';

/**
 * Region-based click-through for the transparent overlay window.
 *
 * The overlay window is a large transparent rect; only the glass panel (and
 * the settings popover) should catch the mouse. While the cursor is outside
 * those elements, the whole window ignores cursor events, so clicks land on
 * whatever is underneath — slides, Zoom, the browser.
 *
 * macOS gives a window no mouse events while it's ignoring them, so we can't
 * use mouseenter/leave: instead we poll the global cursor position and toggle
 * `setIgnoreCursorEvents` as it crosses panel boundaries.
 *
 * @param {Array<React.RefObject<HTMLElement>>} refs interactive regions
 * @param {boolean} enabled
 */
export function useClickThrough(refs, enabled = true) {
  const refsRef = useRef(refs);
  refsRef.current = refs;

  useEffect(() => {
    if (!isTauri || !enabled) return undefined;

    let cancelled = false;
    let timer = null;
    let win = null;
    let ignoring = null; // unknown at start — first tick always syncs
    let pointerDown = false;

    // never flip to click-through mid-interaction (slider drags, etc.)
    const onDown = () => (pointerDown = true);
    const onUp = () => (pointerDown = false);
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointerup', onUp, true);

    const PAD = 10; // hysteresis so hover states wake up before you arrive

    (async () => {
      const { getCurrentWindow, cursorPosition } = await import(
        '@tauri-apps/api/window'
      );
      if (cancelled) return;
      win = getCurrentWindow();

      const tick = async () => {
        if (cancelled || pointerDown) return;
        try {
          const [cur, wpos, scale] = await Promise.all([
            cursorPosition(), // physical, global
            win.outerPosition(), // physical
            win.scaleFactor(),
          ]);
          const x = (cur.x - wpos.x) / scale; // logical, window-relative
          const y = (cur.y - wpos.y) / scale;

          const inside = refsRef.current.some((r) => {
            const el = r.current;
            if (!el) return false;
            const b = el.getBoundingClientRect();
            return (
              x >= b.left - PAD &&
              x <= b.right + PAD &&
              y >= b.top - PAD &&
              y <= b.bottom + PAD
            );
          });

          const shouldIgnore = !inside;
          if (shouldIgnore !== ignoring) {
            ignoring = shouldIgnore;
            await win.setIgnoreCursorEvents(shouldIgnore);
          }
        } catch {
          /* window hidden / shutting down — try again next tick */
        }
      };

      timer = setInterval(tick, 80);
      tick();
    })();

    return () => {
      // cursor-event state is owned by the interaction lock in OverlayWindow;
      // just stop polling.
      cancelled = true;
      if (timer) clearInterval(timer);
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointerup', onUp, true);
    };
  }, [enabled]);
}
