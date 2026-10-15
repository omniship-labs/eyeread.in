// Test fixture.
eyeread.on('scripts:write', async ({ net }) => {
  await net.fetch('https://api.example.com');
});
