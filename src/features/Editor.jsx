import { Play, Mic, MicOff, Timer as TimerIcon, Undo2 } from 'lucide-react';
import { Button } from '../components/Button';
import { Slider } from '../components/Slider';
import { Switch } from '../components/Switch';
import { Segmented } from '../components/Segmented';
import { SettingItem } from '../components/SettingItem';
import { wordCount, readingMins } from '../lib/utils';
import { voiceAvailable } from '../hooks/useVoiceTracking';
import { requestMicPermission } from '../lib/mic';
import { resolveSettings } from '../lib/store';

const LANGUAGES = [
  { value: 'en',    label: 'English' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es',    label: 'Español' },
  { value: 'fr',    label: 'Français' },
  { value: 'de',    label: 'Deutsch' },
  { value: 'it',    label: 'Italiano' },
  { value: 'pt',    label: 'Português' },
  { value: 'nl',    label: 'Nederlands' },
  { value: 'pl',    label: 'Polski' },
  { value: 'ru',    label: 'Русский' },
  { value: 'ar',    label: 'العربية' },
  { value: 'he',    label: 'עברית' },
  { value: 'ja',    label: '日本語' },
  { value: 'ko',    label: '한국어' },
  { value: 'zh-CN', label: '中文（简体）' },
  { value: 'zh-TW', label: '中文（繁體）' },
  { value: 'hi',    label: 'हिन्दी' },
];

export function Editor({ script, settings, onChange, onScriptSettings, onResetScript, onStart }) {
  const overrides = script.settingsOverrides ?? {};
  const effective = resolveSettings(settings, overrides);
  const { size, speed, voice, opacity, blur, mirror } = effective;

  const set = (k, v) => onScriptSettings({ ...overrides, [k]: v });
  const revert = (...keys) => { const n = { ...overrides }; keys.forEach((k) => delete n[k]); onScriptSettings(n); };
  const hasAny = Object.keys(overrides).length > 0;

  const mode = voice ? 'voice' : 'scroll';
  const countFromMins = Math.round((effective.countFrom ?? 300) / 60);

  const si = (keys, label, value, children) => (
    <SettingItem keys={keys} label={label} value={value} overrides={overrides} onRevert={revert}>
      {children}
    </SettingItem>
  );

  return (
    <div className="editor">
      <div className="ed-main">
        <div className="ed-topbar">
          <input
            className="ed-title"
            value={script.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
          <div className="ed-stats">
            <span>{wordCount(script.text)}w</span>
            <span>~{readingMins(script.text, speed)} min at {speed} wpm</span>
          </div>
        </div>
        <div className="ed-body">
          <textarea
            className="ed-textarea"
            value={script.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Paste or type your script here…"
          />

          <div className="ed-panel">
            <Button block iconLeft={<Play size={16} />} onClick={onStart}>
              Start reading
            </Button>

            <div className="ep-card">
              <div className="ep-label">
                Reading
                <Button
                  variant="link"
                  style={{ visibility: hasAny ? 'visible' : 'hidden', fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}
                  onClick={onResetScript}
                >
                  Reset all to global
                </Button>
              </div>

              {si('voice', 'Tracking', null,
                <>
                  <Segmented
                    size="sm"
                    style={{ width: '100%', marginBottom: 0 }}
                    options={[
                      { value: 'voice',  label: 'Voice',  icon: <Mic size={14} /> },
                      { value: 'scroll', label: 'Scroll', icon: <TimerIcon size={14} /> },
                    ]}
                    value={mode}
                    onChange={(m) => {
                      const on = m === 'voice';
                      if (on && voiceAvailable) requestMicPermission();
                      set('voice', on);
                    }}
                  />
                  <div className="ep-mode-detail">
                    {voice ? (
                      <span className={'ep-mode-note' + (voiceAvailable ? '' : ' warn')}>
                        {voiceAvailable
                          ? <><Mic size={12} /> Scroll follows your speech</>
                          : <><MicOff size={12} /> Mic unavailable — scroll will pause</>}
                      </span>
                    ) : (
                      si('speed', 'Scroll speed', `${speed} wpm`,
                        <Slider min={80} max={220} value={speed} ariaLabel="Scroll speed" onChange={(v) => set('speed', v)} />
                      )
                    )}
                  </div>
                </>
              )}

              {si('size', 'Text size', `${size}px`,
                <Slider min={22} max={52} value={size} ariaLabel="Text size" onChange={(v) => set('size', v)} />
              )}

              {si('opacity', 'Overlay opacity', `${opacity}%`,
                <Slider min={10} max={100} value={opacity} ariaLabel="Overlay opacity" onChange={(v) => set('opacity', v)} />
              )}

              {si('blur', 'Glass blur', `${blur}px`,
                <Slider min={0} max={18} value={blur} ariaLabel="Glass blur" onChange={(v) => set('blur', v)} />
              )}

              {si('mirror', 'Mirror text', null,
                <Switch size="sm" checked={!!mirror} onChange={(v) => set('mirror', v)} label="Mirror text" />
              )}

              {si(['timerMode', 'countFrom'], 'Timer', null,
                <>
                  <Segmented
                    size="sm"
                    style={{ width: '100%' }}
                    options={[
                      { value: 'off',  label: 'Off' },
                      { value: 'up',   label: 'Up' },
                      { value: 'down', label: 'Down' },
                    ]}
                    value={effective.timerMode}
                    onChange={(v) => set('timerMode', v)}
                  />
                  {effective.timerMode !== 'off' && (
                    <div className="ep-row" style={{ marginTop: 10, marginBottom: 0 }}>
                      <span>{effective.timerMode === 'down' ? 'Count down from' : 'Warn after'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          className="ep-time-input"
                          type="number" min={1} max={120} value={countFromMins}
                          onChange={(e) => set('countFrom', Math.max(1, +e.target.value) * 60)}
                        />
                        <span className="ep-val">min</span>
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="ep-card">
              <div className="ep-label">Language</div>
              <select
                className="ep-select"
                value={script.language ?? 'en'}
                onChange={(e) => onChange({ language: e.target.value })}
              >
                {LANGUAGES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
