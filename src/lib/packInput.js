// Keyboard and mouse input for packs (spec/packs/API.md, "Input"). The app's
// windows report events to Rust only while eyeread.in is focused, only while
// some pack is subscribed, and never from a text field, so a pack can't read
// what the user types into the app. Rust checks each event again and applies
// the pack's declared `keys` / `buttons` / `position` before delivering it.
import { invoke, isTauri, listen } from './tauri';

const TEXT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
const MOVE_EVERY_MS = 33;

/** Is this event's target somewhere the user types? Those events are never reported. */
export function isEditableTarget(target) {
  if (!target) return false;
  return (
    Boolean(target.isContentEditable) || TEXT_TAGS.has(String(target.tagName).toUpperCase())
  );
}

const modifiers = (e) => ({
  ctrl: Boolean(e.ctrlKey),
  shift: Boolean(e.shiftKey),
  alt: Boolean(e.altKey),
  meta: Boolean(e.metaKey),
});

/**
 * The event to report, or null when it shouldn't be: `kind` and `data` as
 * `packs_input_event` takes them. `wanted` is what Rust said it needs.
 */
export function inputPayload(type, e, wanted, now = 0, lastMove = 0) {
  switch (type) {
    case 'keydown':
    case 'keyup':
      if (!wanted.keyboard || e.isComposing || isEditableTarget(e.target) || !e.code)
        return null;
      return {
        kind: 'key',
        data: {
          type: type === 'keydown' ? 'down' : 'up',
          code: e.code,
          modifiers: modifiers(e),
          repeat: Boolean(e.repeat),
        },
      };
    case 'mousedown':
    case 'mouseup':
      if (!wanted.mouse) return null;
      return {
        kind: 'mouse.button',
        data: {
          type: type === 'mousedown' ? 'down' : 'up',
          button: e.button,
          modifiers: modifiers(e),
        },
      };
    case 'wheel':
      if (!wanted.mouse) return null;
      return {
        kind: 'mouse.wheel',
        data: { deltaX: e.deltaX, deltaY: e.deltaY, modifiers: modifiers(e) },
      };
    case 'mousemove':
      if (!wanted.position || now - lastMove < MOVE_EVERY_MS) return null;
      return { kind: 'mouse.move', data: { x: e.screenX, y: e.screenY } };
    default:
      return null;
  }
}

/**
 * Start reporting input from this window. Returns a function that stops it.
 * Native-only: a no-op in the browser demo.
 */
export function startPackInput(target = window) {
  if (!isTauri) return () => {};
  let wanted = { keyboard: false, mouse: false, position: false };
  let lastMove = 0;
  let stopped = false;
  const unlisteners = [];

  const onEvent = (e) => {
    const now = Date.now();
    const payload = inputPayload(e.type, e, wanted, now, lastMove);
    if (!payload) return;
    if (payload.kind === 'mouse.move') lastMove = now;
    invoke('packs_input_event', payload).catch(() => {});
  };
  const types = ['keydown', 'keyup', 'mousedown', 'mouseup', 'wheel', 'mousemove'];
  // Capture phase, passive: observing input never changes what the app does with it.
  for (const t of types) target.addEventListener(t, onEvent, { capture: true, passive: true });

  invoke('packs_input_wanted')
    .then((w) => {
      if (!stopped) wanted = w;
    })
    .catch(() => {});
  listen('packs:input-wanted', (w) => {
    if (w) wanted = w;
  }).then((un) => (stopped ? un() : unlisteners.push(un)));

  return () => {
    stopped = true;
    for (const t of types) target.removeEventListener(t, onEvent, { capture: true });
    unlisteners.forEach((un) => un());
  };
}
