// Thin platform layer. Everything works in a plain browser too (for design
// review / web demo) via BroadcastChannel + window.open fallbacks.

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// Platform detection. Seeded from userAgent (works in the web demo too) then
// overwritten by initPlatform() via @tauri-apps/plugin-os before React mounts.
//
// Screen-share invisibility maps to a real OS capability on:
//   • macOS   — NSWindowSharingType=none (compositor-level, rock solid)
//   • Windows — SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE), Win10 2004+
//               (DWM-level; excludes the window from DXGI Desktop Duplication,
//                Windows.Graphics.Capture and BitBlt — i.e. Zoom/Teams/Meet/OBS)
// On Linux there is no portable equivalent: capture happens in the compositor
// (PipeWire + xdg-desktop-portal on Wayland, raw framebuffer on X11) and there
// is no standard per-window exclusion protocol — so it is best-effort only.
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
export let isMacOS = /Mac|iPhone|iPad/.test(ua);
export let isWindows = /Win/.test(ua);
export let isLinux = /Linux|X11/.test(ua) && !/Android/.test(ua) && !isWindows;

// Platforms where the OS enforces capture exclusion reliably.
export let screenShareProtectionReliable = isMacOS || isWindows;

/** Call once before React mounts to replace userAgent guesses with the real OS. */
export async function initPlatform() {
  if (!isTauri) return;
  const { platform } = await import('@tauri-apps/plugin-os');
  const p = await platform();
  isMacOS = p === 'macos';
  isWindows = p === 'windows';
  isLinux = p === 'linux';
  screenShareProtectionReliable = isMacOS || isWindows;
}

/**
 * Whether the screen-share shield should read as ACTIVE for the given settings.
 * On macOS/Windows this is just `hideFromShare`. On Linux it additionally
 * requires the user to have accepted the best-effort risk, so we never present
 * the overlay as "hidden" on Linux without an explicit acknowledgement.
 */
export const shieldActive = (settings) =>
  isLinux
    ? !!(settings.hideFromShare && settings.linuxShareRiskAccepted)
    : !!settings.hideFromShare;

const OVERLAY_W = 660;
const OVERLAY_H = 420;

let bc = null;
function channel() {
  if (!bc) bc = new BroadcastChannel('eyeread');
  return bc;
}

/** Cross-window event emit (Tauri event system or BroadcastChannel). */
export async function emitTo(label, event, payload) {
  if (isTauri) {
    const mod = await import('@tauri-apps/api/event');
    return mod.emitTo(label, event, payload);
  }
  channel().postMessage({ event, payload });
}

/** Cross-window event listen. Returns an unlisten function. */
export async function listen(event, cb) {
  if (isTauri) {
    const mod = await import('@tauri-apps/api/event');
    return mod.listen(event, (e) => cb(e.payload));
  }
  const handler = (msg) => {
    if (msg.data?.event === event) cb(msg.data.payload);
  };
  channel().addEventListener('message', handler);
  return () => channel().removeEventListener('message', handler);
}

async function overlayWindow() {
  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  return WebviewWindow.getByLabel('overlay');
}

/** Anchor the overlay window on the current monitor. */
export async function positionOverlay(position = 'top', windowW = OVERLAY_W) {
  if (!isTauri) return;
  const { currentMonitor, LogicalPosition } = await import('@tauri-apps/api/window');
  const win = await overlayWindow();
  const monitor = await currentMonitor();
  if (!win || !monitor) return;
  const scale = monitor.scaleFactor || 1;
  const mw = monitor.size.width / scale;
  const mh = monitor.size.height / scale;
  const mx = monitor.position.x / scale;
  const my = monitor.position.y / scale;
  const x = mx + (mw - windowW) / 2;
  // Shift center/bottom positions up so the panel appears at the intended
  // visual location (the CSS has a small top pad for the drag region).
  const SHADOW_PAD = 22;
  const y =
    position === 'center'
      ? my + (mh - OVERLAY_H) / 2 - SHADOW_PAD
      : position === 'bottom'
        ? my + mh - OVERLAY_H - 24 - SHADOW_PAD
        : my; // top — padding-top:0 in CSS, so panel starts at the window top; no offset needed
  await win.setPosition(new LogicalPosition(Math.round(x), Math.round(y)));
}

let demoTab = null;

