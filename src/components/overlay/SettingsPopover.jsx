import { Timer as TimerIcon, Hourglass } from 'lucide-react';
import { Switch } from '../Switch';
import { Segmented } from '../Segmented';
import { requestMicPermission } from '../../lib/mic';
import { voiceAvailable } from '../../hooks/useVoiceTracking';

const sliderFill = (value, min, max) => {
  const pct = ((value - min) / (max - min)) * 100;
  return {
    background: `linear-gradient(90deg, var(--accent) ${pct}%, var(--surface-3) ${pct}%)`,
  };
};

function Range({ label, unit, min, max, value, onChange }) {
  return (
    <div className="ovs-row">
      <div className="ovs-label">
        {label}{' '}
        <span className="ovs-val">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        className="er-slider"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(+e.target.value)}
        style={sliderFill(value, min, max)}
      />
    </div>
  );
}

/**
 * Overlay settings — rendered inside the .ov-drawer which handles show/hide.
 * No floating, no click-outside — the gear button toggle owns open/close.
 */
export function SettingsPopover({ settings, onPatch }) {
  return (
    <div className="ov-settings">
      <h4>Prompter settings</h4>

      <div className="ovs-row">
        <div className="ovs-switch-row">
          Voice follow
          <Switch
            size="sm"
            checked={settings.voice}
            label="Voice follow"
            onChange={(v) => {
              if (v && voiceAvailable) requestMicPermission();
              onPatch({ voice: v });
            }}
          />
        </div>
      </div>
      {!settings.voice && (
        <Range
          label="Scroll speed"
          unit=" wpm"
          min={80}
          max={220}
          value={settings.speed}
          onChange={(v) => onPatch({ speed: v })}
        />
      )}
      <Range
        label="Text size"
        unit="px"
        min={22}
        max={46}
        value={settings.size}
        onChange={(v) => onPatch({ size: v })}
      />
      <Range
        label="Overlay opacity"
        unit="%"
        min={10}
        max={100}
        value={settings.opacity}
        onChange={(v) => onPatch({ opacity: v })}
      />
      <Range
        label="Glass blur"
        unit="px"
        min={0}
        max={18}
        value={settings.blur}
        onChange={(v) => onPatch({ blur: v })}
      />
      <div className="ovs-row">
        <div className="ovs-switch-row">
          Mirror text
          <Switch
            size="sm"
            checked={!!settings.mirror}
            label="Mirror text"
            onChange={(v) => onPatch({ mirror: v })}
          />
        </div>
      </div>
      <div className="ovs-row">
        <div className="ovs-label">Timer</div>
        <Segmented
          size="md"
          options={[
            { value: 'off', label: 'Off' },
            { value: 'up', label: 'Count up', icon: <TimerIcon size={14} /> },
            { value: 'down', label: 'Down', icon: <Hourglass size={14} /> },
          ]}
          value={settings.timerMode}
          onChange={(v) => onPatch({ timerMode: v })}
        />
      </div>
    </div>
  );
}
