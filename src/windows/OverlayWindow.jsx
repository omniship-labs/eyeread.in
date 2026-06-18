import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RotateCcw,
  Play,
  Pause,
  ChevronLeft,
  ChevronsRight,
  Settings as SettingsIcon,
  EyeOff,
  Timer as TimerIcon,
  Hourglass,
  Mic,
  MicOff,
  X,
} from 'lucide-react';
import { ScriptViewer } from '../components/ScriptViewer';
import { SettingsDrawer } from './overlay/SettingsDrawer';
import { VoiceDebugger, useVoiceDebugger } from './overlay/VoiceDebugger';
import { useVoiceTracking, voiceAvailable } from '../hooks/useVoiceTracking';
import { useClickThrough } from '../hooks/useClickThrough';
import { usePanelResize, clampSize } from '../hooks/usePanelResize';
import { defaultSettings, fetchScripts, fetchSettings, persistSettings } from '../lib/store';
import {
  isTauri,
  listen,
  emitTo,
  hideOverlay,
  focusMain,
  fitOverlayToPanel,
  setOverlayContentProtected,
} from '../lib/tauri';
import { fmtTime } from '../lib/utils';

// Show voice debug panel when ?debug is in the URL (dev only)
const DEBUG_VOICE =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('debug');

export function OverlayWindow() {
  const [script, setScript]         = useState(null);
  const [settings, setSettings]     = useState(defaultSettings);
  // `active`  = word currently being said (peak of bell curve)
  // `pointer` = lookahead search position for voice matching
  const [active, setActive]         = useState(0);
  const [pointer, setPointer]       = useState(0);
  const [playing, setPlaying]       = useState(false);
  const [elapsed, setElapsed]       = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [interactive, setInteractive]   = useState(true);
  // Always start hidden — toggled explicitly by the user, never from saved prefs
  const [shielded, setShielded]     = useState(true);
  const loadedRef = useRef(false);

  // Enforce hidden on mount — belt-and-suspenders for the Tauri side
  useEffect(() => { setOverlayContentProtected(true); }, []);

  const windowRef      = useRef(null);
  const activeWordRef  = useRef(null);
  const panelRef       = useRef(null);
  const gripRef        = useRef(null);
  const settingsBtnRef = useRef(null);
  const scriptRef      = useRef(script);
  scriptRef.current = script;

  const words = useMemo(
    () => (script ? script.text.split(/\s+/).filter(Boolean) : []),
    [script],
  );

  // ---- settings --------------------------------------------------------------
  const patchSettings = useCallback((patch) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      persistSettings(next);
      emitTo('main', 'settings:sync', { settings: next, from: 'overlay' });
      return next;
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
    },
  );

  // ---- interaction modes -----------------------------------------------------
  useClickThrough(interactive ? [panelRef] : [gripRef]);

  useEffect(() => {
    if (!isTauri) {
      const onKey = (e) => {
        if (e.altKey && e.code === 'KeyE') { e.preventDefault(); setInteractive((i) => !i); }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
    let unsub;
    (async () => {
      unsub = await listen('overlay:toggle-interactive', () => setInteractive((i) => !i));
    })();
    return () => unsub?.();
  }, []);

  // ---- boot ------------------------------------------------------------------
  useEffect(() => {
    fetchSettings().then((st) => {
      if (!loadedRef.current) {
        setSettings(st);
        setPanelSize(clampSize(st.overlaySize ?? defaultSettings.overlaySize));
        // Do NOT apply hideFromShare here — always start hidden regardless of saved pref
      }
    });
    fetchScripts().then((sc) => {
      if (!loadedRef.current && sc[0]) {
        setScript(sc[0]);
        if (sc[0].overlaySize) setPanelSize(clampSize(sc[0].overlaySize));
      }
    });
  }, [setPanelSize]);

  // Close settings on blur
  useEffect(() => {
    if (!isTauri) return;
    let unlisten;
    (async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      unlisten = await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
        if (!focused) setShowSettings(false);
      });
    })();
    return () => unlisten?.();
  }, []);

  // ---- cross-window events ---------------------------------------------------
  useEffect(() => {
    let un1, un2;
    (async () => {
      un1 = await listen('overlay:load', (p) => {
        loadedRef.current = true;
        if (p?.script)   setScript(p.script);
        if (p?.settings) setSettings(p.settings);
        const size = p?.script?.overlaySize ?? p?.settings?.overlaySize;
        if (size) setPanelSize(clampSize(size));
        // Always start hidden on each new launch — user must opt-in to expose
        setShielded(true);
        setOverlayContentProtected(true);
        jumpToRef.current(0); // resets active + pointer + cancels any slide
        setElapsed(0);
        setPlaying(true);
        setInteractive(true);
      });
      un2 = await listen('settings:sync', (p) => {
        if (p?.from === 'main') setSettings((s) => ({ ...s, ...p.settings }));
      });
    })();
    return () => { un1?.(); un2?.(); };
  }, [setPanelSize]);

  // ---- voice debug -----------------------------------------------------------
  const voiceDbg = useVoiceDebugger();

  // ---- voice tracking / auto-scroll ------------------------------------------
  const jumpToRef = useRef((idx) => { setActive(idx); setPointer(idx); }); // fallback before hook mounts
  const { usingVoice, listening, jumpTo } = useVoiceTracking({
    words,
    playing,
    voiceEnabled: settings.voice,
    wpm: settings.speed,
    pointer,
    setPointer,
    setActive,
    debug: DEBUG_VOICE ? voiceDbg : undefined,
  });
  // Keep ref current so overlay:load listener (registered once) always calls latest jumpTo
  useEffect(() => { jumpToRef.current = jumpTo; }, [jumpTo]);

  // ---- timer -----------------------------------------------------------------
  useEffect(() => {
    if (!playing || settings.timerMode === 'off') return undefined;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [playing, settings.timerMode]);

  // ---- scroll active word to centre ------------------------------------------
  useEffect(() => {
    const win = windowRef.current;
    const w   = activeWordRef.current;
    if (!win || !w) return;
    const target = w.offsetTop - win.clientHeight / 2 + w.offsetHeight / 2;
    win.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }, [active, settings.size, script, panelSize]);

  // ---- fit native window width to panel (throttled) --------------------------
  const lastFit = useRef(0);
  useEffect(() => {
    if (!isTauri) return undefined;
    const now = Date.now();
    if (now - lastFit.current > 120) {
      lastFit.current = now;
      fitOverlayToPanel(panelSize);
      return undefined;
    }
    const t = setTimeout(() => { lastFit.current = Date.now(); fitOverlayToPanel(panelSize); }, 130);
    return () => clearTimeout(t);
  }, [panelSize]);

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

  const onWordClick = useCallback((idx) => {
    setPointer(idx);
    jumpTo(idx);
  }, [jumpTo]);

  // ---- keyboard --------------------------------------------------------------
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault(); setPlaying((p) => !p);
      } else if (e.key === 'Escape') {
        close();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault(); patchSettings({ speed: Math.min(220, settings.speed + 5) });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault(); patchSettings({ speed: Math.max(80, settings.speed - 5) });
      } else if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault(); patchSettings({ size: Math.min(46, settings.size + 3) });
      } else if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault(); patchSettings({ size: Math.max(22, settings.size - 3) });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settings.speed, settings.size, patchSettings, close]);

  const timecode =
    settings.timerMode === 'up'   ? fmtTime(elapsed) :
    settings.timerMode === 'down' ? fmtTime(settings.countFrom - elapsed) :
    null;

  return (
    <div className={'overlay-root' + (!isTauri ? ' demo' : '')}>
      {!isTauri && <DemoBackdrop />}

      <div
        ref={panelRef}
        className={
          'overlay-panel' +
          (interactive ? '' : ' ghost') +
          (shielded ? ' shielded' : ' exposed')
        }
        style={{
          '--ov-alpha': settings.opacity / 100,
          width: panelSize.w,
          backdropFilter: `blur(${settings.blur}px) saturate(1.15)`,
          WebkitBackdropFilter: `blur(${settings.blur}px) saturate(1.15)`,
        }}
      >
        <div className="ov-head" data-tauri-drag-region>
          <span ref={gripRef} className="grip" data-tauri-drag-region title="Drag to move · Esc to hide">
            <i /><i /><i /><i /><i /><i />
          </span>
          {timecode && (
            <span className="ov-time">
              {settings.timerMode === 'down' ? <Hourglass size={13} /> : <TimerIcon size={13} />}
              {timecode}
            </span>
          )}
          {usingVoice && listening && (
            <span className="ov-voice on"><Mic size={12} />Voice</span>
          )}
          {settings.voice && playing && !voiceAvailable && (
            <span className="ov-voice" title="Voice tracking unavailable — timed scroll">
              <MicOff size={12} />
            </span>
          )}
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
            <button
              className={'ic ic-sm ov-shield' + (shielded ? ' on' : '')}
              title={shielded
                ? 'Hidden from screen-share — click to expose'
                : 'Visible in screen-share — click to hide'}
              onClick={() => {
                const next = !shielded;
                setShielded(next);
                setOverlayContentProtected(next);
              }}
            >
              <EyeOff size={13} />
              <span className="ov-shield-label">{shielded ? 'HIDDEN' : 'VISIBLE'}</span>
            </button>
            <button className="ic ic-sm" title="Close prompter (⌘⇧E to reopen)" onClick={close}>
              <X />
            </button>
          </span>
        </div>

        <div className="ov-body">
          {words.length > 0 ? (
            <div className="ov-window" ref={windowRef} style={{ height: panelSize.h }}>
              <ScriptViewer
                text={script.text}
                active={active}
                size={settings.size}
                mirror={settings.mirror}
                activeWordRef={activeWordRef}
                onWordClick={onWordClick}
              />
            </div>
          ) : (
            <div className="ov-empty">No scripts yet. Paste one to start.</div>
          )}
        </div>

        <div className="ov-foot">
          <button className="ic" title="Restart" onClick={restart}><RotateCcw /></button>
          <button className="ic" title="Back 5 words" onClick={skipBack}><ChevronLeft /></button>
          <button
            className="ic accent"
            title={playing ? 'Pause (Space)' : 'Play (Space)'}
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? <Pause /> : <Play />}
          </button>
          <button className="ic" title="Skip 5 words ahead" onClick={skip}><ChevronsRight /></button>
          <span className="sep" />
          <button
            className="ic sizebtn"
            title="Smaller text"
            style={{ fontSize: 13 }}
            onClick={() => patchSettings({ size: Math.max(22, settings.size - 3) })}
          >A</button>
          <button
            className="ic sizebtn"
            title="Larger text"
            style={{ fontSize: 18 }}
            onClick={() => patchSettings({ size: Math.min(46, settings.size + 3) })}
          >A</button>
          <button
            ref={settingsBtnRef}
            className={'ic' + (showSettings ? ' on' : '')}
            title="Prompter settings"
            onClick={() => setShowSettings((s) => !s)}
          >
            <SettingsIcon />
          </button>
          <button
            className={'ic ov-passthru' + (interactive ? '' : ' on')}
            title={interactive ? 'Enable click-through (⌥E)' : 'Disable click-through (⌥E)'}
            onClick={() => setInteractive((i) => !i)}
          >
            {interactive ? '⌥E' : '⌥E·on'}
          </button>
        </div>

        <div className={'ov-drawer' + (showSettings ? ' open' : '')}>
          <SettingsDrawer
            settings={settings}
            onPatch={patchSettings}
          />
        </div>

        <div
          className={'ov-resize' + (resizing ? ' dragging' : '')}
          onPointerDown={startResize}
          title="Drag to resize"
        >
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M11 5 5 11M11 9l-2 2" />
          </svg>
        </div>


      </div>

      {DEBUG_VOICE && (
        <VoiceDebugger
          log={voiceDbg.log}
          pointer={pointer}
          active={active}
          words={words}
        />
      )}
    </div>
  );
}

function DemoBackdrop() {
  return (
    <div className="demo-stage">
      <div className="demo-shared">
        <div className="demo-eyebrow">Q3 &middot; Company All-Hands</div>
        <h1 className="demo-title">We shipped invisible. Now we scale it.</h1>
        <p className="demo-sub">
          Three numbers that defined the quarter &mdash; and where the next one takes us.
        </p>
      </div>
    </div>
  );
}