/** Show the prompter with a script + settings payload. */
export async function showOverlay(script, settings) {
  if (isTauri) {
    const win = await overlayWindow();
    if (!win) return;
    // Only auto-position on first show — if already visible the user has
    // dragged it somewhere and we should leave it there.
    const alreadyVisible = await win.isVisible().catch(() => false);
    if (!alreadyVisible) {
      const { LogicalSize, LogicalPosition } = await import('@tauri-apps/api/window');
      const savedW = settings.overlaySize?.w;
      const targetW = savedW ? Math.round(savedW + 96) : OVERLAY_W;
      await win.setSize(new LogicalSize(targetW, OVERLAY_H + 420)).catch(() => {});
      // Restore last position for this script, or default to centered.
      const savedPos = script?.overlayPos;
      if (savedPos) {
        await win
          .setPosition(new LogicalPosition(Math.round(savedPos.x), Math.round(savedPos.y)))
          .catch(() => {});
      } else {
        await positionOverlay(settings.position, targetW);
      }
    }
    // follow the user across desktops / Spaces, stay above everything
    await win.setVisibleOnAllWorkspaces(true).catch(() => {});
    await win.setAlwaysOnTop(true).catch(() => {});
    await emitTo('overlay', 'overlay:load', { script, settings });
    await win.show();
    // Windows quirk (tauri#14189): a content-protected transparent window can
    // render black in the capture stream after a hide→show cycle. Re-asserting
    // the display affinity right after show() clears it. No-op elsewhere.
    if (isWindows && settings.hideFromShare) await setAppProtected(true);
  } else {
    if (!demoTab || demoTab.closed) {
      demoTab = window.open(
        `${location.pathname}?window=overlay`,
        'eyeread.in-overlay',
        'width=660,height=620'
      );
      // give the demo tab a moment to boot before sending the script
      setTimeout(() => emitTo('overlay', 'overlay:load', { script, settings }), 600);
    } else {
      demoTab.focus();
      emitTo('overlay', 'overlay:load', { script, settings });
    }
  }
}

async function settingsWindow() {
  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  return WebviewWindow.getByLabel('settings');
}

/** Open the independent settings window next to the overlay panel. */
export async function showSettingsWindow() {
  if (!isTauri) return;
  const win = await settingsWindow();
  if (!win) return;
  // Anchor it just to the right of the overlay window.
  try {
    const { LogicalPosition } = await import('@tauri-apps/api/window');
    const ov = await overlayWindow();
    const pos = await ov.outerPosition();
    const size = await ov.outerSize();
    const scale = await ov.scaleFactor();
    const x = Math.round(pos.x / scale + size.width / scale + 8);
    const y = Math.round(pos.y / scale);
    await win.setPosition(new LogicalPosition(x, y));
  } catch {
    /* overlay hidden, skip positioning */
  }
  await win.setVisibleOnAllWorkspaces(true).catch(() => {});
  await win.setAlwaysOnTop(true).catch(() => {});
  await win.show();
  await win.setFocus();
}

export async function hideSettingsWindow() {
  if (!isTauri) return;
  const win = await settingsWindow();
  await win?.hide();
}

export async function showAboutWindow() {
  if (!isTauri) return;
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('show_about_window');
}

export async function hideAboutWindow() {
  if (!isTauri) return;
  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  const win = await WebviewWindow.getByLabel('about');
  await win?.hide();
}

export async function setAboutProtected(protected_) {
  if (!isTauri) return;
  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  const win = await WebviewWindow.getByLabel('about');
  await win?.setContentProtected(protected_);
}

export async function hideOverlay() {
  if (isTauri) {
    const win = await overlayWindow();
    await win?.hide();
  }
  emitTo('main', 'overlay:hidden', {});
}

/**
 * Adjust the overlay window WIDTH to match the glass panel.
 * Height is intentionally left alone — it is set once (tall enough for the
 * settings popover) when the overlay is shown and never touched again, so
 * nothing on screen shifts when the popover opens or closes.
 */
export async function getOverlayPos() {
  if (!isTauri) return null;
  const win = await overlayWindow();
  if (!win) return null;
  try {
    const scale = await win.scaleFactor();
    const pos = await win.outerPosition();
    return { x: pos.x / scale, y: pos.y / scale };
  } catch {
    return null;
  }
}

/** Reset the overlay to its default size and centered position. */
export async function resetOverlayLayout(settings) {
  if (!isTauri) return;
  const { LogicalSize } = await import('@tauri-apps/api/window');
  const win = await overlayWindow();
  if (!win) return;
  const defaultW = settings?.overlaySize?.w ?? 560;
  const targetW = Math.round(defaultW + 96);
  await win.setSize(new LogicalSize(targetW, OVERLAY_H + 420)).catch(() => {});
  await positionOverlay(settings?.position ?? 'top', targetW);
}

/**
 * Fit the native overlay window to the panel's actual rendered box (`panel`
 * = { w, h } from panelRef.getBoundingClientRect()).
 *
 * This used to only chase width, leaving height pinned to a big fixed
 * constant as permanent headroom for the panel's resize handle — harmless
 * while the glass blur was CSS `backdrop-filter` scoped to the panel
 * element, since the extra window space was simply invisible. macOS/Windows
 * now get their blur from a native compositor layer that fills the *whole*
 * OS window (see tauri.conf.json's `windowEffects`), which isn't clipped to
 * any DOM element — so a window sized well past its content showed up as a
 * big translucent/tinted rectangle around a much smaller panel. Fitting
 * height the same way width already was removes that dead space instead of
 * merely hiding it.
 */
