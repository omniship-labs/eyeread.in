import { describe, it, expect } from 'vitest';
import { computeTooltipPosition } from './tourPosition';

const viewport = { width: 800, height: 600 };
const tooltipSize = { w: 240, h: 120 };

describe('computeTooltipPosition', () => {
  it('places below the target for placement "bottom"', () => {
    const target = { top: 100, left: 300, width: 80, height: 30 };
    const pos = computeTooltipPosition(target, 'bottom', tooltipSize, viewport);
    expect(pos.y).toBe(100 + 30 + 12);
    expect(pos.x).toBe(300 + 40 - 120);
    expect(pos.arrowSide).toBe('top');
  });

  it('places above the target for placement "top"', () => {
    const target = { top: 200, left: 300, width: 80, height: 30 };
    const pos = computeTooltipPosition(target, 'top', tooltipSize, viewport);
    expect(pos.y).toBe(200 - 12 - 120);
    expect(pos.arrowSide).toBe('bottom');
  });

  it('places to the right of the target for placement "right"', () => {
    const target = { top: 200, left: 50, width: 40, height: 40 };
    const pos = computeTooltipPosition(target, 'right', tooltipSize, viewport);
    expect(pos.x).toBe(50 + 40 + 12);
    expect(pos.arrowSide).toBe('left');
  });

  it('places to the left of the target for placement "left"', () => {
    const target = { top: 200, left: 500, width: 40, height: 40 };
    const pos = computeTooltipPosition(target, 'left', tooltipSize, viewport);
    expect(pos.x).toBe(500 - 12 - 240);
    expect(pos.arrowSide).toBe('right');
  });

  it('clamps horizontally near the left edge and shifts the arrow instead of overflowing', () => {
    const target = { top: 100, left: 0, width: 20, height: 20 };
    const pos = computeTooltipPosition(target, 'bottom', tooltipSize, viewport);
    expect(pos.x).toBe(8); // MARGIN
    expect(pos.arrowOffset).toBeGreaterThanOrEqual(14);
    expect(pos.arrowOffset).toBeLessThanOrEqual(tooltipSize.w - 14);
  });

  it('clamps horizontally near the right edge', () => {
    const target = { top: 100, left: 780, width: 20, height: 20 };
    const pos = computeTooltipPosition(target, 'bottom', tooltipSize, viewport);
    expect(pos.x).toBe(viewport.width - tooltipSize.w - 8); // MARGIN
  });

  it('clamps vertically near the top edge', () => {
    const target = { top: 0, left: 300, width: 40, height: 20 };
    const pos = computeTooltipPosition(target, 'top', tooltipSize, viewport);
    expect(pos.y).toBe(8); // MARGIN
  });

  it('falls back to the min bound when the tooltip is larger than the viewport', () => {
    const target = { top: 100, left: 100, width: 20, height: 20 };
    const pos = computeTooltipPosition(target, 'bottom', { w: 2000, h: 2000 }, viewport);
    expect(pos.x).toBe(8);
    expect(pos.y).toBe(8);
  });
});
