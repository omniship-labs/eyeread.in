// Test fixture.
let prompter;
eyeread.on('prompter:control', (ctx) => {
  prompter = ctx.prompter;
});
eyeread.on('input:keyboard', ({ keys, settings }) => {
  keys.onKey(async (e) => {
    const { advanceKey } = await settings.get();
    if (e.type === 'down' && e.code === advanceKey && prompter) await prompter.toggle();
  });
});
eyeread.on('input:mouse', ({ mouse }) => mouse.onWheel(() => {}));
eyeread.on('input:midi', ({ midi }) => midi.onMessage(() => {}));
eyeread.on('input:gamepad', ({ gamepad }) => gamepad.onButton(() => {}));
