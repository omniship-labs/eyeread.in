// Pack sandbox isolation (#122), in real browser engines: the probe pack
// (./probe-pack) runs in two sandboxes, each a separate page like the app's
// separate webviews, and tries everything a sandbox must not do.
import { expect, test } from '@playwright/test';
import { startBeacon, startHost } from './server.mjs';

const PACK = new URL('./probe-pack', import.meta.url).pathname;
const SANDBOXES = {
  offline0000000000000000000000000: {
    permissions: ['prompter:control', 'prompter:events'],
    network: false,
  },
  network0000000000000000000000000: { permissions: ['scripts:write'], network: true },
};

let beacon;
let host;

test.beforeAll(async () => {
  beacon = await startBeacon();
  host = await startHost({ packDir: PACK, sandboxes: SANDBOXES, beaconUrl: beacon.url });
});
test.afterAll(() => {
  host?.close();
  beacon?.close();
});

/** "probe <sandbox> <check>: <result>" lines, as { 'offline fetch': '…' }. */
function results() {
  const out = {};
  for (const { line } of host.logs) {
    const m = /^probe (\w+) ([\w.-]+): (.*)$/.exec(line);
    if (m) out[`${m[1]} ${m[2]}`] = m[3];
  }
  return out;
}

test('sandboxes are isolated from the network, each other and the app', async ({ browser }) => {
  // One browser context: the worst case, where pages could share storage.
  const context = await browser.newContext();
  for (const token of Object.keys(SANDBOXES)) {
    const page = await context.newPage();
    await page.goto(`${host.origin}/${token}/index.html`);
  }
  await expect
    .poll(() => Object.keys(results()).filter((k) => k.endsWith(' heard')).length, {
      timeout: 20000,
    })
    .toBe(2);
  const r = results();

  for (const sandbox of ['offline', 'network']) {
    for (const check of [
      'fetch',
      'xhr',
      'image',
      'websocket',
      'popup',
      'storage',
      'indexeddb',
    ]) {
      expect(r[`${sandbox} ${check}`], `${sandbox} ${check}`).toMatch(/^blocked/);
    }
    expect(r[`${sandbox} top`]).toBe('is itself');
    expect(r[`${sandbox} opener`]).toBe('none');
    // The two sandboxes of one pack can't talk to each other.
    expect(r[`${sandbox} heard`]).toBe('nothing');
  }
  // Nothing reached the network behind the sandbox's back.
  expect(beacon.hits).toEqual([]);

  // Each handler got only its own permission's API; only the network
  // sandbox has `net`, and its requests still go through the app.
  expect(r['offline api']).toBe(
    'prompter,settings prompter=close,pause,play,restart,seek,toggle'
  );
  expect(r['offline events-api']).toBe('getState,onState');
  expect(r['offline net']).toBe('absent');
  expect(r['network api']).toBe('net,scripts,settings');
  expect(r['network net']).toBe('present');
  expect(r['network net.fetch']).toBe('blocked (E_NETWORK_DENIED)');
  await context.close();
});
