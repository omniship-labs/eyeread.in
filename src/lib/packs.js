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
 * Execute calls that Rust routes to this window.
 * `handlers` maps a method name to `(params, caller) => result`, where
 * `caller` is `{ kind: 'app', id, name }`; results are merged into the HTTP
 * response body. Returns an unlisten function.
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
    invoke('packs_apps_rpc_result', { id: call?.id, result, error }).catch(() => {});
  });
}

/** Overlay → Rust: latest reading state for `prompter:events` subscribers. */
export function reportPrompterState(state) {
  if (!isTauri) return;
  invoke('packs_apps_prompter_state', { state }).catch(() => {});
}
