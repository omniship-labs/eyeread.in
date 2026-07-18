import { useEffect, useState } from 'react';
import { Heart, Mic, Timer as TimerIcon, Hourglass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/Button';
import { Switch } from '../components/Switch';
import { Slider } from '../components/Slider';
import { Segmented } from '../components/Segmented';
import { openExternal, showAboutWindow, isMacOS, isLinux, shieldActive } from '../lib/tauri';
import { useShareProtection } from '../hooks/useShareProtection';
import { ShieldToggle } from '../components/ShieldToggle';
import { PermissionRow } from '../components/PermissionRow';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { defaultSettings, OVERRIDABLE_KEYS, UPDATE_CHECK_HOURS_OPTIONS } from '../lib/store';
import { voiceAvailable } from '../hooks/useVoiceTracking';
import {
  requestMicPermission,
  getMicPermissionState,
  MIC_PRIVACY_SETTINGS_URL,
} from '../lib/mic';
import {
  requestSpeechRecognitionPermission,
  getSpeechPermissionState,
  SPEECH_PRIVACY_SETTINGS_URL,
  DICTATION_SETTINGS_URL,
} from '../lib/speech';

// OmniShip Labs' single fiscal home — same collective the site and
// .github/FUNDING.yml point at.
const OC_URL = 'https://opencollective.com/omniship';

function getAppVersion() {
  return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
}

// Same-day → just the time; otherwise date + time, so a check from
// yesterday (app left open overnight) doesn't read as "3:14 PM" with no date.
function formatTimestamp(ms) {
  const d = new Date(ms);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
}

export function SettingsScreen({ settings, onSettings, update }) {
  const { t } = useTranslation();
  const {
    position,
    hideFromShare,
    reduceMotion,
    highContrast,
    dyslexicFont,
    uiScale = 100,
    voice,
    keepMicOpen,
    speed,
    size,
    opacity,
    blur,
    mirror,
    timerMode,
    countFrom,
    updateCheckHours = 6,
  } = settings;

  const mode = voice ? 'voice' : 'scroll';
  const countFromMins = Math.round((countFrom ?? 300) / 60);

  const { setShielded, consentModal } = useShareProtection(settings, onSettings);

  // Hotkey hint symbols differ per platform (⌘/⌥ on macOS, Ctrl/Alt elsewhere).
  const modKey = isMacOS ? '⌘' : 'Ctrl';
  const altKey = isMacOS ? '⌥' : 'Alt';

  // Describe the screen-share state, flagging Linux as best-effort.
  const shareHint = isLinux
    ? t('settings.shareLinux')
    : hideFromShare
      ? t('settings.shareHidden')
      : t('settings.shareVisible');

  const restoreDefaults = () => {
    onSettings(Object.fromEntries(OVERRIDABLE_KEYS.map((k) => [k, defaultSettings[k]])));
  };

  const [micState, setMicState] = useState('unknown');
  useEffect(() => {
    getMicPermissionState().then(setMicState);
  }, []);
  const [speechState, setSpeechState] = useState(getSpeechPermissionState);

  const micStateLabels = {
    granted: t('settings.micGranted'),
    denied: t('settings.micDenied'),
    prompt: t('settings.micPrompt'),
    unknown: t('settings.micUnknown'),
    openSettings: t('settings.openSystemSettings'),
  };
  const speechStateLabels = {
    granted: t('settings.speechGranted'),
    denied: t('settings.speechDenied'),
    unknown: t('settings.speechUnknown'),
    openSettings: t('settings.openSystemSettings'),
  };

  return (
    <div className="settings-main">
      <div className="settings-title">{t('settings.title')}</div>

      {/* ── Overlay behavior ── */}
      <div className="set-group">
        <div className="set-group-label">{t('settings.overlay')}</div>
        <div className="set-row">
          <div className="set-info">
            <b>{t('settings.defaultPosition')}</b>
            <span>{t('settings.defaultPositionHint')}</span>
          </div>
          <Segmented
            size="sm"
            options={[
              { value: 'top', label: t('settings.positionTop') },
              { value: 'center', label: t('settings.positionCenter') },
              { value: 'bottom', label: t('settings.positionBottom') },
            ]}
            value={position}
            onChange={(v) => onSettings({ position: v })}
          />
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>{t('settings.hideFromShare')}</b>
            <span>{shareHint}</span>
          </div>
          <ShieldToggle shielded={shieldActive(settings)} onChange={setShielded} />
        </div>
      </div>

      {/* ── Permissions ── */}
      <div className="set-group">
        <div className="set-group-label">{t('settings.permissions')}</div>
        <PermissionRow
          label={t('settings.micAccess')}
          hint={t('settings.micAccessHint')}
          state={micState}
          stateLabels={micStateLabels}
          onRequest={async () =>
            setMicState((await requestMicPermission()) ? 'granted' : 'denied')
          }
          onOpenSettings={() => isMacOS && openExternal(MIC_PRIVACY_SETTINGS_URL)}
        />
        <PermissionRow
          label={t('settings.speechAccess')}
          hint={t('settings.speechAccessHint')}
          state={speechState}
          stateLabels={speechStateLabels}
          onRequest={async () =>
            setSpeechState((await requestSpeechRecognitionPermission()) ? 'granted' : 'denied')
          }
          onOpenSettings={() => isMacOS && openExternal(SPEECH_PRIVACY_SETTINGS_URL)}
        />
        {isMacOS && (
          <div className="set-row">
            <div className="set-info">
              <b>{t('settings.dictationAccess')}</b>
              <span>{t('settings.dictationAccessHint')}</span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => openExternal(DICTATION_SETTINGS_URL)}
            >
              {t('settings.openSystemSettings')}
            </Button>
          </div>
        )}
      </div>

      {/* ── Reading defaults ── */}
      <div className="set-group">
        <div className="set-group-label">{t('settings.readingDefaults')}</div>
        <div className="set-row">
          <div className="set-info">
            <b>{t('settings.trackingMode')}</b>
            <span>{t('settings.trackingModeHint')}</span>
          </div>
          <Segmented
            size="sm"
            options={[
              { value: 'voice', label: t('reading.voice'), icon: <Mic size={13} /> },
              { value: 'scroll', label: t('reading.scroll'), icon: <TimerIcon size={13} /> },
            ]}
            value={mode}
            onChange={(m) => {
              const on = m === 'voice';
              if (on && voiceAvailable) {
                requestMicPermission().then((granted) => onSettings({ voice: granted }));
              } else {
                onSettings({ voice: on });
              }
            }}
          />
        </div>
        {voice && (
          <div className="set-row">
            <div className="set-info">
              <b>{t('settings.keepMicOpen')}</b>
              <span>{t('settings.keepMicOpenHint')}</span>
            </div>
            <Switch
              size="sm"
              checked={!!keepMicOpen}
              label={t('settings.keepMicOpen')}
              onChange={(v) => onSettings({ keepMicOpen: v })}
            />
          </div>
        )}
        {!voice && (
          <div className="set-row">
            <div className="set-info">
              <b>{t('reading.scrollSpeed')}</b>
              <span>{t('settings.scrollSpeedHint')}</span>
            </div>
            <Slider
              min={80}
              max={220}
              value={speed}
              ariaLabel={t('reading.scrollSpeed')}
              onChange={(v) => onSettings({ speed: v })}
              style={{ width: 140 }}
            />
            <span className="ep-val">{speed} wpm</span>
          </div>
        )}
        <div className="set-row">
          <div className="set-info">
            <b>{t('reading.textSize')}</b>
            <span>{t('settings.textSizeHint')}</span>
          </div>
          <Slider
            min={22}
            max={52}
            value={size}
            ariaLabel={t('reading.textSize')}
            onChange={(v) => onSettings({ size: v })}
            style={{ width: 140 }}
          />
          <span className="ep-val">{size}px</span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>{t('reading.overlayOpacity')}</b>
            <span>{t('settings.overlayOpacityHint')}</span>
          </div>
          <Slider
            min={0}
            max={100}
            value={opacity}
            ariaLabel={t('reading.overlayOpacity')}
            onChange={(v) => onSettings({ opacity: v })}
            style={{ width: 140 }}
          />
          <span className="ep-val">{opacity}%</span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>{t('reading.glassBlur')}</b>
            <span>{t('settings.glassBlurHint')}</span>
          </div>
          <Slider
            min={0}
            max={18}
            value={blur}
            ariaLabel={t('reading.glassBlur')}
            onChange={(v) => onSettings({ blur: v })}
            style={{ width: 140 }}
          />
          <span className="ep-val">{blur}px</span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>{t('reading.mirrorText')}</b>
            <span>{t('settings.mirrorTextHint')}</span>
          </div>
          <Switch
            size="sm"
            checked={!!mirror}
            label={t('reading.mirrorText')}
            onChange={(v) => onSettings({ mirror: v })}
          />
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>{t('reading.timer')}</b>
            <span>{t('settings.timerHint')}</span>
          </div>
          <Segmented
            size="sm"
            options={[
              { value: 'off', label: t('reading.off') },
              { value: 'up', label: t('reading.countUp'), icon: <TimerIcon size={13} /> },
              { value: 'down', label: t('reading.countDown'), icon: <Hourglass size={13} /> },
            ]}
            value={timerMode}
            onChange={(v) => onSettings({ timerMode: v })}
          />
        </div>
        {timerMode !== 'off' && (
          <div className="set-row">
            <div className="set-info">
              <b>
                {timerMode === 'down' ? t('reading.countDownFrom') : t('reading.warnAfter')}
              </b>
            </div>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                className="ep-time-input"
                type="number"
                min={1}
                max={120}
                aria-label={
                  timerMode === 'down' ? t('reading.countDownFrom') : t('reading.warnAfter')
                }
                value={countFromMins}
                onChange={(e) => onSettings({ countFrom: Math.max(1, +e.target.value) * 60 })}
              />
              <span className="ep-val">min</span>
            </span>
          </div>
        )}
        <div className="set-row">
          <div className="set-info">
            <b>{t('settings.restoreDefaults')}</b>
            <span>{t('settings.restoreDefaultsHint')}</span>
          </div>
          <Button variant="link" onClick={restoreDefaults}>
            {t('settings.reset')}
          </Button>
        </div>
      </div>

      {/* ── Language ── */}
      <div className="set-group">
        <div className="set-group-label">{t('settings.languageGroup')}</div>
        <div className="set-row">
          <div className="set-info">
            <b>{t('switcher.label')}</b>
            <span>{t('settings.languageHint')}</span>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      {/* ── Accessibility ── */}
      <div className="set-group">
        <div className="set-group-label">{t('settings.accessibility')}</div>
        <div className="set-row">
          <div className="set-info">
            <b>{t('settings.reduceMotion')}</b>
            <span>{t('settings.reduceMotionHint')}</span>
          </div>
          <Switch
            size="sm"
            checked={!!reduceMotion}
            label={t('settings.reduceMotion')}
            onChange={(v) => onSettings({ reduceMotion: v })}
          />
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>{t('settings.highContrast')}</b>
            <span>{t('settings.highContrastHint')}</span>
          </div>
          <Switch
            size="sm"
            checked={!!highContrast}
            label={t('settings.highContrast')}
            onChange={(v) => onSettings({ highContrast: v })}
          />
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>{t('settings.dyslexicFont')}</b>
            <span>{t('settings.dyslexicFontHint')}</span>
          </div>
          <Switch
            size="sm"
            checked={!!dyslexicFont}
            label={t('settings.dyslexicFont')}
            onChange={(v) => onSettings({ dyslexicFont: v })}
          />
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>{t('settings.appTextSize')}</b>
            <span>{t('settings.appTextSizeHint')}</span>
          </div>
          <Segmented
            size="sm"
            options={[
              { value: 90, label: t('settings.scaleSmall') },
              { value: 100, label: t('settings.scaleDefault') },
              { value: 115, label: t('settings.scaleLarge') },
              { value: 130, label: t('settings.scaleLarger') },
            ]}
            value={uiScale}
            onChange={(v) => onSettings({ uiScale: v })}
          />
        </div>
      </div>

      {/* ── Hotkeys ── */}
      <div className="set-group">
        <div className="set-group-label">{t('settings.hotkeys')}</div>
        <div className="set-row">
          <div className="set-info">
            <b>{t('settings.hkToggle')}</b>
            <span>{t('settings.hkToggleHint')}</span>
          </div>
          <span className="hotkey">{modKey} + Shift + E</span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>{t('settings.hkInteract')}</b>
            <span>{t('settings.hkInteractHint')}</span>
          </div>
          <span className="hotkey">{altKey} + Shift + E</span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>{t('settings.hkPlayPause')}</b>
            <span>{t('settings.hkFocusedHint')}</span>
          </div>
          <span className="hotkey">Space</span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>{t('settings.hkTextSize')}</b>
          </div>
          <span style={{ display: 'flex', gap: 8 }}>
            <span className="hotkey">{modKey} + +</span>
            <span className="hotkey">{modKey} + −</span>
          </span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>{t('settings.hkScrollSpeed')}</b>
          </div>
          <span style={{ display: 'flex', gap: 8 }}>
            <span className="hotkey">↑</span>
            <span className="hotkey">↓</span>
          </span>
        </div>
        <div className="set-row">
          <div className="set-info">
            <b>{t('settings.hkHide')}</b>
            <span>{t('settings.hkFocusedHint')}</span>
          </div>
          <span className="hotkey">Esc</span>
        </div>
      </div>

      {/* ── Support — the OmniShip "line" donation ask: plain voice, no
             urgency, one accent moment on the CTA. ── */}
      <div className="set-group">
        <div className="set-group-label">{t('settings.support')}</div>
        <div className="set-row">
          <div className="set-info">
            <b>{t('settings.donateTitle')}</b>
            <span>{t('settings.donateHint')}</span>
          </div>
          <Button size="sm" iconLeft={<Heart size={14} />} onClick={() => openExternal(OC_URL)}>
            {t('settings.donateCta')}
          </Button>
        </div>
      </div>

      {update && (
        <div className="set-group">
          <div className="set-group-label">{t('settings.updates')}</div>
          <div className="set-row">
            <div className="set-info">
              <b>{t('settings.currentVersion')}</b>
              <span>
                {update.status === 'checking' && t('settings.updateChecking')}
                {update.status === 'up_to_date' && t('settings.updateUpToDate')}
                {update.status === 'available' &&
                  t('settings.updateAvailable', { version: update.version })}
                {update.status === 'installing' && t('settings.updateInstalling')}
                {update.status === 'error' && t('settings.updateError')}
                {update.status === 'idle' && `v${getAppVersion()}`}
              </span>
              {(update.lastChecked || update.nextCheckAt) && (
                <span className="set-mono" style={{ display: 'block', marginTop: 2 }}>
                  {update.lastChecked &&
                    t('settings.updateLastChecked', {
                      time: formatTimestamp(update.lastChecked),
                    })}
                  {update.lastChecked && update.nextCheckAt && ' · '}
                  {update.nextCheckAt &&
                    t('settings.updateNextCheck', {
                      time: formatTimestamp(update.nextCheckAt),
                    })}
                </span>
              )}
            </div>
            {update.status === 'available' ? (
              <Button size="sm" onClick={update.install}>
                {t('settings.updateInstall')}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                disabled={update.status === 'checking' || update.status === 'installing'}
                onClick={update.check}
              >
                {t('settings.updateCheck')}
              </Button>
            )}
          </div>
          <div className="set-row">
            <div className="set-info">
              <b>{t('settings.updateCheckFrequency')}</b>
              <span>{t('settings.updateCheckFrequencyHint')}</span>
            </div>
            <Segmented
              size="sm"
              options={UPDATE_CHECK_HOURS_OPTIONS.map((h) => ({
                value: h,
                label:
                  h === 0
                    ? t('settings.updateFreqOff')
                    : t('settings.updateFreqHours', { count: h }),
              }))}
              value={updateCheckHours}
              onChange={(v) => onSettings({ updateCheckHours: v })}
            />
          </div>
        </div>
      )}

      <div className="set-group">
        <div className="set-group-label">{t('settings.about')}</div>
        <div className="set-row">
          <div className="set-info">
            <b>eyeread.in</b>
            <span>{t('settings.aboutHint')}</span>
          </div>
          <button type="button" className="set-link" onClick={showAboutWindow}>
            {t('settings.open')}
          </button>
        </div>
      </div>
      {consentModal}
    </div>
  );
}
