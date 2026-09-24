// A stand-in for the app's `packhost:` protocol (src-tauri/src/packs/host.rs),
// for testing sandbox isolation in real browsers. It serves the same
// bootstrap, document and CSP as the app, and answers the sandbox protocol
// with fixed, harmless replies. Permission checks are Rust's job and are
// tested there; this checks what the browser itself allows a sandbox to do.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const HOST = join(ROOT, 'src-tauri/src/packs/host');
const CSP = readFileSync(join(HOST, 'csp.txt'), 'utf8').trim();
const INDEX = readFileSync(join(HOST, 'index.html'));
const BOOTSTRAP = readFileSync(join(HOST, 'bootstrap.js'));

const listen = (server) =>
  new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));

/** A server that counts every request: nothing from a sandbox should reach it. */
export async function startBeacon() {
  const hits = [];
  const server = createServer((req, res) => {
    hits.push(req.url);
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'image/gif' });
    res.end('GIF89a');
  });
  server.on('upgrade', (req, socket) => {
    hits.push(`upgrade ${req.url}`);
    socket.destroy();
  });
  const port = await listen(server);
  return { url: `http://127.0.0.1:${port}/beacon`, hits, close: () => server.close() };
}

/**
 * Serve sandboxes of the pack in `packDir`. `sandboxes` maps a token to
 * `{ permissions, network }`. Returns the server's origin, the pack's log
 * lines, and a close function.
 */
export async function startHost({ packDir, sandboxes, beaconUrl }) {
  const logs = [];
  const manifest = JSON.parse(readFileSync(join(packDir, 'pack.json'), 'utf8'));
  let origin;
  const send = (res, status, type, body, extra = {}) => {
    res.writeHead(status, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      ...extra,
    });
    res.end(body);
  };
  const server = createServer((req, res) => {
    const [, token, ...rest] = new URL(req.url, 'http://x').pathname.split('/');
    const sandbox = sandboxes[token];
    if (!sandbox) return send(res, 404, 'text/plain', 'not found');
    const resource = rest.join('/');
    const csp = { 'Content-Security-Policy': CSP.replaceAll('{base}', `${origin}/${token}`) };
    if (resource === 'index.html') return send(res, 200, 'text/html', INDEX, csp);
    if (resource === '__eyeread.js') return send(res, 200, 'text/javascript', BOOTSTRAP, csp);
    if (resource === 'init') {
      return send(
        res,
        200,
        'application/json',
        JSON.stringify({
          v: 1,
          type: 'init',
          apiVersion: 1,
          pack: { id: manifest.id, version: manifest.version, name: manifest.name },
          sandbox: { id: token, permissions: sandbox.permissions, network: sandbox.network },
          settings: {},
          main: manifest.main,
        })
      );
    }
    if (resource === 'events') {
      setTimeout(() => send(res, 200, 'application/json', '[]'), 500);
      return;
    }
    if (resource.startsWith('pack/')) {
      let body = readFileSync(join(packDir, resource.slice(5)), 'utf8');
      // Point the probe's network attempts at the beacon.
      body = body.replaceAll('https://example.com/beacon', beaconUrl);
      return send(res, 200, 'text/javascript', body, csp);
    }
    if (resource === 'rpc' && req.method === 'POST') {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        const msg = JSON.parse(raw);
        const reply = (value) => send(res, 200, 'application/json', JSON.stringify(value));
        if (msg.type === 'log') logs.push({ token, line: msg.args.join(' ') });
        if (msg.type === 'error') logs.push({ token, line: `error: ${msg.message}` });
        if (msg.type === 'ready') {
          return reply({
            activate: sandbox.permissions.filter((p) => msg.handlers.includes(p)),
          });
        }
        if (msg.type === 'call') {
          const ok = (value) => reply({ v: 1, type: 'result', id: msg.id, ok: true, value });
          const fail = (code) =>
            reply({
              v: 1,
              type: 'result',
              id: msg.id,
              ok: false,
              error: { code, message: code },
            });
          if (msg.method === 'settings.get') return ok({});
          if (msg.method === 'net.fetch') return fail('E_NETWORK_DENIED');
          if (msg.method === 'prompter.getState') {
            return ok({
              sessionActive: false,
              playing: false,
              scriptId: null,
              title: null,
              wordIndex: 0,
              wordCount: 0,
            });
          }
          return ok(null);
        }
        return reply({ ok: true });
      });
      return;
    }
    send(res, 404, 'text/plain', 'not found');
  });
  const port = await listen(server);
  origin = `http://127.0.0.1:${port}`;
  return { origin, logs, close: () => server.close() };
}
