import { useCallback, useEffect, useLayoutEffect, useRef, useState, Component } from 'react';
import { Home, Keyboard, Settings as SettingsIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { ShieldToggle } from '../components/ShieldToggle';
import { ShortcutsModal } from '../components/ShortcutsModal';
import { LOGO_MARK_DARK, LOGO_MARK_LIGHT } from '../lib/branding';

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
function useSystemLogo() {
  const [logo, setLogo] = useState(prefersDark.matches ? LOGO_MARK_DARK : LOGO_MARK_LIGHT);
  useEffect(() => {
    const handler = (e) => setLogo(e.matches ? LOGO_MARK_DARK : LOGO_MARK_LIGHT);
    prefersDark.addEventListener('change', handler);
    return () => prefersDark.removeEventListener('change', handler);
  }, []);
  return logo;
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(e) {
    return { error: e };
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            flex: 1,
            padding: 24,
            color: 'var(--text-primary)',
            fontFamily: 'monospace',
            fontSize: 13,
            overflow: 'auto',
          }}
        >
          <div style={{ color: '#ff5f57', marginBottom: 12, fontWeight: 700 }}>
            {i18n.t('app.renderError')}
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
            {this.state.error?.stack || String(this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
import { useListResize } from '../hooks/useListResize';
import { Library } from '../features/Library';
import { Editor } from '../features/Editor';
import { SettingsScreen } from '../features/SettingsScreen';
import {
  defaultSettings,
  fetchScripts,
  fetchSettings,
  upsertScript,
  removeScript,
  persistSettings,
  newScript,
} from '../lib/store';
import {
  isTauri,
  listen,
  emitTo,
  showOverlay,
  hideOverlay,
  isOverlayVisible,
  registerOverlayHotkey,
  registerInteractiveHotkey,
  setAppProtected,
  shieldActive,
  resetOverlayLayout,
} from '../lib/tauri';
import { useShareProtection } from '../hooks/useShareProtection';
import { usePermissionsGate } from '../hooks/usePermissionsGate';
import { useUiScale, useReducedMotion, useDyslexicFont } from '../hooks/useA11y';
import { useUpdateCheck } from '../hooks/useUpdateCheck';
import { useTour } from '../hooks/useTour';

export function MainWindow() {
  const { t } = useTranslation();
  const logoMark = useSystemLogo();
  const [pane, setPane] = useState('library'); // library | settings
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [windowFocused, setWindowFocused] = useState(true);
  const { listWidth, handleMouseDown } = useListResize(300);
  const [scripts, setScripts] = useState([]);
  const [selId, setSelId] = useState(null);
  const [settings, setSettings] = useState(defaultSettings);
  const [ready, setReady] = useState(false);
  const settingsRef = useRef(settings);
  const scriptsRef = useRef(scripts);
  const savedRef = useRef(new Map());
  useLayoutEffect(() => {
    settingsRef.current = settings;
    scriptsRef.current = scripts;
  });

  // ---- accessibility: UI scale + reduced motion + dyslexic font -----------
  useUiScale(settings.uiScale);
  useReducedMotion(settings.reduceMotion);
  useDyslexicFont(settings.dyslexicFont);

  // ---- initial load -------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const load = async (attempt = 1) => {
      try {
        const [sc, st] = await Promise.all([fetchScripts(), fetchSettings()]);
        if (cancelled) return;
        setScripts(sc);
        setSelId(sc[0]?.id ?? null);
        setSettings(st);
        savedRef.current = new Map(sc.map((s) => [s.id, s]));
        setReady(true);
        setAppProtected(shieldActive(st));
      } catch {
        if (cancelled) return;
        if (attempt < 5) {
          setTimeout(() => load(attempt + 1), 300 * attempt);
        } else {
          // give up — show UI with empty state rather than hanging forever
          setReady(true);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- window focus (gates tour-tip auto-start/visibility, see useTour) ---
  useEffect(() => {
    if (!isTauri) return undefined;
    let unlisten;
    (async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      setWindowFocused(await win.isFocused().catch(() => true));
      unlisten = await win.onFocusChanged(({ payload: focused }) => setWindowFocused(focused));
    })();
    return () => unlisten?.();
  }, []);

  // ---- persistence (debounced) --------------------------------------------
  useEffect(() => {
    if (!ready) return undefined;
    const t = setTimeout(() => {
      const prev = savedRef.current;
      const next = new Map(scripts.map((s) => [s.id, s]));
      for (const [id, s] of next) if (prev.get(id) !== s) upsertScript(s);
      for (const id of prev.keys()) if (!next.has(id)) removeScript(id);
      savedRef.current = next;
    }, 350);
    return () => clearTimeout(t);
  }, [scripts, ready]);

  useEffect(() => {
    if (!ready) return undefined;
    const t = setTimeout(() => persistSettings(settings), 350);
    return () => clearTimeout(t);
  }, [settings, ready]);

  // ---- settings sync with overlay -----------------------------------------
  const applySettings = useCallback((patch, broadcast = true) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      if (broadcast) emitTo('overlay', 'settings:sync', { settings: next, from: 'main' });
      return next;
    });
  }, []);

  // Screen-share shield toggle (with the Linux risk-acknowledgement gate).
  const { setShielded, consentModal } = useShareProtection(settings, applySettings);
  // Voice-tracking mic/speech-recognition/Dictation permissions modal.
  const {
    requestGate: requestPermissionsGate,
    openManually: openPermissionsModal,
    modal: permissionsModal,
  } = usePermissionsGate();

  // First-run tour tips. Paused (not discarded — the hook preserves its
  // step position) while the window is unfocused/minimized, or while a
  // real modal is open — screen-recording safety and avoiding overlapping
  // dismissible surfaces, respectively (see docs on useTour).
  const { tourOverlay, replayTour } = useTour('main', settings, applySettings, {
    active: ready && windowFocused && !consentModal && !permissionsModal,
  });

  const update = useUpdateCheck(settings.updateCheckHours);

  // The About window is a separate, long-lived webview — it can't share this
  // hook's state directly, so mirror just the bits it surfaces (status +
  // version) over an event, same pattern as settings:sync.
  useEffect(() => {
    emitTo('about', 'update:sync', { status: update.status, version: update.version });
  }, [update.status, update.version]);

  useEffect(() => {
    let un1, un2, un3, un4;
    (async () => {
      // Global layer edits from the overlay or the settings window.
      un1 = await listen('settings:sync', (p) => {
        if (p?.from === 'overlay' || p?.from === 'settings')
          setSettings((s) => ({ ...s, ...p.settings }));
      });
      un2 = await listen('overlay:hidden', () => {});
      un3 = await listen('script:patch', (p) => {
        if (p?.id && p?.patch)
          setScripts((ss) =>
            ss.map((s) => (s.id === p.id ? { ...s, ...p.patch, updatedAt: Date.now() } : s))
          );
      });
      // Per-script setting overrides from the overlay or the settings window.
      un4 = await listen('script:settings', (p) => {
        if (p?.id)
          setScripts((ss) =>
            ss.map((s) =>
              s.id === p.id
                ? { ...s, settingsOverrides: p.overrides ?? {}, updatedAt: Date.now() }
                : s
            )
          );
      });
    })();
    return () => {
      un1?.();
      un2?.();
      un3?.();
      un4?.();
    };
  }, []);

  // ---- overlay hotkeys ----------------------------------------------------
  const sel = scripts.find((s) => s.id === selId) || scripts[0] || null;
  const selRef = useRef(sel);
  useLayoutEffect(() => {
    selRef.current = sel;
  });

  const toggleOverlay = useCallback(async () => {
    if (await isOverlayVisible()) {
      await hideOverlay();
    } else if (selRef.current) {
      requestPermissionsGate(settingsRef.current.voice, () => {
        showOverlay(selRef.current, settingsRef.current);
      });
    }
  }, [requestPermissionsGate]);

  useEffect(() => {
    let cleanup;
    let cancelled = false;
    registerOverlayHotkey(toggleOverlay).then((fn) => {
      if (!cancelled) cleanup = fn;
      else fn?.();
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [toggleOverlay]);

  useEffect(() => {
    let cleanup;
    let cancelled = false;
    registerInteractiveHotkey().then((fn) => {
      if (!cancelled) cleanup = fn;
      else fn?.();
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  // ---- script ops ---------------------------------------------------------
  const selectScript = (id) => {
    setSelId(id);
    setPane('library');
  };

  const createScript = () => {
    const s = newScript();
    setScripts((ss) => [s, ...ss]);
    setSelId(s.id);
    setPane('library');
  };

  const updateScript = (id, patch) =>
    setScripts((ss) =>
      ss.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s))
    );

  const deleteScript = (id) => {
    setScripts((ss) => ss.filter((s) => s.id !== id));
    if (selId === id) setSelId(scripts.find((s) => s.id !== id)?.id ?? null);
  };

  const startReading = (script) => {
    requestPermissionsGate(settingsRef.current.voice, () => {
      updateScript(script.id, { tag: 'ready' });
      showOverlay(script, settingsRef.current);
    });
  };

  return (
    <div className={'app-shell' + (shieldActive(settings) ? ' shielded' : ' exposed')}>
      {/* Titlebar — only the inner span is the drag region, not the whole bar */}
      <div className="titlebar">
        {!isTauri && (
          <>
            <div className="tl r" />
            <div className="tl y" />
            <div className="tl g" />
          </>
        )}
        <div className="titlebar-name" data-tauri-drag-region>
          <img src={logoMark} alt="" className="titlebar-logo" />
          <span className="titlebar-wordmark">
            eyeread<span className="titlebar-wordmark-in">.in</span>
          </span>
        </div>
        <ShieldToggle
          shielded={shieldActive(settings)}
          onChange={setShielded}
          data-tour="shield-toggle"
        />
        <button
          className="tl-shortcuts"
          onClick={() => setShortcutsOpen(true)}
          title={t('settings.viewShortcuts')}
          aria-label={t('settings.viewShortcuts')}
        >
          <Keyboard size={15} aria-hidden="true" />
        </button>
        <button
          className={'tl-settings' + (pane === 'settings' ? ' active' : '')}
          onClick={() => setPane((p) => (p === 'settings' ? 'library' : 'settings'))}
          title={pane === 'settings' ? t('library.title') : t('app.settings')}
          aria-label={pane === 'settings' ? t('library.title') : t('app.settings')}
          aria-pressed={pane === 'settings'}
        >
          {pane === 'settings' ? (
            <Home size={15} aria-hidden="true" />
          ) : (
            <SettingsIcon size={15} aria-hidden="true" />
          )}
          {update.status === 'available' && pane !== 'settings' && (
            <span className="tl-settings-badge" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="main">
        {pane === 'settings' ? (
          <ErrorBoundary>
            <SettingsScreen
              settings={settings}
              onSettings={applySettings}
              update={update}
              onCheckPermissions={openPermissionsModal}
              onReplayTour={() => {
                // The tour's steps target Library/Editor elements, which
                // aren't mounted while the Settings pane is showing — switch
                // back first so TourTip actually finds its targets instead
                // of silently timing out through every step (see TourTip's
                // missing-target fallback).
                setPane('library');
                replayTour('welcome-main-v1');
              }}
              onBack={() => setPane('library')}
            />
          </ErrorBoundary>
        ) : (
          <>
            {/* Left: script list — width is user-resizable */}
            <Library
              scripts={scripts}
              selId={selId}
              settings={settings}
              onSelect={selectScript}
              onCreate={createScript}
              onTogglePin={(id, pinned) => updateScript(id, { pinned })}
              onDelete={deleteScript}
              width={listWidth}
            />

            {/* Resize handle */}
            <div
              className="pane-divider"
              onMouseDown={handleMouseDown}
              role="separator"
              aria-orientation="vertical"
              aria-hidden="true"
            />

            {/* Right: editor — or empty state */}
            <div className="editor-pane">
              {sel ? (
                <Editor
                  script={sel}
                  settings={settings}
                  onChange={(patch) => updateScript(sel.id, patch)}
                  onScriptSettings={(next) => {
                    updateScript(sel.id, { settingsOverrides: next });
                    emitTo('overlay', 'script:settings', {
                      id: sel.id,
                      overrides: next,
                      from: 'main',
                    });
                    emitTo('settings', 'script:settings', {
                      id: sel.id,
                      overrides: next,
                      from: 'main',
                    });
                  }}
                  onResetScript={() => {
                    updateScript(sel.id, { settingsOverrides: {} });
                    emitTo('overlay', 'script:settings', {
                      id: sel.id,
                      overrides: {},
                      from: 'main',
                    });
                    emitTo('settings', 'script:settings', {
                      id: sel.id,
                      overrides: {},
                      from: 'main',
                    });
                  }}
                  onResetLayout={() => {
                    updateScript(sel.id, { overlayPos: null, overlaySize: null });
                    emitTo('overlay', 'overlay:reset-layout', {});
                    resetOverlayLayout(settings);
                  }}
                  onBack={null}
                  onStart={() => startReading(sel)}
                  update={update}
                />
              ) : (
                <div className="editor-empty">
                  <span>{t('app.editorEmpty')}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {consentModal}
      {permissionsModal}
      {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}
      {tourOverlay}
    </div>
  );
}
