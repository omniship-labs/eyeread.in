/**
 * SettingsWindow — standalone modal window for prompter settings.
 * Opened by the gear button in OverlayWindow via showSettingsWindow().
 * Communicates via events: reads settings:sync, writes settings:sync back.
 */
import { useEffect, useState } from 'react';
import { Timer as TimerIcon, Hourglass } from 'lucide-react';
import { Switch } from '../components/Switch';
import { Segmented } from '../components/Segmented';
import { requestMicPermission } from '../lib/mic';
import { voiceAvailable } from '../hooks/useVoiceTracking';
import { defaultSettings, fetchSettings, persistSettings } from '../lib/store';
import { isTauri, listen, emitTo, hideSettingsWindow } from '../lib/tauri';

const sliderFill = (value, min, max) => {
  const pct = ((value - min) / (max - min)) * 100;
  return {
    background: `linear-gradient(90deg, var(--accent) ${pct}%, var(--surface-3) ${pct}%)`,
  };
};

function Range({ label, unit, min, max, value, onChange }) {
  return (
    <div className="sw-row">
      <div className="sw-label">
        {label}
        <span className="sw-val">{value}{unit}</span>
      </div>
      <input
        type="range"
        className="er-slider"
        min={min} max={max} value={value}
        aria-label={label}
        onChange={(e) => onChange(+e.target.value)}
        style={sliderFill(value, min, max)}
      />
    </div>
  );
}

function SwitchRow({ label, checked, onChange }) {
  return (
    <div className="sw-row">
      <div className="sw-switch-row">
        {label}
        <Switch size="sm" checked={checked} label={label} onChange={onChange} />
      </div>
    </div>
  );
}

export function SettingsWindow() {
  const [settings, setSettings] = useState(defaultSettings);

  // Load persisted settings on boot
  useEffect(() => {
    fetchSettings().then(setSettings);
  }, []);

  // Sync from overlay or main
  useEffect(() => {
    let unsub;
    (async () => {
      unsub = await listen('settings:sync', (p) => {
        if (p?.from !== 'settings') setSettings((s) => ({ ...s, ...p.settings }));
      });
    })();
    return () => unsub?.();
  }, []);

  // Close on window blur (clicking back to overlay or elsewhere)
  useEffect(() => {
    if (!isTauri) return;
    let unlisten;
    (async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      unlisten = await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
        if (!focused) hideSettingsWindow();
      });
    })();
    return () => unlisten?.();
  }, []);

  const patch = (p) => {
    setSettings((s) => {
      const next = { ...s, ...p };
      persistSettings(next);
      emitTo('overlay', 'settings:sync', { settings: next, from: 'settings' });
      emitTo('main',    'settings:sync', { settings: next, from: 'settings' });
      return next;
    });
  };

  return (
    <div className="sw-root">
      <div className="sw-titlebar" data-tauri-drag-region>
        <span className="sw-title">Prompter settings</span>
      </div>

      <div className="sw-body">
        <SwitchRow
          label="Voice follow"
          checked={settings.voice}
          onChange={(v) => {
            if (v && voiceAvailable) requestMicPermission();
            patch({ voice: v });
          }}
        />
        {!settings.voice && (
          <Range
            label="Scroll speed" unit=" wpm"
            min={80} max={220} value={settings.speed}
            onChange={(v) => patch({ speed: v })}
          />
        )}
        <Range
          label="Text size" unit="px"
          min={22} max={46} value={settings.size}
          onChange={(v) => patch({ size: v })}
        />
        <Range
          label="Opacity" unit="%"
          min={10} max={100} value={settings.opacity}
          onChange={(v) => patch({ opacity: v })}
        />
        <Range
          label="Glass blur" unit="px"
          min={0} max={18} value={settings.blur}
          onChange={(v) => patch({ blur: v })}
        />
        <SwitchRow
          label="Mirror text"
          checked={!!settings.mirror}
          onChange={(v) => patch({ mirror: v })}
        />
        <div className="sw-row">
          <div className="sw-label">Timer</div>
          <Segmented
            size="md"
            options={[
              { value: 'off',  label: 'Off' },
              { value: 'up',   label: 'Count up', icon: <TimerIcon size={14} /> },
              { value: 'down', label: 'Down',     icon: <Hourglass size={14} /> },
            ]}
            value={settings.timerMode}
            onChange={(v) => patch({ timerMode: v })}
          />
        </div>
      </div>
    </div>
  );
}
