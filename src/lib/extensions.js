// Frontend side of the local extension API (src-tauri/src/extensions,
// contract in docs/EXTENSIONS.md). The Rust side owns the HTTP server,
// pairing, tokens and scope checks; the windows here only (a) approve
// pairings, (b) execute calls Rust routes to them, and (c) feed the prompter
// state stream. Native-only: in the browser demo everything is a no-op.
import { isTauri, listen } from './tauri';

export const extensionsAvailable = isTauri;

export const EXTENSION_DOCS_URL =
  'https://github.com/omniship-labs/eyeread.in/blob/main/docs/EXTENSIONS.md';

// Scope → i18n key under `extensions.scopes`, in the canonical order Rust uses.
export const SCOPE_LABEL_KEYS = {
  'scripts:write': 'scriptsWrite',
  'prompter:load': 'prompterLoad',
  'prompter:control': 'prompterControl',
  'prompter:events': 'prompterEvents',
};

async function invoke(cmd, args) {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke(cmd, args);
}

export async function getExtensionsStatus() {
  if (!isTauri) return null;
  return invoke('extensions_status');
}

export async function setExtensionsEnabled(enabled) {
  return invoke('extensions_set_enabled', { enabled });
}

export async function revokeExtension(id) {
  return invoke('extensions_revoke', { id });
}

export async function resolvePairing(requestId, approve) {
  return invoke('extensions_resolve_pairing', { requestId, approve });
}

/** Thrown by a call handler to answer with a specific API error code. */
export class ExtensionError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

/**
 * Execute extension calls that Rust routes to this window.
 * `handlers` maps a method name to `(params, extension) => result`; results
 * are merged into the HTTP response body. Returns an unlisten function.
 */
export async function serveExtensionCalls(windowLabel, handlers) {
  if (!isTauri) return () => {};
  return listen(`extensions:rpc:${windowLabel}`, async (call) => {
    let result = null;
    let error = null;
    try {
      const handler = handlers[call?.method];
      if (!handler) error = 'unknown_method';
      else result = (await handler(call.params, call.extension)) ?? null;
    } catch (e) {
      error = e instanceof ExtensionError ? e.code : 'internal_error';
    }
    invoke('extensions_rpc_result', { id: call?.id, result, error }).catch(() => {});
  });
}

/** Overlay → Rust: latest reading state for `prompter:events` subscribers. */
export function reportPrompterState(state) {
  if (!isTauri) return;
  invoke('extensions_prompter_state', { state }).catch(() => {});
}
