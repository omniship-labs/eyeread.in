import { describe, expect, it } from 'vitest';
import {
  acceptAttribute,
  callerSource,
  controlAttribution,
  importPayload,
  PackCallError,
} from './packs';

describe('attribution', () => {
  it('names the pack or app behind a transport action', () => {
    expect(controlAttribution('pause', { kind: 'pack', id: 'p', name: 'Foot Pedal' })).toEqual({
      key: 'packs.attribution.pause',
      params: { name: 'Foot Pedal' },
    });
    expect(controlAttribution('seek', { kind: 'app', id: 'a', name: 'Deck' }).key).toBe(
      'packs.attribution.seek'
    );
    // Closing hides the overlay, and a caller without a name can't be credited.
    expect(controlAttribution('close', { name: 'X' })).toBeNull();
    expect(controlAttribution('pause', null)).toBeNull();
  });

  it('records where a script came from', () => {
    expect(
      callerSource({ kind: 'pack', id: 'com.example.notion', name: 'Notion', extra: 1 })
    ).toEqual({
      kind: 'pack',
      id: 'com.example.notion',
      name: 'Notion',
    });
    expect(callerSource(undefined)).toBeNull();
  });
});

describe('files:import', () => {
  const file = (text, extra = {}) =>
    Object.assign(new File([text], 'notes.md', { type: 'text/markdown' }), extra);

  it('passes on only the chosen file: name, type and contents', async () => {
    // Even if the File object carried a path (Electron-style), it isn't sent.
    const payload = await importPayload(file('hello', { path: '/Users/ada/notes.md' }), 1024);
    expect(payload).toEqual({ name: 'notes.md', type: 'text/markdown', data: 'aGVsbG8=' });
  });

  it('refuses a file over the limit', async () => {
    await expect(importPayload(file('hello'), 4)).rejects.toBeInstanceOf(PackCallError);
    await expect(importPayload(file('hello'), 4)).rejects.toMatchObject({
      code: 'file_too_large',
    });
  });

  it('builds the picker filter from the pack’s extensions', () => {
    expect(acceptAttribute(['.md', '.txt'])).toBe('.md,.txt');
    expect(acceptAttribute([])).toBeUndefined();
  });
});
