/**
 * SettingsWindow — the independent prompter-settings window.
 *
 * Opened by the gear button in OverlayWindow. It's its own OS window so it
 * can never clip or resize the overlay. Edits the CURRENT script's overrides.
 * Cascade: script ▸ global ▸ default. State arrives via `settings:context`;
 * per-script edits broadcast over `script:settings`.
 */
import { useEffect, useRef, useState } from 'react';
import { Timer as TimerIcon, Hourglass, Mic, MicOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/Button';
import { Switch } from '../components/Switch';
import { Segmented } from '../components/Segmented';
import { SettingItem } from '../components/SettingItem';
import { requestMicPermission } from '../lib/mic';
import { voiceAvailable } from '../hooks/useVoiceTracking';
import { defaultSettings, fetchSettings } from '../lib/store';
import {
  isTauri,
  isMacOS,
  listen,
  emitTo,
  hideSettingsWindow,
  resetOverlayLayout,
  manualDragProps,
} from '../lib/tauri';
import { useUiScale, useReducedMotion } from '../hooks/useA11y';

const sliderFill = (value, min, max) => {
  const pct = ((value - min) / (max - min)) * 100;
  return {
    background: `linear-gradient(90deg, var(--accent) ${pct}%, var(--surface-3) ${pct}%)`,
  };
};

export function SettingsWindow() {
  const { t } = useTranslation();
  // in-flight manual drag state (macOS); null when not dragging
  const dragRef = useRef(null);
  const [global, setGlobal] = useState(defaultSettings);
  const [overrides, setOverrides] = useState({});
  const [scriptId, setScriptId] = useState(null);

  // Mirror the global accessibility prefs in this standalone window.
  useUiScale(global.uiScale);
  useReducedMotion(global.reduceMotion);

  useEffect(() => {
    fetchSettings().then(setGlobal);
  }, []);

  useEffect(() => {
    let unA, unB, unC;
    (async () => {
      unA = await listen('settings:context', (p) => {
        if (p?.global) setGlobal(p.global);
        setOverrides(p?.overrides ?? {});
        setScriptId(p?.scriptId ?? null);
      });
      unB = await listen('settings:sync', (p) => {
        if (p?.from !== 'settings' && p?.settings) setGlobal((g) => ({ ...g, ...p.settings }));
      });
      unC = await listen('script:settings', (p) => {
        if (p?.from !== 'settings' && p?.id === scriptId) setOverrides(p.overrides ?? {});
      });
    })();
    return () => {
      unA?.();
      unB?.();
      unC?.();
    };
  }, [scriptId]);

  useEffect(() => {
    if (!isTauri) return undefined;
    let unlisten;
    (async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      unlisten = await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
        if (!focused) hideSettingsWindow();
      });
    })();
    return () => unlisten?.();
  }, []);

  // ---- mutations -------------------------------------------------------------
  const broadcast = (next) => {
    emitTo('overlay', 'script:settings', { id: scriptId, overrides: next, from: 'settings' });
    emitTo('main', 'script:settings', { id: scriptId, overrides: next, from: 'settings' });
  };
  const patch = (p) =>
    setOverrides((o) => {
      const n = { ...o, ...p };
      broadcast(n);
      return n;
    });
  const revert = (...keys) =>
    setOverrides((o) => {
      const n = { ...o };
      keys.forEach((k) => delete n[k]);
      broadcast(n);
      return n;
    });
  const resetAll = () => {
    setOverrides({});
    broadcast({});
  };

  const resetLayout = () => {
    if (scriptId) {
      emitTo('main', 'script:patch', {
        id: scriptId,
        patch: { overlayPos: null, overlaySize: null },
      });
    }
    emitTo('overlay', 'overlay:reset-layout', {});
    resetOverlayLayout(global);
  };

  // ---- helpers ---------------------------------------------------------------
  const has = (k) => Object.prototype.hasOwnProperty.call(overrides, k);
  const val = (k) => (has(k) ? overrides[k] : global[k]);
  const set = (k, v) => patch({ [k]: v });
  const hasAny = Object.keys(overrides).length > 0;

  const mode = val('voice') ? 'voice' : 'scroll';
  const countFromMins = Math.round((val('countFrom') ?? 300) / 60);

  const si = (keys, label, value, children) => (
    <SettingItem
      keys={keys}
      label={label}
      value={value}
      overrides={overrides}
      onRevert={revert}
    >
      {children}
    </SettingItem>
  );

  return (
    <div className="sw-root">
      <div
        className="sw-titlebar"
        data-tauri-drag-region={!isMacOS || undefined}
        {...manualDragProps('settings', dragRef)}
      >
        <span className="sw-title">{t('prompter.title')}</span>
      </div>

      <div className="sw-body">
        {si(
          'voice',
          t('reading.tracking'),
          null,
          <>
            <Segmented
              size="md"
              options={[
                { value: 'voice', label: t('reading.voice'), icon: <Mic size={14} /> },
                { value: 'scroll', label: t('reading.scroll'), icon: <TimerIcon size={14} /> },
              ]}
              value={mode}
              onChange={(m) => {
                const on = m === 'voice';
                if (on && voiceAvailable) requestMicPermission();
                set('voice', on);
              }}
            />
            <div className="sw-mode-detail">
              {mode === 'voice' ? (
                <span className={'sw-mode-note' + (voiceAvailable ? '' : ' warn')}>
                  {voiceAvailable ? (
                    <>
                      <Mic size={12} /> {t('reading.scrollFollowsSpeech')}
                    </>
                  ) : (
                    <>
                      <MicOff size={12} /> {t('reading.micUnavailable')}
                    </>
                  )}
                </span>
              ) : (
                si(
                  'speed',
                  t('reading.scrollSpeed'),
                  `${val('speed')} wpm`,
                  <input
                    type="range"
                    className="er-slider"
                    min={80}
                    max={220}
                    value={val('speed')}
                    aria-label={t('reading.scrollSpeed')}
                    onChange={(e) => set('speed', +e.target.value)}
                    style={sliderFill(val('speed'), 80, 220)}
                  />
                )
              )}
            </div>
          </>
        )}
        {si(
          'size',
          t('reading.textSize'),
          `${val('size')}px`,
          <input
            type="range"
            className="er-slider"
            min={22}
            max={46}
            value={val('size')}
            aria-label={t('reading.textSize')}
            onChange={(e) => set('size', +e.target.value)}
            style={sliderFill(val('size'), 22, 46)}
          />
        )}
        {si(
          'bellWords',
          t('reading.highlightAhead'),
          `${val('bellWords')}`,
          <input
            type="range"
            className="er-slider"
            min={3}
            max={15}
            value={val('bellWords')}
            aria-label={t('reading.highlightAhead')}
            onChange={(e) => set('bellWords', +e.target.value)}
            style={sliderFill(val('bellWords'), 3, 15)}
          />
        )}
        {si(
          'opacity',
          t('reading.overlayOpacity'),
          `${val('opacity')}%`,
          <input
            type="range"
            className="er-slider"
            min={10}
            max={100}
            value={val('opacity')}
            aria-label={t('reading.overlayOpacity')}
            onChange={(e) => set('opacity', +e.target.value)}
            style={sliderFill(val('opacity'), 10, 100)}
          />
        )}
        {si(
          'blur',
          t('reading.glassBlur'),
          `${val('blur')}px`,
          <input
            type="range"
            className="er-slider"
            min={0}
            max={18}
            value={val('blur')}
            aria-label={t('reading.glassBlur')}
            onChange={(e) => set('blur', +e.target.value)}
            style={sliderFill(val('blur'), 0, 18)}
          />
        )}
        {si(
          'mirror',
          t('reading.mirrorText'),
          null,
          <Switch
            size="sm"
            checked={!!val('mirror')}
            label={t('reading.mirrorText')}
            onChange={(v) => set('mirror', v)}
          />
        )}
        {si(
          ['timerMode', 'countFrom'],
          t('reading.timer'),
          null,
          <>
            <Segmented
              size="md"
              options={[
                { value: 'off', label: t('reading.off') },
                { value: 'up', label: t('reading.countUp'), icon: <TimerIcon size={14} /> },
                { value: 'down', label: t('reading.countDown'), icon: <Hourglass size={14} /> },
              ]}
              value={val('timerMode')}
              onChange={(v) => set('timerMode', v)}
            />
            {val('timerMode') !== 'off' && (
              <div className="sw-sub-row">
                <span>
                  {val('timerMode') === 'down'
                    ? t('reading.countDownFrom')
                    : t('reading.warnAfter')}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    className="ep-time-input"
                    type="number"
                    min={1}
                    max={120}
                    value={countFromMins}
                    onChange={(e) => set('countFrom', Math.max(1, +e.target.value) * 60)}
                  />
                  <span className="sw-val">min</span>
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="sw-foot">
        <Button variant="secondary" block disabled={!hasAny} onClick={resetAll}>
          {t('prompter.resetAllToGlobal')}
        </Button>
        <Button variant="ghost" block onClick={resetLayout}>
          {t('prompter.resetLayout')}
        </Button>
      </div>
    </div>
  );
}
