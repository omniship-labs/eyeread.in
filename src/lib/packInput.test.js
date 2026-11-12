import { describe, expect, it } from 'vitest';
import { inputPayload, isEditableTarget } from './packInput';

const all = { keyboard: true, mouse: true, position: true };
const none = { keyboard: false, mouse: false, position: false };
const key = (over = {}) => ({ code: 'ArrowRight', target: { tagName: 'DIV' }, ...over });

describe('what a window reports to packs', () => {
  it('never reports keys typed into a text field', () => {
    for (const target of [
      { tagName: 'INPUT' },
      { tagName: 'textarea' },
      { tagName: 'SELECT' },
      { tagName: 'DIV', isContentEditable: true },
    ]) {
      expect(isEditableTarget(target)).toBe(true);
      expect(inputPayload('keydown', key({ target }), all)).toBeNull();
    }
    expect(isEditableTarget({ tagName: 'DIV' })).toBe(false);
  });

  it('ignores IME composition and keys with no code', () => {
    expect(inputPayload('keydown', key({ isComposing: true }), all)).toBeNull();
    expect(inputPayload('keydown', key({ code: '' }), all)).toBeNull();
  });

  it('reports the physical key and modifiers, not the character', () => {
    const p = inputPayload('keydown', key({ key: 'x', shiftKey: true, repeat: true }), all);
    expect(p).toEqual({
      kind: 'key',
      data: {
        type: 'down',
        code: 'ArrowRight',
        modifiers: { ctrl: false, shift: true, alt: false, meta: false },
        repeat: true,
      },
    });
    expect(JSON.stringify(p)).not.toContain('"x"');
    expect(inputPayload('keyup', key(), all).data.type).toBe('up');
  });

  it('sends nothing when no pack is listening', () => {
    expect(inputPayload('keydown', key(), none)).toBeNull();
    expect(inputPayload('mousedown', { button: 0 }, none)).toBeNull();
    expect(inputPayload('wheel', { deltaX: 0, deltaY: 5 }, none)).toBeNull();
    expect(inputPayload('mousemove', { screenX: 1, screenY: 2 }, none, 1000, 0)).toBeNull();
  });

  it('reports mouse buttons and the wheel', () => {
    expect(inputPayload('mouseup', { button: 3 }, all).data).toMatchObject({
      type: 'up',
      button: 3,
    });
    expect(inputPayload('wheel', { deltaX: 1, deltaY: -120 }, all).data).toMatchObject({
      deltaX: 1,
      deltaY: -120,
    });
  });

  it('reports pointer position only when wanted, at most about 30 times a second', () => {
    const move = { screenX: 10, screenY: 20 };
    const onlyMouse = { keyboard: false, mouse: true, position: false };
    expect(inputPayload('mousemove', move, onlyMouse, 1000, 0)).toBeNull();
    expect(inputPayload('mousemove', move, all, 1000, 990)).toBeNull();
    expect(inputPayload('mousemove', move, all, 1000, 900)).toEqual({
      kind: 'mouse.move',
      data: { x: 10, y: 20 },
    });
  });
});
