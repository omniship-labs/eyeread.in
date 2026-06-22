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
export async function positionOverlay(position = 'top') {
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
  const x = mx + (mw - OVERLAY_W) / 2;
  // Shift the window 40px above where the panel should visually appear — the
  // extra padding-top in overlay-root gives the box-shadow room to render.
  const SHADOW_PAD = 40;
  const y =
    position === 'center'
      ? my + (mh - OVERLAY_H) / 2 - SHADOW_PAD
      : position === 'bottom'
        ? my + mh - OVERLAY_H - 24 - SHADOW_PAD
        : my + 12 - SHADOW_PAD; // top — just under the webcam
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
      await positionOverlay(settings.position);
      // Set a tall fixed height with room for the settings popover above the
      // panel. We never change height again — only width tracks the panel.
      const { LogicalSize } = await import('@tauri-apps/api/window');
      await win.setSize(new LogicalSize(OVERLAY_W, OVERLAY_H + 420)).catch(() => {});
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
    const newW = Math.round(panel.w + 96); // 32px padding each side
    if (Math.abs(newW - oldW) < 2) return; // width unchanged — do nothing
    await win.setSize(new LogicalSize(newW, size.height / scale));
    // compensate horizontally so the panel stays centred
    await win.setPosition(
      new LogicalPosition(
        Math.round(pos.x / scale + (oldW - newW) / 2),
        Math.round(pos.y / scale)
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
 * Register the global click-through toggle hotkey (⌥E). Main window only —
 * the overlay can't own global shortcuts when it's fully click-through.
 * On press, we emit an event that the overlay listens for.
 */
export function registerInteractiveHotkey() {
  if (!isTauri) return Promise.resolve(() => {});
  const combo = 'Alt+E';
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
