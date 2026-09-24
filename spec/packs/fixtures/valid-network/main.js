// Test fixture.
eyeread.on('scripts:write', async ({ scripts, net, settings }) => {
  const { pageId } = await settings.get();
  const res = await net.fetch(`https://api.notion.com/v1/pages/${pageId}`);
  await scripts.add({ title: 'From Notion', text: await res.text() });
});

eyeread.on('prompter:control', () => {});
eyeread.on('prompter:events', ({ prompter }) => {
  prompter.onState((state) => console.log(state.wordIndex));
});
