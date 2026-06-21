/* ============================================================
   eyeread.in · marketing site — before/after demo slider
   ------------------------------------------------------------
   Drag (or tap) the handle to reveal the prompter overlay on the
   left vs. the clean recorded view on the right. Pointer events
   cover mouse + touch in one path.
   ============================================================ */

export function initDemoSlider() {
  const wrap = document.getElementById('slider');
  const reveal = document.getElementById('sliderReveal');
  const handle = document.getElementById('sliderHandle');
  if (!wrap || !reveal || !handle) return;

  let dragging = false;

  const setPos = (clientX) => {
    const r = wrap.getBoundingClientRect();
    const pct = Math.max(5, Math.min(95, ((clientX - r.left) / r.width) * 100));
    reveal.style.clipPath = `inset(0 ${(100 - pct).toFixed(1)}% 0 0)`;
    handle.style.left = `${pct.toFixed(1)}%`;
  };

  wrap.addEventListener('pointerdown', (e) => {
    dragging = true;
    wrap.setPointerCapture(e.pointerId);
    setPos(e.clientX);
  });
  wrap.addEventListener('pointermove', (e) => {
    if (dragging) setPos(e.clientX);
  });
  wrap.addEventListener('pointerup', () => {
    dragging = false;
  });
  wrap.addEventListener('pointercancel', () => {
    dragging = false;
  });

  // Sensible starting split.
  setPos(wrap.getBoundingClientRect().left + wrap.getBoundingClientRect().width * 0.6);
}

export default initDemoSlider;
