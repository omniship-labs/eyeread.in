import { Play } from 'lucide-react';
import { Slider } from '../components/Slider';
import { Switch } from '../components/Switch';
import { Segmented } from '../components/Segmented';
import { wordCount, readingMins } from '../lib/utils';
import { voiceAvailable } from '../hooks/useVoiceTracking';

import { requestMicPermission } from '../lib/mic';

export function Editor({ script, settings, onChange, onSettings, onStart }) {
  const { size, speed, timerMode, countFrom, voice } = settings;
  const countFromMins = Math.round((countFrom ?? 300) / 60);

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
            <span>
              ~{readingMins(script.text, speed)} min at {speed} wpm
            </span>
          </div>
        </div>
        <div className="ed-body">
          <textarea
            className="ed-textarea"
            value={script.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Paste or type your script here…"
          />

          {/* Right panel */}
          <div className="ed-panel">
            <button className="start-btn" onClick={onStart}>
              <Play size={16} />
              Start reading
            </button>

            <div className="ep-card">
              <div className="ep-label">Reading</div>
              <div className="ep-row">
                Text size<span className="ep-val">{size}px</span>
              </div>
              <Slider
                min={22}
                max={52}
                value={size}
                ariaLabel="Text size"
                onChange={(v) => onSettings({ size: v })}
                style={{ marginBottom: 12 }}
              />
              <div className="ep-row" style={{ marginBottom: voice ? 0 : 12 }}>
                Voice follow
                <Switch
                  size="sm"
                  checked={voice}
                  onChange={(v) => {
                    if (v && voiceAvailable) requestMicPermission();
                    onSettings({ voice: v });
                  }}
                  label="Voice follow"
                />
              </div>
              {!voice && (
                <>
                  <div className="ep-row" style={{ marginBottom: 0 }}>
                    Scroll speed<span className="ep-val">{speed} wpm</span>
                  </div>
                  <Slider
                    min={80}
                    max={220}
                    value={speed}
                    ariaLabel="Scroll speed"
                    onChange={(v) => onSettings({ speed: v })}
                  />
                </>
              )}
              {!voiceAvailable && voice && (
                <div style={{ fontSize: 11, color: 'var(--warning)', marginTop: 8 }}>
                  Voice not available in this environment — scroll will pause when enabled.
                </div>
              )}
            </div>

            <div className="ep-card">
              <div className="ep-label">Timer</div>
              <Segmented
                size="sm"
                options={[
                  { value: 'off', label: 'Off' },
                  { value: 'up', label: 'Up' },
                  { value: 'down', label: 'Down' },
                ]}
                value={timerMode}
                onChange={(v) => onSettings({ timerMode: v })}
              />
              {timerMode !== 'off' && (
                <div className="ep-row" style={{ marginTop: 12, marginBottom: 0 }}>
                  {timerMode === 'down' ? 'Count down from' : 'Warn after'}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      className="ep-time-input"
                      type="number"
                      min={1}
                      max={120}
                      value={countFromMins}
                      onChange={(e) => onSettings({ countFrom: Math.max(1, +e.target.value) * 60 })}
                    />
                    <span className="ep-val">min</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
