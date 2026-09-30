// Test fixture.
eyeread.on('prompter:control', async ({ prompter }) => {
  await prompter.pause();
});
