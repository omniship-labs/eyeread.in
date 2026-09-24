// The packs spec must hold together: every fixture's pack.json passes or fails
// pack.schema.json exactly as fixtures/expected.json says, every error code the
// fixtures expect is defined, and sample protocol messages match their schema.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';

const dir = new URL('.', import.meta.url).pathname;
const readJson = (path) => JSON.parse(readFileSync(join(dir, path), 'utf8'));

const packSchema = readJson('pack.schema.json');
const filesSchema = readJson('files.schema.json');
const protocolSchema = readJson('protocol.schema.json');
const errors = readJson('errors.json');
const { fixtures } = readJson('fixtures/expected.json');

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  strictRequired: false,
  strictTypes: false,
  allowUnionTypes: true,
});
ajv.addSchema(packSchema, 'pack.schema.json');
ajv.addSchema(filesSchema, 'files.schema.json');
const validatePack = ajv.getSchema('pack.schema.json');
const validateFiles = ajv.getSchema('files.schema.json');
const validateMessage = ajv.compile(protocolSchema);

function listFiles(root, prefix = '') {
  return readdirSync(join(root, prefix)).flatMap((name) => {
    const rel = prefix ? `${prefix}/${name}` : name;
    return statSync(join(root, rel)).isDirectory() ? listFiles(root, rel) : [rel];
  });
}

describe('fixtures', () => {
  const folders = readdirSync(join(dir, 'fixtures')).filter((name) =>
    statSync(join(dir, 'fixtures', name)).isDirectory()
  );

  it('every folder has an expected result, and every expected result has a folder', () => {
    expect(folders.sort()).toEqual(Object.keys(fixtures).sort());
  });

  it('valid fixtures expect no error; invalid ones name a defined code', () => {
    for (const [name, want] of Object.entries(fixtures)) {
      if (want.valid) expect(want.error, name).toBeNull();
      else expect(errors.validation, name).toHaveProperty(want.error);
      if (want.runtime) expect(errors.runtime, name).toHaveProperty(want.runtime.error);
    }
  });

  for (const [name, want] of Object.entries(fixtures)) {
    it(`${name}: pack.json schema result is ${want.schema}`, () => {
      const path = join(dir, 'fixtures', name, 'pack.json');
      if (want.schema === null) {
        const readable =
          existsSync(path) &&
          (() => {
            try {
              JSON.parse(readFileSync(path, 'utf8'));
              return true;
            } catch {
              return false;
            }
          })();
        expect(readable).toBe(false);
        return;
      }
      const ok = validatePack(JSON.parse(readFileSync(path, 'utf8')));
      expect(ok, JSON.stringify(validatePack.errors)).toBe(want.schema);
      // Schema failures behind a specific code must fail at the field that code names.
      const field = { PACK_NETWORK_SITE: /\/network\/\d+$/, PACK_LICENSE: /^\/license$/ }[
        want.error
      ];
      if (field) expect(validatePack.errors.some((e) => field.test(e.instancePath))).toBe(true);
    });
  }

  it('every pack.json inside a bundle is schema-valid', () => {
    for (const name of folders) {
      const packs = join(dir, 'fixtures', name, 'packs');
      if (!existsSync(packs)) continue;
      for (const id of readdirSync(packs)) {
        const manifest = JSON.parse(readFileSync(join(packs, id, 'pack.json'), 'utf8'));
        expect(validatePack(manifest), `${name}/packs/${id}`).toBe(true);
        expect(manifest.id).toBe(id);
      }
    }
  });

  it('files.json fixtures match the schema and the canonical form', () => {
    for (const name of ['valid-files-json', 'invalid-files-json-mismatch']) {
      const raw = readFileSync(join(dir, 'fixtures', name, 'files.json'), 'utf8');
      const value = JSON.parse(raw);
      expect(validateFiles(value), JSON.stringify(validateFiles.errors)).toBe(true);
      const sorted = Object.fromEntries(
        Object.entries(value.files).sort(([a], [b]) => (a < b ? -1 : 1))
      );
      const canonical = {
        format: value.format,
        id: value.id,
        version: value.version,
        files: sorted,
      };
      expect(raw).toBe(JSON.stringify(canonical, null, 2) + '\n');
    }
  });

  it('valid-files-json lists exactly the files present, with matching hashes', () => {
    const root = join(dir, 'fixtures', 'valid-files-json');
    const { files } = JSON.parse(readFileSync(join(root, 'files.json'), 'utf8'));
    const onDisk = listFiles(root).filter(
      (p) => p !== 'files.json' && p !== 'files.json.minisig'
    );
    expect(Object.keys(files).sort()).toEqual(onDisk.sort());
    for (const path of onDisk) {
      const hash = createHash('sha256')
        .update(readFileSync(join(root, path)))
        .digest('hex');
      expect(files[path], path).toBe(hash);
    }
  });

  it('invalid-files-json-mismatch really mismatches', () => {
    const root = join(dir, 'fixtures', 'invalid-files-json-mismatch');
    const { files } = JSON.parse(readFileSync(join(root, 'files.json'), 'utf8'));
    const hash = createHash('sha256')
      .update(readFileSync(join(root, 'main.js')))
      .digest('hex');
    expect(files['main.js']).not.toBe(hash);
  });
});

