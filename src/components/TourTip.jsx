import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { computeTooltipPosition } from '../lib/tourPosition';
import { Button } from './Button';
import './tour-tip.less';

const HOLE_PAD = 6; // px breathing room around the target inside the spotlight
const FIND_TIMEOUT_MS = 3000; // give up on a missing target and move on

/**
 * TourTip — one dim-and-spotlight coach-mark step. Dims everything except a
 * cutout around `step.target`, with a card pointing at it. The cutout is
 * built from four bands around the target (not a single scrim + box-shadow)
 * so the dimmed regions actually intercept clicks — a box-shadow spotlight
 * would look right but wouldn't be interactive, since shadows never
 * participate in hit-testing. The cutout itself has no covering element, so
 * the real target underneath stays fully clickable.
 */
export function TourTip({ step, stepNumber, stepCount, onNext, onBack, onSkip }) {
  const { t } = useTranslation();
  const [rect, setRect] = useState(null);
  const cardRef = useRef(null);
  const [cardSize, setCardSize] = useState({ w: 280, h: 140 });
  const onNextRef = useRef(onNext);
  useLayoutEffect(() => {
    onNextRef.current = onNext;
  });

  // Locate the target, poll briefly if it isn't mounted yet, then track its
  // position across resizes/scrolls/layout changes for as long as this step
  // is showing.
  useEffect(() => {
    let cancelled = false;
    let ro = null;
    let pollId = null;
    let elapsed = 0;

    const track = (el) => {
      const update = () => !cancelled && setRect(el.getBoundingClientRect());
      update();
      ro = new ResizeObserver(update);
      ro.observe(el);
      window.addEventListener('resize', update);
      window.addEventListener('scroll', update, true);
      return () => {
        ro.disconnect();
        window.removeEventListener('resize', update);
        window.removeEventListener('scroll', update, true);
      };
    };

    let untrack = null;
    const poll = () => {
      if (cancelled) return;
      const el = document.querySelector(step.target);
      if (el) {
        untrack = track(el);
        return;
      }
      elapsed += 150;
      if (elapsed >= FIND_TIMEOUT_MS) {
        onNextRef.current(); // target never showed up — don't block the tour on it
        return;
      }
      pollId = setTimeout(poll, 150);
    };
    poll();

    return () => {
      cancelled = true;
      if (pollId) clearTimeout(pollId);
      untrack?.();
    };
  }, [step.target]);

  // Measure the card's actual rendered size (title/body length varies) so
  // positioning accounts for real dimensions, not a guess. Re-measures once
  // per step — depending on cardSize itself would self-trigger forever.
  useLayoutEffect(() => {
    if (!cardRef.current) return;
    const { width, height } = cardRef.current.getBoundingClientRect();
    if (width && height) setCardSize({ w: width, h: height });
  }, [step]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip]);

  if (!rect) return null;

  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const hole = {
    top: rect.top - HOLE_PAD,
    left: rect.left - HOLE_PAD,
    width: rect.width + HOLE_PAD * 2,
    height: rect.height + HOLE_PAD * 2,
  };
  const pos = computeTooltipPosition(hole, step.placement, cardSize, viewport);

  return (
    <>
      <div className="tt-band tt-band-top" style={{ height: Math.max(0, hole.top) }} />
      <div
        className="tt-band tt-band-bottom"
        style={{
          top: hole.top + hole.height,
          height: Math.max(0, viewport.height - (hole.top + hole.height)),
        }}
      />
      <div
        className="tt-band tt-band-left"
        style={{ top: hole.top, height: hole.height, width: Math.max(0, hole.left) }}
      />
      <div
        className="tt-band tt-band-right"
        style={{
          top: hole.top,
          height: hole.height,
          left: hole.left + hole.width,
          width: Math.max(0, viewport.width - (hole.left + hole.width)),
        }}
      />
      <div
        className="tt-ring"
        style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
        aria-hidden="true"
      />
      <div
        ref={cardRef}
        className={`tt-card tt-arrow-${pos.arrowSide}`}
        style={{
          top: pos.y,
          left: pos.x,
          '--tt-arrow-offset': `${pos.arrowOffset}px`,
        }}
        role="dialog"
        aria-label={t(step.titleKey)}
        aria-live="polite"
      >
        <button type="button" className="tt-close" aria-label={t('tour.skip')} onClick={onSkip}>
          <X size={14} />
        </button>
        <div className="tt-title">{t(step.titleKey)}</div>
        <p className="tt-body">{t(step.bodyKey)}</p>
        <div className="tt-foot">
          <span className="tt-count">
            {t('tour.stepOf', { current: stepNumber, total: stepCount })}
          </span>
          <span className="tt-actions">
            {onBack && (
              <Button size="sm" variant="ghost" onClick={onBack}>
                {t('tour.back')}
              </Button>
            )}
            <Button size="sm" variant="primary" onClick={onNext} autoFocus>
              {stepNumber === stepCount ? t('tour.done') : t('tour.next')}
            </Button>
          </span>
        </div>
      </div>
    </>
  );
}
