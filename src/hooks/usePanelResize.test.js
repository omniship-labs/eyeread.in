import { describe, it, expect } from 'vitest';
import { clampSize, SIZE_MIN, SIZE_MAX } from './usePanelResize';

describe('clampSize', () => {
  it('passes through sizes in range, rounded', () => {
    expect(clampSize({ w: 560.4, h: 168.6 })).toEqual({ w: 560, h: 169 });
  });
  it('clamps below the minimum', () => {
    expect(clampSize({ w: 10, h: 10 })).toEqual({ w: SIZE_MIN.w, h: SIZE_MIN.h });
  });
  it('clamps above the maximum', () => {
    expect(clampSize({ w: 9999, h: 9999 })).toEqual({ w: SIZE_MAX.w, h: SIZE_MAX.h });
  });
});
