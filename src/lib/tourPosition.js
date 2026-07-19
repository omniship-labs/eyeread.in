// Pure positioning calc for TourTip — kept dependency-free (no floating-ui
// etc.) since this is a small, browser-window-scoped placement problem.

const GAP = 12; // space between target and tooltip card
const MARGIN = 8; // min distance from the viewport edge
const ARROW_INSET = 14; // min distance from a corner the arrow can sit

/**
 * Compute where a tooltip card should sit relative to a target rect, plus
 * where its arrow should point along the resulting box edge.
 *
 * @param targetRect { top, left, width, height }
 * @param placement  'top' | 'bottom' | 'left' | 'right'
 * @param tooltipSize { w, h }
 * @param viewport   { width, height }
 * @returns { x, y, arrowSide, arrowOffset }
 *   x, y        — top-left of the tooltip card, clamped inside the viewport
 *   arrowSide   — which edge of the card the arrow is drawn on
 *   arrowOffset — px from that edge's start to the arrow's center
 */
export function computeTooltipPosition(targetRect, placement, tooltipSize, viewport) {
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  let x, y, arrowSide;
  if (placement === 'top') {
    x = targetCenterX - tooltipSize.w / 2;
    y = targetRect.top - GAP - tooltipSize.h;
    arrowSide = 'bottom';
  } else if (placement === 'bottom') {
    x = targetCenterX - tooltipSize.w / 2;
    y = targetRect.top + targetRect.height + GAP;
    arrowSide = 'top';
  } else if (placement === 'left') {
    x = targetRect.left - GAP - tooltipSize.w;
    y = targetCenterY - tooltipSize.h / 2;
    arrowSide = 'right';
  } else {
    // 'right'
    x = targetRect.left + targetRect.width + GAP;
    y = targetCenterY - tooltipSize.h / 2;
    arrowSide = 'left';
  }

  const clampedX = clamp(x, MARGIN, viewport.width - tooltipSize.w - MARGIN);
  const clampedY = clamp(y, MARGIN, viewport.height - tooltipSize.h - MARGIN);

  const arrowOffset =
    arrowSide === 'top' || arrowSide === 'bottom'
      ? clamp(targetCenterX - clampedX, ARROW_INSET, tooltipSize.w - ARROW_INSET)
      : clamp(targetCenterY - clampedY, ARROW_INSET, tooltipSize.h - ARROW_INSET);

  return { x: clampedX, y: clampedY, arrowSide, arrowOffset };
}

function clamp(v, min, max) {
  // A tooltip bigger than the viewport (min > max) still needs a defined
  // position — fall back to the smaller bound rather than producing NaN or
  // an inverted range.
  return max < min ? min : Math.min(max, Math.max(min, v));
}
