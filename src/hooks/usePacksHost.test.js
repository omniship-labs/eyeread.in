import { describe, expect, it } from 'vitest';
import { callerScript } from './usePacksHost';

describe('callerScript', () => {
  it('labels a script with the pack or app that sent it', () => {
    const s = callerScript({ title: 'Keynote', text: 'Hello', language: 'en-US' }, 'draft', {
      kind: 'pack',
      id: 'com.example.notion',
      name: 'Notion Sync',
    });
    expect(s).toMatchObject({
      title: 'Keynote',
      text: 'Hello',
      tag: 'draft',
      language: 'en-US',
      source: { kind: 'pack', id: 'com.example.notion', name: 'Notion Sync' },
    });
    expect(s.id).toBeTruthy();
  });

  it('leaves scripts without a caller unlabelled', () => {
    expect(callerScript({ title: 'T', text: 'x', language: null }, 'ready')).not.toHaveProperty(
      'source'
    );
  });
});
