import { useCallback, useRef, useState } from 'react';

// min keeps the controls usable; max is just sanity — the native window
// resizes to follow the panel, so your screen is the real ceiling
export const SIZE_MIN = { w: 360, h: 110 };
export const SIZE_MAX = { w: 1600, h: 800 };

export const clampSize = (s) => ({
  w: Math.min(SIZE_MAX.w, Math.max(SIZE_MIN.w, Math.round(s.w))),
  h: Math.min(SIZE_MAX.h, Math.max(SIZE_MIN.h, Math.round(s.h))),
});

/**
 * Drag-to-resize state for the overlay glass panel.
 * `onResizeEnd(size)` fires once per gesture, for persistence.
 */
export function usePanelResize(initialSize, onResizeEnd) {
  const [panelSize, setPanelSize] = useState(() => clampSize(initialSize));
  const [resizing, setResizing] = useState(false);
  const endRef = useRef(onResizeEnd);
  endRef.current = onResizeEnd;

  const startResize = useCallback(
    (e) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setResizing(true);
      const startX = e.clientX;
      const startY = e.clientY;
      const start = panelSize;
      let latest = start;

      const onMove = (ev) => {
        latest = clampSize({
          w: start.w + (ev.clientX - startX),
          h: start.h + (ev.clientY - startY),
        });
        setPanelSize(latest);
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        setResizing(false);
        endRef.current?.(latest);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [panelSize]
  );

  return { panelSize, setPanelSize, resizing, startResize };
}
