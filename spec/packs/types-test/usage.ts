// Compile-only checks for eyeread.d.ts (`npm run spec:types`). Each
// `@ts-expect-error` line must fail to type-check, or tsc reports it.

eyeread.on('scripts:write', async ({ scripts, net, settings }) => {
  const values = await settings.get();
  const pageId = String(values.pageId ?? '');
  if (net) {
    const res = await net.fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'GET',
      headers: { 'Notion-Version': '2022-06-28' },
      timeoutMs: 10_000,
    });
    const page = await res.json<{ title: string }>();
    const { scriptId } = await scripts.add({ title: page.title, text: await res.text() });
    scriptId.toUpperCase();
  }
});

eyeread.on('prompter:control', async ({ prompter }) => {
  await prompter.seek(10);
  await prompter.pause();
  // @ts-expect-error: control handlers don't get load()
  prompter.load({ text: 'x' });
});

eyeread.on('prompter:events', ({ prompter }) => {
  const stop = prompter.onState((state) => {
    if (state.sessionActive && state.title !== null) state.title.trim();
  });
  stop();
});

eyeread.on('prompter:load', ({ prompter }) => {
  prompter.load({ text: 'Hello', language: 'en-US' });
});

eyeread.on('files:import', async ({ files }) => {
  const file = await files.import({ accept: ['.md'], maxBytes: 1024 });
  if (file) {
    const bytes: Uint8Array = await file.bytes();
    bytes.byteLength.toFixed();
  }
});

// @ts-expect-error: scripts:write handlers don't get the prompter
eyeread.on('scripts:write', ({ prompter }) => prompter);

// @ts-expect-error: unknown permission
eyeread.on('clipboard:read', () => {});

const version: 1 = eyeread.apiVersion;
version.toFixed();
eyeread.settings.onChange((values) => Object.keys(values));

function isEyereadError(err: unknown): err is Eyeread.EyereadError {
  return err instanceof Error && 'code' in err;
}
isEyereadError(new Error('x'));

eyeread.on('prompter:control', async ({ prompter, keys, mouse }) => {
  await prompter.advance(1);
  await prompter.advance(-5);
  // @ts-expect-error: keys is absent until the user allows input
  keys.onKey(() => {});
  keys?.onKey((e) => {
    if (e.type === 'down' && !e.repeat && e.code === 'ArrowRight' && !e.modifiers.ctrl) {
      void prompter.advance(1);
    }
    // @ts-expect-error: no typed character is delivered
    e.key;
  });
  mouse?.onButton((e) => e.button.toFixed());
  mouse?.onWheel?.((e) => e.deltaY.toFixed());
  mouse?.onMove?.((e) => e.x + e.y);
});

eyeread.on('prompter:events', (ctx) => {
  // @ts-expect-error: only prompter:control gets input
  ctx.keys;
});
