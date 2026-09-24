// Frontend side of packs (spec/packs/) and Connected apps, the local HTTP API
// (src-tauri/src/packs/connected_apps, contract in docs/PACKS.md). The Rust
// side owns the HTTP server, pairing, tokens and scope checks; the windows
// here only (a) approve pairings, (b) execute calls Rust routes to them, and
// (c) feed the prompter state stream. Native-only: in the browser demo
// everything is a no-op.
import { invoke, isTauri, listen } from './tauri';

export const packsAvailable = isTauri;

export const PACKS_DOCS_URL =
  'https://github.com/omniship-labs/eyeread.in/blob/main/docs/PACKS.md';

// Permission → i18n key under `packs.permissions` / `packs.permissionHints`,
// in the canonical order Rust uses. Connected apps call these "scopes".
export const PERMISSION_LABEL_KEYS = {
  'scripts:write': 'scriptsWrite',
  'prompter:load': 'prompterLoad',
  'prompter:control': 'prompterControl',
  'prompter:events': 'prompterEvents',
};

export async function getConnectedAppsStatus() {
  if (!isTauri) return null;
  return invoke('packs_apps_status');
}

export async function setConnectedAppsEnabled(enabled) {
  return invoke('packs_apps_set_enabled', { enabled });
}

export async function revokeConnectedApp(id) {
  return invoke('packs_apps_revoke', { id });
}

export async function resolveAppPairing(requestId, approve) {
  return invoke('packs_apps_resolve_pairing', { requestId, approve });
}

/** Thrown by a call handler to answer with a specific API error code. */
export class PackCallError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

/**
 * Execute calls the permission broker routes to this window. The broker has
 * already checked the caller's grant and validated the params.
 * `handlers` maps a method name to `(params, caller) => result`, where
 * `caller` is `{ kind: 'app' | 'pack', id, name }`. Returns an unlisten
 * function.
 */
export async function servePackCalls(windowLabel, handlers) {
  if (!isTauri) return () => {};
  return listen(`packs:rpc:${windowLabel}`, async (call) => {
    let result = null;
    let error = null;
    try {
      const handler = handlers[call?.method];
      if (!handler) error = 'unknown_method';
      else result = (await handler(call.params, call.caller)) ?? null;
    } catch (e) {
      error = e instanceof PackCallError ? e.code : 'internal_error';
    }
    invoke('packs_rpc_result', { id: call?.id, result, error }).catch(() => {});
  });
}

/** Overlay → Rust: latest reading state for `prompter:events` subscribers. */
export function reportPrompterState(state) {
  if (!isTauri) return;
  invoke('packs_prompter_state', { state }).catch(() => {});
}

// ---- attribution -------------------------------------------------------------

/** Where a script came from, stored on it so the library can say so. */
export function callerSource(caller) {
  if (!caller?.kind || !caller?.name) return null;
  return { kind: caller.kind, id: caller.id, name: caller.name };
}

const ATTRIBUTION_KEYS = {
  play: 'packs.attribution.play',
  pause: 'packs.attribution.pause',
  toggle: 'packs.attribution.toggle',
  restart: 'packs.attribution.restart',
  seek: 'packs.attribution.seek',
};

/**
 * The overlay's note for a remote transport action ("Paused by Foot Pedal"),
 * as an i18n key and params, or null when there's nothing to show. When two
 * callers send conflicting commands the most recent wins, and this names it.
 */
export function controlAttribution(action, caller) {
  const key = ATTRIBUTION_KEYS[action];
  return key && caller?.name ? { key, params: { name: caller.name } } : null;
}

// ---- files:import --------------------------------------------------------------

function toBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/**
 * The only thing a pack receives from the app's file picker: the chosen
 * file's name, type and contents. No path, no folder. Throws `file_too_large`
 * past `maxBytes`.
 */
export async function importPayload(file, maxBytes) {
  if (file.size > maxBytes) throw new PackCallError('file_too_large');
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { name: file.name, type: file.type || '', data: toBase64(bytes) };
}

/** `accept` for `<input type="file">` from a pack's extension list. */
export function acceptAttribute(accept) {
  return Array.isArray(accept) && accept.length ? accept.join(',') : undefined;
}
