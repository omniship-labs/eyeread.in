// eyeread.in pack sandbox bootstrap. Loaded before a pack's own code in every
// sandbox webview, it turns the sandbox protocol (spec/packs/PROTOCOL.md) into
// the `eyeread.*` API (spec/packs/API.md).
//
// The sandbox talks to the app only through three URLs under its own base:
// `init` (who it is), `rpc` (calls, logs, errors) and `events` (a long poll
// that is also the heartbeat). The document's CSP allows nothing else. Rust
// checks every call against this sandbox's permissions, so nothing here is a
// security boundary: a pack calling `rpc` directly gets exactly the same
// answers.
(() => {
  'use strict';

  // Tauri's IPC globals are injected into every webview and can't be removed,
  // but the app's ACL refuses every call from a sandbox (build.rs,
  // capabilities/default.json): tests/packs-host's probe checks that.

  // Captured before any pack code runs.
  const $fetch = globalThis.fetch.bind(globalThis);
  const $stringify = JSON.stringify;
  const $parse = JSON.parse;
  const $setTimeout = globalThis.setTimeout.bind(globalThis);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const MAX_ARG = 4096;

  const send = async (message) => {
    const res = await $fetch('./rpc', {
      method: 'POST',
      // text/plain keeps this a simple request: no CORS preflight.
      headers: { 'Content-Type': 'text/plain' },
      body: $stringify({ v: 1, ...message }),
    });
    return $parse(await res.text());
  };
  const sendQuietly = (message) => send(message).catch(() => {});

  function toBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  }
  function fromBase64(text) {
    const binary = atob(text || '');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  class EyereadError extends Error {
    constructor(code, message) {
      super(message);
      this.name = 'EyereadError';
      this.code = code;
    }
  }

  let nextId = 1;
  async function call(permission, method, params) {
    const reply = await send({
      type: 'call',
      id: nextId++,
      permission,
      method,
      params: params ?? {},
    });
    if (!reply.ok) throw new EyereadError(reply.error.code, reply.error.message);
    return reply.value;
  }

  const handlers = new Map();
  let accepting = true;
  const settingsListeners = new Set();
  const stateListeners = new Set();

  const settingsApi = Object.freeze({
    get: () => call(null, 'settings.get', {}),
    onChange(callback) {
      settingsListeners.add(callback);
      return () => settingsListeners.delete(callback);
    },
  });

  function bodyBytes(body) {
    if (body == null) return null;
    if (typeof body === 'string') return encoder.encode(body);
    if (body instanceof ArrayBuffer) return new Uint8Array(body);
    if (ArrayBuffer.isView(body))
      return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    throw new EyereadError(
      'E_INVALID_ARGUMENT',
      'body must be a string, Uint8Array or ArrayBuffer'
    );
  }

  function netApi(permission) {
    return Object.freeze({
      async fetch(url, init = {}) {
        const body = bodyBytes(init.body);
        const r = await call(permission, 'net.fetch', {
          url: String(url),
          method: init.method ?? 'GET',
          headers: init.headers ?? {},
          body: body ? toBase64(body) : null,
          timeoutMs: init.timeoutMs ?? 15000,
        });
        const bytes = fromBase64(r.body);
        return Object.freeze({
          ok: r.status >= 200 && r.status < 300,
          status: r.status,
          url: r.url,
          headers: Object.freeze({ ...r.headers }),
          text: async () => decoder.decode(bytes),
          json: async () => $parse(decoder.decode(bytes)),
          bytes: async () => bytes.slice(),
        });
      },
    });
  }

  let init = null;

  /** A handler's context: its own permission's API, settings, and net if declared. */
  function contextFor(permission) {
    const c = (method, params) => call(permission, method, params);
    const control = (action, extra) =>
      c('prompter.control', { action, ...extra }).then(() => {});
    const ctx = { settings: settingsApi };
    if (init.sandbox.network) ctx.net = netApi(permission);
    switch (permission) {
      case 'scripts:write':
        ctx.scripts = Object.freeze({ add: (script) => c('scripts.add', script) });
        break;
      case 'prompter:load':
        ctx.prompter = Object.freeze({ load: (script) => c('prompter.load', script) });
        break;
      case 'prompter:control':
        ctx.prompter = Object.freeze({
          play: () => control('play'),
          pause: () => control('pause'),
          toggle: () => control('toggle'),
          restart: () => control('restart'),
          close: () => control('close'),
          seek: (wordIndex) => control('seek', { wordIndex }),
        });
        break;
      case 'prompter:events':
        ctx.prompter = Object.freeze({
          getState: () => c('prompter.getState', {}),
          onState(callback) {
            stateListeners.add(callback);
            if (stateListeners.size === 1) c('prompter.subscribe', {}).catch(() => {});
            c('prompter.getState', {}).then(callback, () => {});
            return () => {
              stateListeners.delete(callback);
              if (stateListeners.size === 0) c('prompter.unsubscribe', {}).catch(() => {});
            };
          },
        });
        break;
      case 'files:import':
        ctx.files = Object.freeze({
          async import(options = {}) {
            const f = await c('files.import', {
              accept: options.accept,
              maxBytes: options.maxBytes,
            });
            if (!f) return null;
            const bytes = fromBase64(f.data);
            return Object.freeze({
              name: f.name,
              type: f.type,
              size: f.size,
              text: async () => decoder.decode(bytes),
              bytes: async () => bytes.slice(),
            });
          },
        });
        break;
    }
    return Object.freeze(ctx);
  }

  // ---- logging -----------------------------------------------------------------
  const format = (arg) => {
    let text;
    if (typeof arg === 'string') text = arg;
    else if (arg instanceof Error) text = `${arg.name}: ${arg.message}`;
    else {
      try {
        text = $stringify(arg) ?? String(arg);
      } catch {
        text = String(arg);
      }
    }
    return text.length > MAX_ARG ? text.slice(0, MAX_ARG) : text;
  };
  for (const level of ['debug', 'log', 'info', 'warn', 'error']) {
    console[level] = (...args) =>
      sendQuietly({
        type: 'log',
        level: level === 'log' ? 'info' : level,
        args: args.slice(0, 32).map(format),
      });
  }
  const reportError = (error, fatal) =>
    sendQuietly({
      type: 'error',
      message: format(error?.message ?? error ?? 'Unknown error'),
      stack: typeof error?.stack === 'string' ? error.stack.slice(0, 16384) : undefined,
      fatal,
    });
  globalThis.addEventListener('error', (e) => reportError(e.error ?? e.message, false));
  globalThis.addEventListener('unhandledrejection', (e) => reportError(e.reason, false));

  // ---- events (and heartbeat) ----------------------------------------------------
  function dispatch(message) {
    if (message.type !== 'event') return;
    const listeners =
      message.name === 'settings.changed'
        ? settingsListeners
        : message.name === 'prompter.state'
          ? stateListeners
          : null;
    for (const callback of listeners ?? []) {
      try {
        callback(message.data);
      } catch (e) {
        reportError(e, false);
      }
    }
  }
  async function poll() {
    for (;;) {
      try {
        const res = await $fetch('./events');
        for (const message of $parse(await res.text())) dispatch(message);
      } catch {
        await new Promise((resolve) => $setTimeout(resolve, 1000));
      }
    }
  }

  // ---- start ---------------------------------------------------------------------
  async function start() {
    init = $parse(await (await $fetch('./init')).text());
    const api = {
      apiVersion: 1,
      pack: Object.freeze({ ...init.pack }),
      settings: settingsApi,
      net: init.sandbox.network ? netApi(init.sandbox.permissions[0]) : undefined,
      // Handlers must be registered while `main` first evaluates.
      on(permission, handler) {
        if (accepting && typeof handler === 'function')
          handlers.set(String(permission), handler);
      },
    };
    Object.defineProperty(globalThis, 'eyeread', { value: Object.freeze(api) });
    poll();
    try {
      // An absolute URL: with an opaque origin this script counts as
      // cross-origin, so a relative specifier would have no base (Chromium).
      await import(new URL(`pack/${init.main}`, location.href).href);
    } catch (e) {
      await reportError(e, true);
      return;
    }
    accepting = false;
    const reply = await send({ type: 'ready', handlers: [...handlers.keys()] });
    for (const permission of reply.activate ?? []) {
      try {
        await handlers.get(permission)(contextFor(permission));
      } catch (e) {
        reportError(e, false);
      }
    }
  }

  start().catch((e) => reportError(e, true));
})();
