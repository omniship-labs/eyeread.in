// Test fixture.
eyeread.on('prompter:control', ({ prompter, keys }) => {
  keys?.onKey((e) => {
    if (e.type === 'down' && e.code === 'ArrowRight') prompter.advance(1);
  });
});