describe('protocol messages', () => {
  const good = [
    {
      v: 1,
      type: 'init',
      apiVersion: 1,
      pack: { id: 'com.example.a', version: '1.0.0', name: 'A' },
      sandbox: {
        id: 'com.example.a#offline',
        permissions: ['prompter:control'],
        network: false,
      },
      settings: { autoOpen: true },
    },
    { v: 1, type: 'ready', handlers: ['prompter:control'] },
    { v: 1, type: 'activate', permission: 'prompter:control' },
    {
      v: 1,
      type: 'call',
      id: 7,
      permission: 'prompter:control',
      method: 'prompter.control',
      params: { action: 'pause' },
    },
    { v: 1, type: 'call', id: 8, permission: null, method: 'settings.get', params: {} },
    { v: 1, type: 'result', id: 7, ok: true, value: null },
    {
      v: 1,
      type: 'result',
      id: 8,
      ok: false,
      error: { code: 'E_NO_SESSION', message: "The prompter isn't open." },
    },
    { v: 1, type: 'event', name: 'settings.changed', data: { autoOpen: false } },
    { v: 1, type: 'log', level: 'info', args: ['hello'] },
    { v: 1, type: 'error', message: 'boom', fatal: true },
    { v: 1, type: 'ping', seq: 1 },
    { v: 1, type: 'pong', seq: 1 },
  ];
  const bad = [
    { v: 2, type: 'ping', seq: 1 },
    {
      v: 1,
      type: 'call',
      id: 0,
      permission: 'prompter:control',
      method: 'prompter.control',
      params: {},
    },
    {
      v: 1,
      type: 'call',
      id: 1,
      permission: 'clipboard:read',
      method: 'prompter.control',
      params: {},
    },
    { v: 1, type: 'call', id: 1, permission: null, method: 'app.eval', params: {} },
    { v: 1, type: 'result', id: 1, ok: true },
    { v: 1, type: 'result', id: 1, ok: false, value: 1 },
    { v: 1, type: 'result', id: 1, ok: false, error: { code: 'E_WHATEVER', message: '' } },
    { v: 1, type: 'log', level: 'trace', args: [] },
    { v: 1, type: 'ready', handlers: ['prompter:control'], extra: true },
  ];

  it.each(good.map((m) => [m.type, m]))('accepts %s', (_, message) => {
    expect(validateMessage(message), JSON.stringify(validateMessage.errors)).toBe(true);
  });
  it.each(bad.map((m, i) => [i, m]))('rejects bad message %i', (_, message) => {
    expect(validateMessage(message)).toBe(false);
  });

  it('runtime error codes in the schema match errors.json', () => {
    const codes = protocolSchema.$defs.result.properties.error.properties.code.enum;
    expect(codes.sort()).toEqual(Object.keys(errors.runtime).sort());
  });
});
