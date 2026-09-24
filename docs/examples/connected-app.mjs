#!/usr/bin/env node
// Minimal eyeread.in connected app (Node 18+, no dependencies). See ../PACKS.md.
//
//   node docs/examples/connected-app.mjs "Text to read"   # load text into the prompter
//   node docs/examples/connected-app.mjs --follow         # print reading progress
//
// First run pairs with the app (approve the prompt in eyeread.in) and saves the
// token to ~/.eyeread-example-token. Delete that file to pair again.
import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const API = 'http://127.0.0.1:17842';
const TOKEN_FILE = join(homedir(), '.eyeread-example-token');
const NAME = 'Example connected app';
const SCOPES = ['prompter:load', 'prompter:events'];

async function call(path, { token, body, method = body ? 'POST' : 'GET' } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.ok) throw Object.assign(new Error(json.error), { status: res.status });
  return json;
}

async function pair() {
  console.log(`Asking eyeread.in to approve "${NAME}"… (check the app)`);
  const { token } = await call('/v1/pair', { body: { name: NAME, scopes: SCOPES } });
  await writeFile(TOKEN_FILE, token, { mode: 0o600 });
  return token;
}

async function getToken() {
  try {
    const token = (await readFile(TOKEN_FILE, 'utf8')).trim();
    await call('/v1/me', { token }); // still valid?
    return token;
  } catch (e) {
    if (e.code !== 'ENOENT' && e.status !== 401) throw e;
    return pair();
  }
}

async function follow(token) {
  const res = await fetch(`${API}/v1/prompter/events`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let end;
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const message = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const data = message.split('\n').find((l) => l.startsWith('data: '));
      if (!data) continue; // keepalive
      const s = JSON.parse(data.slice(6));
      console.log(
        s.sessionActive
          ? `${s.playing ? '▶' : '⏸'} ${s.title} — word ${s.wordIndex + 1}/${s.wordCount}`
          : '(prompter closed)'
      );
    }
  }
}

try {
  await call('/v1'); // is the API on?
} catch {
  console.error(
    'eyeread.in is not reachable. Is it running, with Settings → Packs → Connected apps on?'
  );
  process.exit(1);
}

const token = await getToken();
const arg = process.argv[2];
if (arg === '--follow') {
  await follow(token);
} else {
  const text =
    arg || 'Hello from an eyeread.in connected app. This text was sent over the local API.';
  const { scriptId } = await call('/v1/prompter/load', {
    token,
    body: { title: 'From the example connected app', text },
  });
  console.log(`Loaded script ${scriptId} into the prompter.`);
}