export async function fitOverlayToPanel(panel) {
  if (!isTauri) return;
  const { LogicalSize, LogicalPosition } = await import('@tauri-apps/api/window');
  const win = await overlayWindow();
  if (!win) return;
  try {
    const scale = await win.scaleFactor();
    const pos = await win.outerPosition();
    const size = await win.outerSize();
    const oldW = size.width / scale;
    const oldH = size.height / scale;
    // Room for the root's own CSS padding (overlay.less .overlay-root:
    // 22px top / 32px right+bottom+left) plus headroom for the panel's
    // box-shadow blur, so neither gets clipped by the OS window edge.
    const newW = Math.round(panel.w + 96); // 32px padding each side + shadow bleed
    const newH = Math.round(panel.h + 86); // 22/32px top/bottom padding + shadow bleed
    if (Math.abs(newW - oldW) < 2 && Math.abs(newH - oldH) < 2) return;
    await win.setSize(new LogicalSize(newW, newH));
    // compensate so the panel stays visually centred as it grows/shrinks
    await win.setPosition(
      new LogicalPosition(
        Math.round(pos.x / scale + (oldW - newW) / 2),
        Math.round(pos.y / scale + (oldH - newH) / 2)
      )
    );
  } catch {
    /* window hidden mid-call */
  }
}

/** Bring the main app window back to front (the "go back" action). */
export async function focusMain() {
  if (!isTauri) return;
  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  const win = await WebviewWindow.getByLabel('main');
  if (!win) return;
  try {
    await win.unminimize();
  } catch {
    /* not minimized */
  }
  await win.show().catch(() => {});
  await win.setFocus().catch(() => {});
}

export async function isOverlayVisible() {
  if (!isTauri) return false;
  const win = await overlayWindow();
  return win ? win.isVisible() : false;
}

/** Toggle screen-share invisibility on every app window atomically. */
export async function setAppProtected(on) {
  if (!isTauri) return;
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('set_app_protected', { protected: on });
}

/**
 * Turn the overlay's native glass (macOS vibrancy/Liquid Glass, Windows
 * Acrylic) on or off, so the "Glass blur" setting actually does something
 * on those platforms — AppKit/DWM materials aren't a continuously tunable
 * blur radius like CSS was, so every nonzero blur value uses the same fixed
 * material, but this at least makes blur === 0 genuinely disable it instead
 * of always showing native blur regardless of the setting.
 */
export async function setOverlayGlass(enabled) {
  if (!isTauri) return;
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('set_overlay_glass', { enabled }).catch(() => {});
}

// Serialize hotkey registration so StrictMode double-invocation can't race.
const hotkeyQueue = {};
function withHotkeyLock(combo, fn) {
  const prev = hotkeyQueue[combo] ?? Promise.resolve();
  const next = prev.then(fn).catch(() => () => {});
  hotkeyQueue[combo] = next.catch(() => {});
  return next;
}

/** Register the global show/hide hotkey (⌘⇧E). Main window only. */
export function registerOverlayHotkey(toggle) {
  if (!isTauri) return Promise.resolve(() => {});
  const combo = 'CommandOrControl+Shift+E';
  return withHotkeyLock(combo, async () => {
    const { register, unregister } = await import('@tauri-apps/plugin-global-shortcut');
    await unregister(combo).catch(() => {});
    await register(combo, (event) => {
      if (event.state === 'Pressed') toggle();
    });
    return () => unregister(combo).catch(() => {});
  });
}

/**
 * Register the global click-through toggle hotkey (⌥⇧E). Main window only —
 * the overlay can't own global shortcuts when it's fully click-through.
 * On press, we emit an event that the overlay listens for.
 */
export function registerInteractiveHotkey() {
  if (!isTauri) return Promise.resolve(() => {});
  const combo = 'Alt+Shift+E';
  return withHotkeyLock(combo, async () => {
    const { register, unregister } = await import('@tauri-apps/plugin-global-shortcut');
    await unregister(combo).catch(() => {});
    await register(combo, async (event) => {
      if (event.state === 'Pressed') await emitTo('overlay', 'overlay:toggle-interactive', {});
    });
    return () => unregister(combo).catch(() => {});
  });
}

/** Open an external URL in the default browser. */
export async function openExternal(url) {
  if (isTauri) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    return openUrl(url);
  }
  window.open(url, '_blank', 'noopener');
}

/**
 * Check for an available update.
 * Returns: { status: 'up_to_date' | 'update_available', version?: string }
 */
export async function checkForUpdate() {
  if (!isTauri) return { status: 'up_to_date' };
  const { invoke } = await import('@tauri-apps/api/core');
  const result = await invoke('check_for_update');
  if (result.startsWith('update:')) {
    return { status: 'update_available', version: result.slice(7) };
  }
  return { status: 'up_to_date' };
}

/** Download, install the update, and restart. */
export async function installUpdate() {
  if (!isTauri) return;
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('install_update');
}
