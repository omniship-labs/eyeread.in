import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RotateCcw,
  Play,
  Pause,
  ChevronLeft,
  ChevronsRight,
  Settings as SettingsIcon,
  Timer as TimerIcon,
  Hourglass,
  Mic,
  MicOff,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/index.js';
import { ShieldToggle } from '../components/ShieldToggle';
import { ScriptViewer } from '../components/ScriptViewer';
import { useVoiceTracking, voiceAvailable } from '../hooks/useVoiceTracking';
import { useClickThrough } from '../hooks/useClickThrough';
import { usePanelResize, clampSize } from '../hooks/usePanelResize';
import {
  defaultSettings,
  fetchScripts,
  fetchSettings,
  persistSettings,
  resolveSettings,
} from '../lib/store';
import {
  isTauri,
  isMacOS,
  isWindows,
  listen,
  emitTo,
  hideOverlay,
  focusMain,
  fitOverlayToPanel,
  getOverlayPos,
  setOverlayGlass,
  shieldActive,
  showSettingsWindow,
} from '../lib/tauri';
import { useShareProtection } from '../hooks/useShareProtection';
import { useReducedMotion } from '../hooks/useA11y';
import { fmtTime } from '../lib/utils';

export function OverlayWindow() {
  const { t } = useTranslation();
  const [script, setScript] = useState(null);
  const [settings, setSettings] = useState(defaultSettings);
  // `active`  = word currently being said (peak of bell curve)
  // `pointer` = lookahead search position for voice matching
  const [active, setActive] = useState(0);
  const [pointer, setPointer] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [interactive, setInteractive] = useState(true);
  const loadedRef = useRef(false);

  const windowRef = useRef(null);
  const activeWordRef = useRef(null);
  const panelRef = useRef(null);
  const gripRef = useRef(null);
  const passthruBtnRef = useRef(null);
  const settingsBtnRef = useRef(null);
  const scriptRef = useRef(script);
  scriptRef.current = script;
  // `settings` is the GLOBAL layer; keep a ref so once-registered listeners and
  // the gear handler always read the latest global without re-subscribing.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const words = useMemo(
    () => (script ? script.text.split(/\s+/).filter(Boolean) : []),
    [script]
  );

  // Effective settings the prompter actually renders: script overrides laid
  // over global (script ▸ global ▸ default). Read `effective` everywhere below.
  const effective = useMemo(
    () => resolveSettings(settings, script?.settingsOverrides),
    [settings, script]
  );

  // ---- settings --------------------------------------------------------------
  // Global-layer patch (overlaySize default, etc.) — broadcasts to main/settings.
  const patchSettings = useCallback((patch) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      persistSettings(next);
      emitTo('main', 'settings:sync', { settings: next, from: 'overlay' });
      return next;
    });
  }, []);

  // Screen-share shield toggle (shared gate; Linux gets a risk prompt first).
  const { setShielded, consentModal } = useShareProtection(settings, patchSettings);

  // Reduce-motion is a global accessibility preference (never per-script), so
  // it tracks the global layer and drives the document-level class.
  useReducedMotion(settings.reduceMotion);

  // Per-script override patch — the overlay's quick controls (A−/A+, ⌘±, ↑/↓)
  // tweak THIS script, not everyone. Persisted via main; mirrored to the open
  // settings window.
  const patchScriptOverride = useCallback((patch) => {
    setScript((prev) => {
      if (!prev) return prev;
      const overrides = { ...(prev.settingsOverrides || {}), ...patch };
      emitTo('main', 'script:settings', { id: prev.id, overrides, from: 'overlay' });
      emitTo('settings', 'script:settings', { id: prev.id, overrides, from: 'overlay' });
      return { ...prev, settingsOverrides: overrides };
    });
  }, []);

  // ---- panel resize ----------------------------------------------------------
  const { panelSize, setPanelSize, resizing, startResize } = usePanelResize(
    defaultSettings.overlaySize,
    (size) => {
      const s = scriptRef.current;
      if (s) {
        setScript((prev) => (prev ? { ...prev, overlaySize: size } : prev));
        emitTo('main', 'script:patch', { id: s.id, patch: { overlaySize: size } });
      }
      patchSettings({ overlaySize: size });
    }
  );

  // ---- interaction modes -----------------------------------------------------
  useClickThrough(interactive ? [panelRef] : [gripRef, passthruBtnRef]);

  useEffect(() => {
    if (!isTauri) {
      const onKey = (e) => {
        if (e.altKey && e.shiftKey && e.code === 'KeyE') {
          e.preventDefault();
          setInteractive((i) => !i);
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
    let unsub;
    let cancelled = false;
    listen('overlay:toggle-interactive', () => setInteractive((i) => !i)).then((fn) => {
      if (cancelled) fn();
      else unsub = fn;
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  // ---- boot ------------------------------------------------------------------
  useEffect(() => {
    fetchSettings().then((st) => {
      if (!loadedRef.current) {
        setSettings(st);
        setPanelSize(clampSize(st.overlaySize ?? defaultSettings.overlaySize));
      }
    });
    fetchScripts().then((sc) => {
      if (!loadedRef.current && sc[0]) {
        setScript(sc[0]);
        if (sc[0].overlaySize) setPanelSize(clampSize(sc[0].overlaySize));
      }
    });
  }, [setPanelSize]);

  // ---- settings window -------------------------------------------------------
  // Settings live in their own independent window (never coupled to the panel,
  // so they can't clip or resize it). Opening mirrors the current shield so the
  // settings window is hidden from screen-share in lockstep with the prompter.
  const sendSettingsContext = useCallback(() => {
    const s = scriptRef.current;
    emitTo('settings', 'settings:context', {
      scriptId: s?.id ?? null,
      scriptTitle: s?.title ?? '',
      global: settingsRef.current,
      overrides: s?.settingsOverrides ?? {},
    });
  }, []);

  const openSettings = useCallback(() => {
    showSettingsWindow();
    sendSettingsContext();
  }, [sendSettingsContext]);

  // ---- cross-window events ---------------------------------------------------
  useEffect(() => {
    let un1, un2, un3, un4, un5;
    (async () => {
      un1 = await listen('overlay:load', (p) => {
        loadedRef.current = true;
        if (p?.script) setScript(p.script);
        if (p?.settings) setSettings(p.settings);
        const size = p?.script?.overlaySize ?? p?.settings?.overlaySize;
        if (size) setPanelSize(clampSize(size));
        jumpToRef.current(0); // resets active + pointer + cancels any slide
        setElapsed(0);
        setPlaying(true);
        setInteractive(true);
        // Refresh an open settings window with the new script's context.
        setTimeout(sendSettingsContext, 0);
      });
      // Live language change from the main window's LanguageSwitcher.
      un4 = await listen('locale:changed', (p) => {
        if (p?.lng) i18n.changeLanguage(p.lng); // i18next-browser-languagedetector persists to localStorage
      });
      // Global layer changes from the main app or the settings window.
      un2 = await listen('settings:sync', (p) => {
        if (p?.from === 'main' || p?.from === 'settings') {
          setSettings((s) => ({ ...s, ...p.settings }));
        }
      });
      // Per-script override changes from the settings window (or main).
      un3 = await listen('script:settings', (p) => {
        if (p?.from === 'overlay') return; // ignore our own echo
        setScript((prev) =>
          prev && prev.id === p?.id ? { ...prev, settingsOverrides: p.overrides ?? {} } : prev
        );
      });
      // Reset position + size to defaults (triggered from settings window).
      un5 = await listen('overlay:reset-layout', () => {
        setPanelSize(clampSize(defaultSettings.overlaySize));
        setScript((prev) => (prev ? { ...prev, overlayPos: null, overlaySize: null } : prev));
      });
    })();
    return () => {
      un1?.();
      un2?.();
      un3?.();
      un4?.();
      un5?.();
    };
  }, [setPanelSize, sendSettingsContext]);

  // ---- voice tracking / auto-scroll ------------------------------------------
  const jumpToRef = useRef((idx) => {
    setActive(idx);
    setPointer(idx);
  }); // fallback before hook mounts
  const { usingVoice, listening, jumpTo } = useVoiceTracking({
    words,
    playing,
    voiceEnabled: effective.voice,
    wpm: effective.speed,
    pointer,
    setPointer,
    setActive,
    language: script?.language,
  });
  // Keep ref current so overlay:load listener (registered once) always calls latest jumpTo
  useEffect(() => {
    jumpToRef.current = jumpTo;
  }, [jumpTo]);

  // ---- timer -----------------------------------------------------------------
  useEffect(() => {
    if (!playing || effective.timerMode === 'off') return undefined;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [playing, effective.timerMode]);

  // ---- scroll active word to centre ------------------------------------------
  useEffect(() => {
    const win = windowRef.current;
    const w = activeWordRef.current;
    if (!win || !w) return;
    const target = w.offsetTop - win.clientHeight / 2 + w.offsetHeight / 2;
    win.scrollTo({
      top: Math.max(0, target),
      behavior: settings.reduceMotion ? 'auto' : 'smooth',
    });
  }, [active, effective.size, script, panelSize, settings.reduceMotion]);

  // ---- fit native window to the panel's real rendered box (throttled) --------
  // Measures panelRef directly (rather than trusting panelSize, which is only
  // ever the resizable body height) so the OS window always matches the
  // panel's true footprint — see fitOverlayToPanel's doc comment for why that
  // now matters for both width and height.
  const lastFit = useRef(0);
  const pendingFit = useRef(null);
  useEffect(() => {
    if (!isTauri) return undefined;
    const el = panelRef.current;
    if (!el) return undefined;
    const fit = () => {
      const { width, height } = el.getBoundingClientRect();
      clearTimeout(pendingFit.current);
      const now = Date.now();
      if (now - lastFit.current > 120) {
        lastFit.current = now;
        fitOverlayToPanel({ w: width, h: height });
      } else {
        pendingFit.current = setTimeout(() => {
          lastFit.current = Date.now();
          fitOverlayToPanel({ w: width, h: height });
        }, 130);
      }
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => {
      ro.disconnect();
      clearTimeout(pendingFit.current);
    };
  }, []);

  // ---- transport controls ----------------------------------------------------
  const restart = useCallback(() => {
    setPointer(0);
    setElapsed(0);
    jumpTo(0);
  }, [jumpTo]);

  const skipBack = useCallback(() => {
    setActive((a) => {
      const next = Math.max(0, a - 5);
      setPointer(next);
      jumpTo(next);
      return next;
    });
  }, [jumpTo]);

  const skip = useCallback(() => {
    setActive((a) => {
      const next = Math.min(words.length - 1, a + 5);
      setPointer(next);
      jumpTo(next);
      return next;
    });
  }, [words.length, jumpTo]);

  const close = useCallback(() => {
    setPlaying(false);
    hideOverlay();
    focusMain();
  }, []);

  const onWordClick = useCallback(
    (idx) => {
      setPointer(idx);
      jumpTo(idx);
    },
    [jumpTo]
  );

  // ---- keyboard --------------------------------------------------------------
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === 'Escape') {
        close();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        patchScriptOverride({ speed: Math.min(220, effective.speed + 5) });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        patchScriptOverride({ speed: Math.max(80, effective.speed - 5) });
      } else if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        patchScriptOverride({ size: Math.min(46, effective.size + 3) });
      } else if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault();
        patchScriptOverride({ size: Math.max(22, effective.size - 3) });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [effective.speed, effective.size, patchScriptOverride, close]);

  const timecode =
    effective.timerMode === 'up'
      ? fmtTime(elapsed)
      : effective.timerMode === 'down'
        ? fmtTime(effective.countFrom - elapsed)
        : null;

  // macOS/Windows Tauri get their glass blur from a native compositor layer
  // instead of CSS backdrop-filter — NSVisualEffectView/Liquid Glass on
  // macOS, Acrylic on Windows (see "overlay" window's windowEffects in
  // src-tauri/tauri.conf.json, plus the macOS 26+ upgrade in
  // src-tauri/src/lib.rs). Linux has no portable compositor-level blur, so
  // it keeps the CSS fallback.
  const nativeGlass = isTauri && (isMacOS || isWindows);
  // AppKit/DWM materials aren't a continuously tunable blur radius, so the
  // "Glass blur" slider can't scale native blur strength — but it can at
  // least turn native blur fully on/off, same as blur=0 means "no blur" for
  // the CSS path on other platforms.
  const wantNativeGlass = nativeGlass && effective.blur > 0;

  useEffect(() => {
    if (nativeGlass) setOverlayGlass(wantNativeGlass);
  }, [nativeGlass, wantNativeGlass]);

  return (
    <div
      className={
        'overlay-root' +
        (!isTauri ? ' demo' : '') +
        (effective.position === 'top' ? ' pos-top' : '')
      }
    >
      {!isTauri && <DemoBackdrop />}

      <div
        ref={panelRef}
        className={
          'overlay-panel' +
          (interactive ? '' : ' ghost') +
          (shieldActive(settings) ? ' shielded' : ' exposed')
        }
        style={{
          '--ov-alpha': effective.opacity / 100,
          width: panelSize.w,
          // When native glass is active the window sits over a native blur
          // layer, so the glass is composited by the window server, not
          // this CSS filter — layering a CSS backdrop-filter on top too is
          // what caused the lag, since the webview recomputes it every
          // frame the desktop behind the window changes. When blur is 0,
          // native glass is off too (see setOverlayGlass above), so the CSS
          // path is just a harmless no-op `blur(0px)` there.
          ...(wantNativeGlass
            ? { backdropFilter: 'none', WebkitBackdropFilter: 'none' }
            : {
                backdropFilter: `blur(${effective.blur}px) saturate(1.15)`,
                WebkitBackdropFilter: `blur(${effective.blur}px) saturate(1.15)`,
              }),
        }}
      >
        <div
          className="ov-head"
          data-tauri-drag-region
          onPointerUp={() => {
            if (!isTauri || !scriptRef.current) return;
            getOverlayPos().then((pos) => {
              if (!pos) return;
              const s = scriptRef.current;
              emitTo('main', 'script:patch', { id: s.id, patch: { overlayPos: pos } });
            });
          }}
        >
          <span
            ref={gripRef}
            className="grip"
            data-tauri-drag-region
            title={t('overlay.dragHint')}
            aria-hidden="true"
          >
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          {timecode && (
            <span className="ov-time">
              {effective.timerMode === 'down' ? (
                <Hourglass size={13} />
              ) : (
                <TimerIcon size={13} />
              )}
              {timecode}
            </span>
          )}
          {usingVoice && listening && (
            <span className="ov-voice on">
              <Mic size={12} />
              {t('reading.voice')}
            </span>
          )}
          {effective.voice && playing && !voiceAvailable && (
            <span className="ov-voice" title={t('overlay.voiceUnavailable')}>
              <MicOff size={12} />
            </span>
          )}
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
            <ShieldToggle
              className={'ic ic-sm ov-shield' + (shieldActive(settings) ? ' on' : '')}
              shielded={shieldActive(settings)}
              size={13}
              showLabel
              onChange={setShielded}
            />
            <button
              className="ic ic-sm"
              title={t('overlay.close')}
              aria-label={t('overlay.close')}
              onClick={close}
            >
              <X />
            </button>
          </span>
        </div>

        <div className="ov-body">
          {words.length > 0 ? (
            <div
              className="ov-window"
              ref={windowRef}
              style={{ height: panelSize.h }}
              role="region"
              aria-label={t('overlay.scriptRegion', {
                title: script?.title || t('overlay.untitledScript'),
              })}
              dir={['ar', 'he', 'fa', 'ur'].includes(script?.language) ? 'rtl' : 'ltr'}
            >
              <ScriptViewer
                text={script.text}
                active={active}
                size={effective.size}
                mirror={effective.mirror}
                highContrast={settings.highContrast}
                dyslexic={settings.dyslexicFont}
                reduceMotion={settings.reduceMotion}
                activeWordRef={activeWordRef}
                onWordClick={onWordClick}
              />
            </div>
          ) : (
            <div className="ov-empty">{t('library.empty')}</div>
          )}
        </div>

        <div className="ov-foot" role="toolbar" aria-label={t('overlay.controls')}>
          <button
            className="ic"
            title={t('overlay.restart')}
            aria-label={t('overlay.restart')}
            onClick={restart}
          >
            <RotateCcw />
          </button>
          <button
            className="ic"
            title={t('overlay.back5')}
            aria-label={t('overlay.back5')}
            onClick={skipBack}
          >
            <ChevronLeft />
          </button>
          <button
            className="ic accent"
            title={playing ? t('overlay.pause') : t('overlay.play')}
            aria-label={playing ? t('overlay.pause') : t('overlay.play')}
            aria-pressed={playing}
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? <Pause /> : <Play />}
          </button>
          <button
            className="ic"
            title={t('overlay.skip5')}
            aria-label={t('overlay.skip5')}
            onClick={skip}
          >
            <ChevronsRight />
          </button>
          <span className="sep" />
          <button
            className="ic sizebtn"
            title={t('overlay.smaller')}
            aria-label={t('overlay.smaller')}
            style={{ fontSize: 13 }}
            onClick={() => patchScriptOverride({ size: Math.max(22, effective.size - 3) })}
          >
            A
          </button>
          <button
            className="ic sizebtn"
            title={t('overlay.larger')}
            aria-label={t('overlay.larger')}
            style={{ fontSize: 18 }}
            onClick={() => patchScriptOverride({ size: Math.min(46, effective.size + 3) })}
          >
            A
          </button>
          <button
            ref={settingsBtnRef}
            className="ic"
            title={t('overlay.prompterSettings')}
            aria-label={t('overlay.prompterSettings')}
            onClick={openSettings}
          >
            <SettingsIcon />
          </button>
          <button
            ref={passthruBtnRef}
            className={'ic ov-passthru' + (interactive ? '' : ' on')}
            title={
              interactive ? t('overlay.enableClickThrough') : t('overlay.disableClickThrough')
            }
            aria-label={
              interactive ? t('overlay.enableClickThrough') : t('overlay.disableClickThrough')
            }
            aria-pressed={!interactive}
            onClick={() => setInteractive((i) => !i)}
          >
            {interactive ? '⌥⇧E' : '⌥⇧E·on'}
          </button>
        </div>

        <div
          className={'ov-resize' + (resizing ? ' dragging' : '')}
          onPointerDown={startResize}
          title={t('overlay.resize')}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M11 5 5 11M11 9l-2 2" />
          </svg>
        </div>
      </div>
      {consentModal}
    </div>
  );
}

function DemoBackdrop() {
  const { t } = useTranslation();
  return (
    <div className="demo-stage">
      <div className="demo-shared">
        <div className="demo-eyebrow">{t('overlay.demoEyebrow')}</div>
        <h1 className="demo-title">{t('overlay.demoTitle')}</h1>
        <p className="demo-sub">{t('overlay.demoSub')}</p>
      </div>
    </div>
  );
}
