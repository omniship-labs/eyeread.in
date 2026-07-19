import { useCallback, useEffect, useRef, useState, createElement } from 'react';
import { tours, toursForWindow, tourStepKey } from '../lib/tours';
import { TourTip } from '../components/TourTip';

/**
 * useTour — single source of truth for a window's tour-tip run.
 *
 * `windowName` selects which tours in the registry apply ('main' | 'overlay').
 * `settings`/`patchSettings` are the window's existing global-settings state
 * and patch function (MainWindow's `applySettings`, OverlayWindow's
 * `patchSettings`) — tour dismissal is just another settings field
 * (`seenTourSteps`), persisted the same way everything else is.
 *
 * `opts.active` gates whether a run is allowed to be visible right now (the
 * window is focused/visible — see the callers in MainWindow/OverlayWindow).
 * When it flips to false mid-run, the tooltip is hidden but the run's
 * position is preserved in this hook's state, so it resumes once `active`
 * is true again — it is never restarted or discarded.
 *
 * Seen-state is tracked per STEP (`${tourId}:${stepId}` in
 * `settings.seenTourSteps`), not per tour, so a step later added to an
 * already-finished tour surfaces on its own (see src/lib/tours.js).
 *
 * @returns { tourOverlay, replayTour }
 *   tourOverlay — JSX to render somewhere in the tree (null when nothing to show)
 *   replayTour(id) — force-run a specific tour's full step list on demand,
 *     ignoring seen-state (for a "Replay tour" Settings entry)
 */
export function useTour(windowName, settings, patchSettings, opts = {}) {
  const { active = true } = opts;
  const [runTourId, setRunTourId] = useState(null);
  const [runSteps, setRunSteps] = useState([]);
  const [runIndex, setRunIndex] = useState(0);
  // Only ever attempt one auto-start per mount — finishing/skipping a tour
  // shouldn't immediately chain into the next unseen one in the same
  // session; that reads as nagging rather than onboarding.
  const startedRef = useRef(false);

  const seenRef = useRef(settings.seenTourSteps || []);
  useEffect(() => {
    seenRef.current = settings.seenTourSteps || [];
  }, [settings.seenTourSteps]);

  useEffect(() => {
    if (!active || runTourId || startedRef.current) return;
    const seen = new Set(seenRef.current);
    for (const tour of toursForWindow(windowName)) {
      const unseen = tour.steps.filter((s) => !seen.has(tourStepKey(tour.id, s.id)));
      if (unseen.length > 0) {
        startedRef.current = true;
        setRunTourId(tour.id);
        setRunSteps(unseen);
        setRunIndex(0);
        return;
      }
    }
  }, [active, runTourId, windowName]);

  const finish = useCallback(() => {
    setRunTourId((id) => {
      const tour = tours.find((t) => t.id === id);
      if (tour) {
        const seen = new Set(seenRef.current);
        let changed = false;
        for (const s of tour.steps) {
          const key = tourStepKey(tour.id, s.id);
          if (!seen.has(key)) {
            seen.add(key);
            changed = true;
          }
        }
        if (changed) patchSettings({ seenTourSteps: Array.from(seen) }, false);
      }
      return null;
    });
    setRunSteps([]);
    setRunIndex(0);
  }, [patchSettings]);

  const next = useCallback(() => {
    setRunIndex((i) => {
      if (i + 1 < runSteps.length) return i + 1;
      finish();
      return i;
    });
  }, [runSteps.length, finish]);

  const back = useCallback(() => {
    setRunIndex((i) => Math.max(0, i - 1));
  }, []);

  const skip = useCallback(() => finish(), [finish]);

  const replayTour = useCallback(
    (id) => {
      const tour = tours.find((t) => t.id === id && t.window === windowName);
      if (!tour) return;
      startedRef.current = true; // don't let auto-start race a manual replay
      setRunTourId(tour.id);
      setRunSteps(tour.steps);
      setRunIndex(0);
    },
    [windowName]
  );

  const currentStep = runSteps[runIndex] || null;

  const tourOverlay =
    active && currentStep
      ? createElement(TourTip, {
          step: currentStep,
          stepNumber: runIndex + 1,
          stepCount: runSteps.length,
          onNext: next,
          onBack: runIndex > 0 ? back : null,
          onSkip: skip,
        })
      : null;

  return { tourOverlay, replayTour };
}
