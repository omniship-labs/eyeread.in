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
 * macOS gives a window no mouse events while it's ignoring them, so while in
 * pass-through mode we can't use mousemove and have to poll the global cursor
 * position via IPC instead. But while the window IS catching events
 * (interactive mode), we get real DOM mousemove for free — so we only poll
 * when pass-through is active, and rely on a plain mousemove listener the
 * rest of the time. That keeps the constant `cursorPosition`/`outerPosition`
 * IPC traffic confined to the one mode that actually needs it. `scaleFactor`
 * is fetched once per mode-sync and cached rather than polled every tick.
 *
 * `mode` should change (e.g. pass the "interactive" boolean/label) whenever
 * the set of interactive regions changes shape. Region *contents* update via
 * `refsRef` on every render for free, but a mode change needs the effect to
 * actually restart: it tears down the stale timer/listener from the old mode
 * and re-checks the cursor immediately, instead of waiting on a mousemove
 * that may never come (e.g. toggling modes without moving the mouse leaves
 * `ignoring` stale — the window keeps swallowing/passing clicks based on
 * regions that no longer apply, and in the pass-through case the old
 * polling timer is never killed).
 *
 * @param {Array<React.RefObject<HTMLElement>>} refs interactive regions
 * @param {boolean} enabled
 * @param {*} [mode] identity of the current region set; change forces resync
 */
export function useClickThrough(refs, enabled = true, mode) {
  const refsRef = useRef(refs);
  refsRef.current = refs;

  useEffect(() => {
    if (!isTauri || !enabled) return undefined;

    let cancelled = false;
    let timer = null;
    let win = null;
    let ignoring = null; // unknown at start — first check always syncs
    let pointerDown = false;
    // Cached rather than fetched every tick, and refreshed each time we
    // *enter* pass-through (not on every 80ms tick) — the window can only
    // move while it's interactive (dragging requires catching the mouse),
    // so re-checking right as we go back to ignoring cursor events catches
    // a mid-session monitor change without paying for it on every tick.
    let scale = 1;

    // never flip to click-through mid-interaction (slider drags, etc.)
    const onDown = () => (pointerDown = true);
    const onUp = () => (pointerDown = false);
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointerup', onUp, true);

    const PAD = 10; // hysteresis so hover states wake up before you arrive

    const isInside = (x, y) =>
      refsRef.current.some((r) => {
        const el = r.current;
        if (!el) return false;
        const b = el.getBoundingClientRect();
        return (
          x >= b.left - PAD && x <= b.right + PAD && y >= b.top - PAD && y <= b.bottom + PAD
        );
      });

    const setIgnoring = async (shouldIgnore) => {
      if (shouldIgnore === ignoring) return;
      ignoring = shouldIgnore;
      await win.setIgnoreCursorEvents(shouldIgnore);
      await syncMode();
    };

    // Interactive mode: cheap, IPC-free — plain DOM mousemove.
    const onMouseMove = (e) => {
      if (pointerDown) return;
      if (!isInside(e.clientX, e.clientY)) setIgnoring(true);
    };

    // Pass-through mode: no DOM events reach us, so poll the global cursor
    // via IPC (cursorPosition/outerPosition) until it re-enters.
    const tick = async () => {
      if (cancelled || pointerDown) return;
      try {
        const { cursorPosition } = await import('@tauri-apps/api/window');
        const [cur, wpos] = await Promise.all([
          cursorPosition(), // physical, global
          win.outerPosition(), // physical
        ]);
        const x = (cur.x - wpos.x) / scale; // logical, window-relative
        const y = (cur.y - wpos.y) / scale;
        await setIgnoring(!isInside(x, y));
      } catch {
        /* window hidden / shutting down — try again next tick */
      }
    };

    // Switch listener/poller to match the current mode.
    async function syncMode() {
      if (cancelled) return;
      if (ignoring) {
        window.removeEventListener('mousemove', onMouseMove);
        if (!timer) {
          // Window movement only happens while interactive (dragging needs
          // the mouse caught), so re-check the DPI right as we go back to
          // ignoring — catches a mid-session monitor change for free.
          scale = await win.scaleFactor().catch(() => scale);
          if (cancelled || !ignoring) return; // state may have flipped back already
          if (!timer) timer = setInterval(tick, 80);
        }
      } else {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        window.addEventListener('mousemove', onMouseMove);
      }
    }

    (async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      if (cancelled) return;
      win = getCurrentWindow();
      scale = await win.scaleFactor().catch(() => 1);
      if (cancelled) return;
      // First check always needs a poll — we don't know the cursor's
      // position relative to the window until we've asked via IPC once.
      await tick();
      await syncMode();
    })();

    return () => {
      // cursor-event state is owned by the interaction lock in OverlayWindow;
      // just stop polling/listening.
      cancelled = true;
      if (timer) clearInterval(timer);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointerup', onUp, true);
    };
  }, [enabled, mode]);
}
