import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { computeTooltipPosition } from '../lib/tourPosition';
import './tip-layer.less';

const SHOW_DELAY_MS = 450;

/**
 * TipLayer — one delegated hover-tooltip renderer per window, driven by
 * `data-tip`/`data-tip-side` attributes anywhere in that window (see
 * ShieldToggle, OverlayWindow's toolbar, Library's pin/delete, etc.).
 *
 * Replaces the native `title` attribute, which was confirmed to leak
 * through screen capture even with the window's content-protection
 * active — evidently the OS/WebView renders `title` hover-tooltips via a
 * surface separate from the window's own painted content, so it doesn't
 * inherit setAppProtected/contentProtected the way everything else does.
 * This renders the bubble as an ordinary `position: fixed` DOM node
 * mounted here, at the window root — genuinely part of the window's own
 * content layer, so it's excluded from capture exactly like the rest of
 * the UI.
 *
 * Deliberately NOT a per-element wrapper component: with 20+ tooltip
 * sites across toolbars or the per-word spans in ScriptViewer (unbounded
 * fan-out), one delegated listener plus a single positioned bubble is far
 * cheaper than one hover state + one absolutely-positioned node per
 * trigger. It also matters here specifically because several triggers sit
 * inside `overflow: hidden` containers (e.g. .ov-head) — a `position:
 * fixed` node rendered THERE would still get clipped by that ancestor;
 * mounting the bubble at the window root sidesteps that entirely.
 *
 * Accessibility (WCAG 1.4.13 + the ARIA tooltip pattern):
 *   - `aria-label` on every trigger is the primary channel (added at each
 *     call site) — the accessible name is never gated on hover/focus.
 *   - This bubble is still linked to its trigger via `aria-describedby`
 *     while shown, and Escape dismisses it without moving the
 *     pointer/focus — native `title` supports Escape too, so this isn't
 *     optional parity, it's matching what was there before.
 *   - `pointer-events: none` means the bubble never needs to be
 *     "hoverable" itself — there's nothing interactive inside it.
 */
export function TipLayer() {
  const [tip, setTip] = useState(null); // { label, rect, side, el } | null
  const bubbleRef = useRef(null);
  const [bubbleSize, setBubbleSize] = useState({ w: 0, h: 0 });
  const timerRef = useRef(null);
  const describedElRef = useRef(null);
  const bubbleId = useId();

  const describe = (el) => {
    if (!el) return;
    const existing = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (!existing.includes(bubbleId)) {
      el.setAttribute('aria-describedby', [...existing, bubbleId].join(' '));
    }
    describedElRef.current = el;
  };

  const undescribe = () => {
    const el = describedElRef.current;
    if (!el) return;
    const remaining = (el.getAttribute('aria-describedby') || '')
      .split(/\s+/)
      .filter((v) => v && v !== bubbleId);
    if (remaining.length) el.setAttribute('aria-describedby', remaining.join(' '));
    else el.removeAttribute('aria-describedby');
    describedElRef.current = null;
  };

  // Tracks whether there's currently anything to dismiss (a shown tip, or
  // one about to show), so Escape only claims the keystroke when it's
  // actually claiming something — otherwise it must fall through to
  // whatever else in the app also listens for Escape (e.g. closing the
  // overlay session), exactly as if this tooltip layer weren't here.
  const pendingRef = useRef(false);

  const closeTip = () => {
    clearTimeout(timerRef.current);
    pendingRef.current = false;
    undescribe();
    setTip(null);
  };

  useEffect(() => {
    const findTarget = (e) => e.target.closest?.('[data-tip]');

    const open = (e) => {
      const el = findTarget(e);
      if (!el || !el.getAttribute('data-tip')) return;
      if (el.contains(e.relatedTarget)) return; // moved within the same trigger, not a fresh enter
      clearTimeout(timerRef.current);
      pendingRef.current = true;
      timerRef.current = setTimeout(() => {
        describe(el);
        setTip({
          label: el.getAttribute('data-tip'),
          rect: el.getBoundingClientRect(),
          side: el.getAttribute('data-tip-side') || 'top',
        });
      }, SHOW_DELAY_MS);
    };

    const close = (e) => {
      const el = findTarget(e);
      if (!el) return;
      if (el.contains(e.relatedTarget)) return; // still within the same trigger
      closeTip();
    };

    const onKeyDown = (e) => {
      if (e.key !== 'Escape' || !pendingRef.current) return;
      // Claim the keystroke — a tooltip is the most immediate thing to
      // dismiss, so this shouldn't also trigger something else's Escape
      // handler (e.g. closing the overlay session) in the same keypress.
      e.stopPropagation();
      closeTip();
    };

    document.addEventListener('mouseover', open);
    document.addEventListener('mouseout', close);
    document.addEventListener('focusin', open);
    document.addEventListener('focusout', close);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mouseover', open);
      document.removeEventListener('mouseout', close);
      document.removeEventListener('focusin', open);
      document.removeEventListener('focusout', close);
      document.removeEventListener('keydown', onKeyDown);
      clearTimeout(timerRef.current);
      undescribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bubbleId]);

  // Measure the bubble's real rendered size once it mounts (label length
  // varies), same two-pass approach as TourTip.
  useLayoutEffect(() => {
    if (!tip || !bubbleRef.current) return;
    const { width, height } = bubbleRef.current.getBoundingClientRect();
    if (width && height) setBubbleSize({ w: width, h: height });
  }, [tip]);

  if (!tip) return null;

  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const size = bubbleSize.w ? bubbleSize : { w: 120, h: 26 }; // pre-measure guess
  const pos = computeTooltipPosition(tip.rect, tip.side, size, viewport);

  return (
    <div
      ref={bubbleRef}
      id={bubbleId}
      className="tip-bubble"
      role="tooltip"
      style={{ top: pos.y, left: pos.x }}
    >
      {tip.label}
    </div>
  );
}
