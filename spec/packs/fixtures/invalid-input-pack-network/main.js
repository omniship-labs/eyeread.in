// Test fixture.
eyeread.on('input:keyboard', () => {});
eyeread.on('scripts:write', async ({ net }) => {
  await net.fetch('https://api.example.com');
});
