import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'eyeread:list-width';
const MIN = 220;
const MAX = 520;

export function useListResize(defaultWidth = 300) {
  const [listWidth, setListWidth] = useState(() => {
    const saved = parseInt(localStorage.getItem(STORAGE_KEY), 10);
    return saved && saved >= MIN && saved <= MAX ? saved : defaultWidth;
  });
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const handleMouseDown = useCallback(
    (e) => {
      dragging.current = true;
      startX.current = e.clientX;
      startW.current = listWidth;
      e.preventDefault();
    },
    [listWidth]
  );

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const next = Math.min(MAX, Math.max(MIN, startW.current + e.clientX - startX.current));
      setListWidth(next);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      setListWidth((w) => {
        localStorage.setItem(STORAGE_KEY, String(w));
        return w;
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  return { listWidth, handleMouseDown };
}
