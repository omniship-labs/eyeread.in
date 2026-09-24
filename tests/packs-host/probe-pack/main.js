// Sandbox probe (tests/packs-host). Every line it logs starts with
// "probe <sandbox> <check>: <result>", so a test can read the results back.
// BEACON is replaced by the browser test with a URL it watches.
const BEACON = globalThis.__PROBE_BEACON__ || 'https://example.com/beacon';

const report = (sandbox, check, result) => console.log(`probe ${sandbox} ${check}: ${result}`);

async function outcome(fn) {
  try {
    const value = await fn();
    return `allowed${value === undefined ? '' : ` (${value})`}`;
  } catch (e) {
    return `blocked (${e?.code || e?.name || 'error'})`;
  }
}

async function probeCommon(sandbox) {
  report(sandbox, 'fetch', await outcome(() => fetch(BEACON).then((r) => r.status)));
  report(
    sandbox,
    'xhr',
    await outcome(
      () =>
        new Promise((resolve, reject) => {
          const x = new XMLHttpRequest();
          x.onload = () => resolve(x.status);
          x.onerror = () => reject(new Error('xhr'));
          x.open('GET', BEACON);
          x.send();
        })
    )
  );
  report(
    sandbox,
    'image',
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve('allowed');
      img.onerror = () => resolve('blocked');
      img.src = `${BEACON}?img`;
      setTimeout(() => resolve('blocked (timeout)'), 3000);
    })
  );
  report(
    sandbox,
    'websocket',
    await outcome(
      () =>
        new Promise((resolve, reject) => {
          const ws = new WebSocket(BEACON.replace(/^http/, 'ws'));
          ws.onopen = () => resolve('open');
          ws.onerror = () => reject(new Error('ws'));
        })
    )
  );
  report(
    sandbox,
    'top',
    window.top === window && window.parent === window ? 'is itself' : 'has a parent'
  );
  report(sandbox, 'opener', window.opener === null ? 'none' : 'present');
  report(
    sandbox,
    'popup',
    await outcome(() => {
      const w = window.open('https://example.com/');
      if (!w) throw new Error('no window');
    })
  );
  report(sandbox, 'storage', await outcome(() => localStorage.setItem('probe', sandbox)));
  report(
    sandbox,
    'indexeddb',
    await outcome(
      () =>
        new Promise((resolve, reject) => {
          const r = indexedDB.open('probe');
          r.onsuccess = () => resolve('opened');
          r.onerror = () => reject(r.error);
        })
    )
  );
  report(
    sandbox,
    'tauri',
    typeof window.__TAURI_INTERNALS__ === 'undefined' ? 'absent' : 'present'
  );
  report(
    sandbox,
    'ipc',
    await outcome(() => {
      const internals = window.__TAURI_INTERNALS__;
      if (!internals) throw new Error('no ipc');
      return internals
        .invoke('packs_list')
        .then((r) => `packs_list gave ${JSON.stringify(r).length} bytes`);
    })
  );
  report(
    sandbox,
    'ipc-plugin',
    await outcome(() => {
      const internals = window.__TAURI_INTERNALS__;
      if (!internals) throw new Error('no ipc');
      return internals.invoke('plugin:event|emit', { event: 'packs:changed', payload: null });
    })
  );
}

// Cross-sandbox messaging: each sandbox shouts on a BroadcastChannel and
// reports anything it hears from the other one.
function listen(sandbox) {
  const heard = [];
  let channel;
  try {
    channel = new BroadcastChannel('probe');
    channel.onmessage = (e) => heard.push(e.data);
    channel.postMessage(`hello from ${sandbox}`);
  } catch (e) {
    report(sandbox, 'broadcast', `blocked (${e.name})`);
    return;
  }
  setTimeout(() => {
    channel.postMessage(`hello again from ${sandbox}`);
    setTimeout(
      () => report(sandbox, 'heard', heard.length ? heard.join(' | ') : 'nothing'),
      2000
    );
  }, 1000);
}

eyeread.on('scripts:write', async (ctx) => {
  report('network', 'api', Object.keys(ctx).sort().join(','));
  report('network', 'net', typeof eyeread.net === 'object' ? 'present' : 'absent');
  report('network', 'net.fetch', await outcome(() => ctx.net.fetch('https://example.com/')));
  report(
    'network',
    'other-api',
    await outcome(() => eyeread.settings.get().then(() => 'settings ok'))
  );
  await probeCommon('network');
  listen('network');
});

eyeread.on('prompter:control', async (ctx) => {
  report(
    'offline',
    'api',
    `${Object.keys(ctx).sort().join(',')} prompter=${Object.keys(ctx.prompter).sort().join(',')}`
  );
  report('offline', 'net', typeof eyeread.net === 'undefined' ? 'absent' : 'present');
  await probeCommon('offline');
  listen('offline');
});

eyeread.on('prompter:events', async (ctx) => {
  report('offline', 'events-api', Object.keys(ctx.prompter).sort().join(','));
  report(
    'offline',
    'state',
    await outcome(() => ctx.prompter.getState().then((s) => `session=${s.sessionActive}`))
  );
});
