import { useState, useCallback } from 'react';
import { Switch } from '../components/Switch';
import { Slider } from '../components/Slider';
import { Segmented } from '../components/Segmented';
import { openExternal, setOverlayContentProtected, checkForUpdate, installUpdate, isTauri } from '../lib/tauri';

const REPO_URL = 'https://github.com/omniship-labs/eyeread.in';
const DONATE_URL = 'https://opencollective.com/omniship';
const TERMS_URL = 'https://github.com/omniship-labs/eyeread.in/blob/main/TERMS.md';
const PRIVACY_URL = 'https://github.com/omniship-labs/eyeread.in/blob/main/PRIVACY.md';

export function SettingsScreen({ settings, onSettings }) {
  const { position, opacity, mirror, hideFromShare } = settings;

  // ---- update checker --------------------------------------------------------
  const [updateStatus, setUpdateStatus] = useState(null); // null | 'checking' | 'up_to_date' | { version }
  const [installing, setInstalling] = useState(false);

  const handleCheckUpdate = useCallback(async () => {
    setUpdateStatus('checking');
    try {
      const result = await checkForUpdate();
      if (result.status === 'update_available') {
        setUpdateStatus({ version: result.version });
      } else {
        setUpdateStatus('up_to_date');
      }
    } catch {
      setUpdateStatus('up_to_date');
    }
  }, []);

  const handleInstallUpdate = useCallback(async () => {
    setInstalling(true);
    try {
      await installUpdate();
    } catch {
      setInstalling(false);
    }
  }, []);

  return (
    <div className="settings-main">
      <div className="settings-title">Settings</div>

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
            <b>Increase text size</b>
            <span></span>
          </div>
          <span className="hotkey">⌘ + +</span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>Decrease text size</b>
            <span></span>
          </div>
          <span className="hotkey">⌘ + −</span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>Scroll speed up</b>
            <span></span>
          </div>
          <span className="hotkey">↑</span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>Scroll speed down</b>
            <span></span>
          </div>
          <span className="hotkey">↓</span>
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
            <b>Version</b>
            <span>eyeread.in for macOS · by OmniShip</span>
          </div>
          <span className="set-mono">
            {/* __RELEASE_CHANNEL__ is injected by Vite at build time */}
            {(() => {
              try {
                return typeof __RELEASE_CHANNEL__ !== 'undefined' && __RELEASE_CHANNEL__ !== 'stable'
                  ? `0.1.0 · ${__RELEASE_CHANNEL__}`
                  : '0.1.0';
              } catch { return '0.1.0'; }
            })()}
          </span>
        </div>
        {isTauri && (
          <div className="set-row">
            <div className="set-info">
              <b>Updates</b>
              <span>
                {updateStatus === null && 'Check for the latest version'}
                {updateStatus === 'checking' && 'Checking…'}
                {updateStatus === 'up_to_date' && "You're on the latest version"}
                {updateStatus !== null && typeof updateStatus === 'object' && `v${updateStatus.version} is available`}
              </span>
            </div>
            {updateStatus === null && (
              <span className="set-link" onClick={handleCheckUpdate}>Check now</span>
            )}
            {updateStatus === 'checking' && (
              <span className="set-mono" style={{ opacity: 0.5 }}>…</span>
            )}
            {updateStatus === 'up_to_date' && (
              <span className="set-link" onClick={handleCheckUpdate}>Check again</span>
            )}
            {updateStatus !== null && typeof updateStatus === 'object' && (
              <span
                className="set-link"
                style={{ color: 'var(--accent)' }}
                onClick={installing ? undefined : handleInstallUpdate}
              >
                {installing ? 'Installing…' : 'Install & restart'}
              </span>
            )}
          </div>
        )}
        <div className="set-row">
          <div className="set-info">
            <b>License</b>
            <span>Source-available — converts to AGPL-3.0 two years after each release</span>
          </div>
          <span className="set-mono">BUSL-1.1</span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>Source code</b>
            <span>github.com/omniship-labs/eyeread.in</span>
          </div>
          <span className="set-link" onClick={() => openExternal(REPO_URL)}>
            GitHub ↗
          </span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>Legal</b>
            <span>Terms of use and privacy policy</span>
          </div>
          <span style={{ display: 'flex', gap: 12 }}>
            <span className="set-link" onClick={() => openExternal(TERMS_URL)}>Terms ↗</span>
            <span className="set-link" onClick={() => openExternal(PRIVACY_URL)}>Privacy ↗</span>
          </span>
        </div>
        <div className="set-row" style={{ justifyContent: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
            Built with ❤️ by OmniShip
          </span>
        </div>
      </div>
    </div>
  );
}
