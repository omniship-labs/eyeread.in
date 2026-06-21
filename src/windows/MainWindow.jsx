import { useCallback, useEffect, useRef, useState, Component } from 'react';
import { Library as LibraryIcon, FileText, Settings as SettingsIcon, Heart, Eye, EyeOff } from 'lucide-react';
import logoMarkDark from '../assets/logos/eyeread-mark-bounded-dark.svg';
import logoMarkLight from '../assets/logos/eyeread-mark-bounded-light.svg';

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
function useSystemLogo() {
  const [logo, setLogo] = useState(prefersDark.matches ? logoMarkDark : logoMarkLight);
  useEffect(() => {
    const handler = (e) => setLogo(e.matches ? logoMarkDark : logoMarkLight);
    prefersDark.addEventListener('change', handler);
    return () => prefersDark.removeEventListener('change', handler);
  }, []);
  return logo;
}

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ flex: 1, padding: 24, color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 13, overflow: 'auto' }}>
          <div style={{ color: '#ff5f57', marginBottom: 12, fontWeight: 700 }}>Render error</div>
          <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{this.state.error?.stack || String(this.state.error)}</pre>
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
  setMainProtected,
} from '../lib/tauri';

export function MainWindow() {
  const logoMark = useSystemLogo();
  const [pane, setPane] = useState('library'); // library | settings
  const { listWidth, handleMouseDown } = useListResize(300);
  const [scripts, setScripts] = useState([]);
  const [selId, setSelId] = useState(null);
  const [settings, setSettings] = useState(defaultSettings);
  const [ready, setReady] = useState(false);
  const settingsRef = useRef(settings);
  const scriptsRef = useRef(scripts);
  const savedRef = useRef(new Map());
  settingsRef.current = settings;
  scriptsRef.current = scripts;

  // ---- initial load -------------------------------------------------------
  useEffect(() => {
    Promise.all([fetchScripts(), fetchSettings()]).then(([sc, st]) => {
      setScripts(sc);
      setSelId(sc[0]?.id ?? null);
      setSettings(st);
      savedRef.current = new Map(sc.map((s) => [s.id, s]));
      setReady(true);
      setMainProtected(st.hideFromShare);
    });
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

  useEffect(() => {
    let un1, un2, un3;
    (async () => {
      un1 = await listen('settings:sync', (p) => {
        if (p?.from === 'overlay') setSettings((s) => ({ ...s, ...p.settings }));
      });
      un2 = await listen('overlay:hidden', () => {});
      un3 = await listen('script:patch', (p) => {
        if (p?.id && p?.patch)
          setScripts((ss) =>
            ss.map((s) => (s.id === p.id ? { ...s, ...p.patch, updatedAt: Date.now() } : s))
          );
      });
    })();
    return () => { un1?.(); un2?.(); un3?.(); };
  }, []);

  // ---- overlay hotkeys ----------------------------------------------------
  const sel = scripts.find((s) => s.id === selId) || scripts[0] || null;
  const selRef = useRef(sel);
  selRef.current = sel;

  const toggleOverlay = useCallback(async () => {
    if (await isOverlayVisible()) {
      await hideOverlay();
    } else if (selRef.current) {
      await showOverlay(selRef.current, settingsRef.current);
    }
  }, []);

  useEffect(() => {
    let cleanup; let cancelled = false;
    registerOverlayHotkey(toggleOverlay).then((fn) => { if (!cancelled) cleanup = fn; else fn?.(); });
    return () => { cancelled = true; cleanup?.(); };
  }, [toggleOverlay]);

  useEffect(() => {
    let cleanup; let cancelled = false;
    registerInteractiveHotkey().then((fn) => { if (!cancelled) cleanup = fn; else fn?.(); });
    return () => { cancelled = true; cleanup?.(); };
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

  const startReading = async (script) => {
    updateScript(script.id, { tag: 'ready' });
    await showOverlay(script, settingsRef.current);
  };

  return (
    <div className={'app-shell' + (settings.hideFromShare ? ' shielded' : ' exposed')}>
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
          <span className="titlebar-wordmark">eyeread<span className="titlebar-wordmark-in">.in</span></span>
        </div>
        <button
          className={'tl-shield' + (settings.hideFromShare ? ' shielded' : ' exposed')}
          onClick={() => {
            const next = !settings.hideFromShare;
            applySettings({ hideFromShare: next });
            setMainProtected(next);
          }}
          title={settings.hideFromShare ? 'Hidden from screen share' : 'Visible in screen share'}
        >
          {settings.hideFromShare ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button
          className={'tl-settings' + (pane === 'settings' ? ' active' : '')}
          onClick={() => setPane((p) => (p === 'settings' ? 'library' : 'settings'))}
          title="Settings"
        >
          <SettingsIcon size={15} />
        </button>
      </div>

      <div className="main">
        {pane === 'settings' ? (
          <ErrorBoundary>
            <SettingsScreen settings={settings} onSettings={applySettings} />
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
            <div className="pane-divider" onMouseDown={handleMouseDown} />

            {/* Right: editor — or empty state */}
            <div className="editor-pane">
              {sel ? (
                <Editor
                  script={sel}
                  settings={settings}
                  onChange={(patch) => updateScript(sel.id, patch)}
                  onSettings={applySettings}
                  onBack={null}
                  onStart={() => startReading(sel)}
                />
              ) : (
                <div className="editor-empty">
                  <span>Create or select a script to get started</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
