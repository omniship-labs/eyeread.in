import { Mic, Timer as TimerIcon, Hourglass } from 'lucide-react';
import { Button } from '../components/Button';
import { Switch } from '../components/Switch';
import { Slider } from '../components/Slider';
import { Segmented } from '../components/Segmented';
import { showAboutWindow, isMacOS, isLinux, shieldActive } from '../lib/tauri';
import { useShareProtection } from '../hooks/useShareProtection';
import { ShieldToggle } from '../components/ShieldToggle';
import { defaultSettings, OVERRIDABLE_KEYS } from '../lib/store';
import { voiceAvailable } from '../hooks/useVoiceTracking';
import { requestMicPermission } from '../lib/mic';

export function SettingsScreen({ settings, onSettings }) {
  const {
    position,
    hideFromShare,
    reduceMotion,
    highContrast,
    voice,
    speed,
    size,
    opacity,
    blur,
    mirror,
    timerMode,
    countFrom,
  } = settings;

  const mode = voice ? 'voice' : 'scroll';
  const countFromMins = Math.round((countFrom ?? 300) / 60);

  const { setShielded, consentModal } = useShareProtection(settings, onSettings);

  // Hotkey hint symbols differ per platform (⌘/⌥ on macOS, Ctrl/Alt elsewhere).
  const modKey = isMacOS ? '⌘' : 'Ctrl';
  const altKey = isMacOS ? '⌥' : 'Alt';

  // Describe the screen-share state, flagging Linux as best-effort.
  const shareHint = isLinux
    ? 'Experimental on Linux — depends on your compositor'
    : hideFromShare
      ? 'Hidden from screen-share'
      : 'Visible to screen-share';

  const restoreDefaults = () => {
    onSettings(Object.fromEntries(OVERRIDABLE_KEYS.map((k) => [k, defaultSettings[k]])));
  };

  return (
    <div className="settings-main">
      <div className="settings-title">Settings</div>

      {/* ── Overlay behavior ── */}
      <div className="set-group">
        <div className="set-group-label">Overlay</div>
        <div className="set-row">
          <div className="set-info">
            <b>Default position</b>
            <span>Where the overlay anchors on screen</span>
          </div>
          <Segmented
            size="sm"
            options={[
              { value: 'top', label: 'Top' },
              { value: 'center', label: 'Center' },
              { value: 'bottom', label: 'Bottom' },
            ]}
            value={position}
            onChange={(v) => onSettings({ position: v })}
          />
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>Hide from screen-share</b>
            <span>{shareHint}</span>
          </div>
          <ShieldToggle shielded={shieldActive(settings)} onChange={setShielded} />
        </div>
      </div>

      {/* ── Reading defaults ── */}
      <div className="set-group">
        <div className="set-group-label">Reading defaults</div>
        <div className="set-row">
          <div className="set-info">
            <b>Tracking mode</b>
            <span>How the prompter follows your pace</span>
          </div>
          <Segmented
            size="sm"
            options={[
              { value: 'voice', label: 'Voice', icon: <Mic size={13} /> },
              { value: 'scroll', label: 'Scroll', icon: <TimerIcon size={13} /> },
            ]}
            value={mode}
            onChange={(m) => {
              const on = m === 'voice';
              if (on && voiceAvailable) requestMicPermission();
              onSettings({ voice: on });
            }}
          />
        </div>
        {!voice && (
          <div className="set-row">
            <div className="set-info">
              <b>Scroll speed</b>
              <span>Default words-per-minute when not voice-tracking</span>
            </div>
            <Slider
              min={80}
              max={220}
              value={speed}
              ariaLabel="Scroll speed"
              onChange={(v) => onSettings({ speed: v })}
              style={{ width: 140 }}
            />
            <span className="ep-val">{speed} wpm</span>
          </div>
        )}
        <div className="set-row">
          <div className="set-info">
            <b>Text size</b>
            <span>Default font size in the overlay</span>
          </div>
          <Slider
            min={22}
            max={52}
            value={size}
            ariaLabel="Text size"
            onChange={(v) => onSettings({ size: v })}
            style={{ width: 140 }}
          />
          <span className="ep-val">{size}px</span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>Overlay opacity</b>
            <span>Transparency when first launched</span>
          </div>
          <Slider
            min={10}
            max={100}
            value={opacity}
            ariaLabel="Overlay opacity"
            onChange={(v) => onSettings({ opacity: v })}
            style={{ width: 140 }}
          />
          <span className="ep-val">{opacity}%</span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>Glass blur</b>
            <span>Backdrop blur intensity behind the panel</span>
          </div>
          <Slider
            min={0}
            max={18}
            value={blur}
            ariaLabel="Glass blur"
            onChange={(v) => onSettings({ blur: v })}
            style={{ width: 140 }}
          />
          <span className="ep-val">{blur}px</span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>Mirror text</b>
            <span>Flip horizontally for beam-splitter rigs</span>
          </div>
          <Switch
            size="sm"
            checked={!!mirror}
            label="Mirror text"
            onChange={(v) => onSettings({ mirror: v })}
          />
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>Timer</b>
            <span>Timer mode shown in the overlay</span>
          </div>
          <Segmented
            size="sm"
            options={[
              { value: 'off', label: 'Off' },
              { value: 'up', label: 'Count up', icon: <TimerIcon size={13} /> },
              { value: 'down', label: 'Count down', icon: <Hourglass size={13} /> },
            ]}
            value={timerMode}
            onChange={(v) => onSettings({ timerMode: v })}
          />
        </div>
        {timerMode !== 'off' && (
          <div className="set-row">
            <div className="set-info">
              <b>{timerMode === 'down' ? 'Count down from' : 'Warn after'}</b>
            </div>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
        <div className="set-row">
          <div className="set-info">
            <b>Restore defaults</b>
            <span>Reset all reading defaults to built-in values</span>
          </div>
          <Button variant="link" onClick={restoreDefaults}>
            Reset ↺
          </Button>
        </div>
      </div>

      {/* ── Accessibility ── */}
      <div className="set-group">
        <div className="set-group-label">Accessibility</div>
        <div className="set-row">
          <div className="set-info">
            <b>Reduce motion</b>
            <span>Disables easing and smooth-scroll animations in the overlay</span>
          </div>
          <Switch
            size="sm"
            checked={!!reduceMotion}
            label="Reduce motion"
            onChange={(v) => onSettings({ reduceMotion: v })}
          />
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>High contrast</b>
            <span>Stronger text shadow for legibility over complex backgrounds</span>
          </div>
          <Switch
            size="sm"
            checked={!!highContrast}
            label="High contrast"
            onChange={(v) => onSettings({ highContrast: v })}
          />
        </div>
      </div>

      {/* ── Hotkeys ── */}
      <div className="set-group">
        <div className="set-group-label">Hotkeys</div>
        <div className="set-row">
          <div className="set-info">
            <b>Show / hide overlay</b>
            <span>Toggle the prompter — works system-wide</span>
          </div>
          <span className="hotkey">{modKey} + Shift + E</span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>Interact / click-through</b>
            <span>Lets clicks pass through the glass — works system-wide</span>
          </div>
          <span className="hotkey">{altKey} + E</span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>Play / pause scroll</b>
            <span>While the overlay is focused</span>
          </div>
          <span className="hotkey">Space</span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>Increase / decrease text size</b>
          </div>
          <span style={{ display: 'flex', gap: 8 }}>
            <span className="hotkey">{modKey} + +</span>
            <span className="hotkey">{modKey} + −</span>
          </span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>Scroll speed up / down</b>
          </div>
          <span style={{ display: 'flex', gap: 8 }}>
            <span className="hotkey">↑</span>
            <span className="hotkey">↓</span>
          </span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>Hide overlay</b>
            <span>While the overlay is focused</span>
          </div>
          <span className="hotkey">Esc</span>
        </div>
      </div>

      <div className="set-group">
        <div className="set-group-label">About</div>
        <div className="set-row">
          <div className="set-info">
            <b>eyeread.in</b>
            <span>Version, credits, and legal</span>
          </div>
          <span className="set-link" onClick={showAboutWindow}>
            Open ↗
          </span>
        </div>
      </div>
      {consentModal}
    </div>
  );
}
