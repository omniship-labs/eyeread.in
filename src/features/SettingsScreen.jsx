import { Switch } from '../components/Switch';
import { Slider } from '../components/Slider';
import { Segmented } from '../components/Segmented';
import { setOverlayContentProtected, showAboutWindow } from '../lib/tauri';

export function SettingsScreen({ settings, onSettings }) {
  const { position, opacity, mirror, hideFromShare, reduceMotion, highContrast } = settings;

  return (
    <div className="settings-main">
      <div className="settings-title">Settings</div>

      {/* ── Overlay behavior ── */}
      <div className="set-group">
        <div className="set-group-label">Overlay behavior</div>
        <div className="set-row">
          <div className="set-info">
            <b>Default position</b>
            <span>Where the overlay anchors on screen</span>
          </div>
          <Segmented
            size="sm"
            style={{ width: 200 }}
            options={[
              { value: 'top',    label: 'Top' },
              { value: 'center', label: 'Center' },
              { value: 'bottom', label: 'Bottom' },
            ]}
            value={position}
            onChange={(v) => onSettings({ position: v })}
          />
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>Default opacity</b>
            <span>Overlay transparency when first launched</span>
          </div>
          <Slider
            min={30}
            max={100}
            value={opacity}
            ariaLabel="Default opacity"
            onChange={(v) => onSettings({ opacity: v })}
            style={{ width: 140 }}
          />
          <span className="ep-val">{opacity}%</span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>Hide from screen-share</b>
            <span>Overlay is invisible to all capture software</span>
          </div>
          <Switch
            size="sm"
            checked={hideFromShare}
            label="Hide from screen-share"
            onChange={(v) => {
              onSettings({ hideFromShare: v });
              setOverlayContentProtected(v);
            }}
          />
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>Mirror text</b>
            <span>Flip horizontally for beam-splitter rigs</span>
          </div>
          <Switch
            size="sm"
            checked={mirror}
            label="Mirror text"
            onChange={(v) => onSettings({ mirror: v })}
          />
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
          <span className="hotkey">⌘ + Shift + E</span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>Interact / click-through</b>
            <span>Lets clicks pass through the glass — works system-wide</span>
          </div>
          <span className="hotkey">⌥ + E</span>
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
            <span className="hotkey">⌘ + +</span>
            <span className="hotkey">⌘ + −</span>
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
          <span className="set-link" onClick={showAboutWindow}>Open ↗</span>
        </div>
      </div>

    </div>
  );
}
