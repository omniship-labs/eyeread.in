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
  'files:import': 'filesImport',
};

// ---- installed packs (src-tauri/src/packs/commands.rs) --------------------------

export const listPacks = () => (isTauri ? invoke('packs_list') : Promise.resolve([]));
/** Validate a pack file dropped onto the window (a native path). */
export const inspectPackPath = (path) => invoke('packs_inspect', { path });
/** Validate a pack picked with "Install pack…": the zip's bytes, sent raw. */
export const inspectPackFile = async (file) =>
  invoke('packs_inspect_bytes', new Uint8Array(await file.arrayBuffer()));
/** Install exactly what was inspected; refused if the file changed since. */
export const installPack = (path, bundleHash) => invoke('packs_install', { path, bundleHash });
export const uninstallPack = (id) => invoke('packs_uninstall', { id });
export const setPackEnabled = (id, enabled) => invoke('packs_set_enabled', { id, enabled });
export const getPackGrants = (id) => invoke('packs_grants', { id });
export const setPackGrant = (id, permission, allowed, internet) =>
  invoke('packs_set_grant', { id, permission, allowed, internet });
export const getPackSettings = (id) => invoke('packs_settings_get', { id });
export const setPackSettings = (id, values) => invoke('packs_settings_set', { id, values });
export const getPackNetLog = (id) => invoke('packs_net_log', { id });
export const clearPackNetLog = (id) => invoke('packs_net_clear_log', { id });

/** The badge a pack shows: 'verified' (✓ signed by eyeread.in) or 'community'. */
export function packBadge(pack) {
  if (pack?.dev) return 'dev';
  return pack?.verified ? 'verified' : 'community';
}

/** Why a pack is blocked, or null: tampered files, a revocation, a crash. */
export function packProblem(pack) {
  if (!pack || pack.status === 'ok') return null;
  return { status: pack.status, reason: pack.statusReason || '' };
}

/** A pack-command error ({ code, message } from Rust) as display text. */
export function packErrorMessage(err) {
  if (err && typeof err === 'object' && err.message) return err.message;
  return String(err ?? '');
}

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

// ---- install flow ----------------------------------------------------------------

const INSTALL_EVENT = 'eyeread:install-pack';

/** Ask the main window's installer to review a picked `.zip` File. */
export function requestPackInstall(file) {
  window.dispatchEvent(new CustomEvent(INSTALL_EVENT, { detail: { file } }));
}

/** Listen for install requests from Settings. Returns an unlisten function. */
export function onPackInstallRequest(cb) {
  const handler = (e) => cb(e.detail);
  window.addEventListener(INSTALL_EVENT, handler);
  return () => window.removeEventListener(INSTALL_EVENT, handler);
}

/** The pack files in a drop: `.zip` only. */
export const packPathsIn = (paths) => (paths || []).filter((p) => /\.zip$/i.test(p));
