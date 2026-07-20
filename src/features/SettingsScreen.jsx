import { useState } from 'react';
import { ArrowLeft, Heart, Mic, Timer as TimerIcon, Hourglass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/Button';
import { Switch } from '../components/Switch';
import { Slider } from '../components/Slider';
import { Segmented } from '../components/Segmented';
import { openExternal, showAboutWindow } from '../lib/tauri';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { defaultSettings, OVERRIDABLE_KEYS, UPDATE_CHECK_HOURS_OPTIONS } from '../lib/store';
import { voiceAvailable } from '../hooks/useVoiceTracking';
import { requestMicPermission } from '../lib/mic';

// OmniShip Labs' single fiscal home — same collective the site and
// .github/FUNDING.yml point at.
const OC_URL = 'https://opencollective.com/omniship';

// The site's release-history section already pages through the full GitHub
// Releases list (see site/src/hooks/useLatestReleases.js), so linking there
// covers every version between what's installed and what's available — a
// single-release in-app "what's new" view couldn't. Each entry is deep-linked
// (site/src/pages/Download.jsx gives each <details> an id={`v${version}`}
// and auto-opens/scrolls to it), so jump straight to the available version
// instead of just the top of the list.
const RELEASE_NOTES_URL = 'https://get.eyeread.in/download';

// Which of the two views a user last picked, remembered locally so it
// sticks across sessions without round-tripping through the settings store
// (this is a Settings-screen display preference, not a reading setting —
// the overlay/prompter never needs to know about it).
const MODE_KEY = 'eyeread.settingsMode';

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

export function SettingsScreen({
  settings,
  onSettings,
  update,
  onCheckPermissions,
  onReplayTour,
  onBack,
}) {
  const { t } = useTranslation();
  const {
    position,
    reduceMotion,
    highContrast,
    dyslexicFont,
    showIconLabels,
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

  const trackingMode = voice ? 'voice' : 'scroll';
  const countFromMins = Math.round((countFrom ?? 300) / 60);

  const [viewMode, setViewMode] = useState(() => localStorage.getItem(MODE_KEY) || 'simple');
  const advanced = viewMode === 'advanced';
  const setMode = (v) => {
    setViewMode(v);
    localStorage.setItem(MODE_KEY, v);
  };

  const restoreDefaults = () => {
    onSettings(Object.fromEntries(OVERRIDABLE_KEYS.map((k) => [k, defaultSettings[k]])));
  };

  return (
    <div className="settings-main">
      <div className="settings-head">
        <div className="settings-head-left">
          <button
            type="button"
            className="settings-back"
            onClick={onBack}
            aria-label={t('settings.back')}
          >
            <ArrowLeft size={16} />
          </button>
          <div className="settings-title">{t('settings.title')}</div>
        </div>
        <div className="settings-head-controls">
          <Segmented
            size="sm"
            options={[
              { value: 'simple', label: t('settings.simpleMode') },
              { value: 'advanced', label: t('settings.advancedMode') },
            ]}
            value={viewMode}
            onChange={setMode}
          />
        </div>
      </div>

      {/* ── About + Updates ── */}
      <div className="set-group">
        <div className="set-group-label">{t('settings.about')}</div>
        <div className="set-row">
          <div className="set-info">
            <b>eyeread.in</b>
            <span>{t('about.orgByline')}</span>
          </div>
          <button type="button" className="set-link" onClick={showAboutWindow}>
            {t('settings.open')}
          </button>
        </div>
        {onReplayTour && (
          <div className="set-row">
            <div className="set-info">
              <b>{t('settings.replayTour')}</b>
              <span>{t('settings.replayTourHint')}</span>
            </div>
            <Button size="sm" variant="secondary" onClick={onReplayTour}>
              {t('settings.replayTourCta')}
            </Button>
          </div>
        )}
        {update && (
          <>
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
                {update.status === 'available' && (
                  <button
                    type="button"
                    className="set-link"
                    style={{ display: 'block', marginTop: 2 }}
                    onClick={() => openExternal(`${RELEASE_NOTES_URL}#v${update.version}`)}
                  >
                    {t('settings.whatsNew')}
                  </button>
                )}
                {advanced && (update.lastChecked || update.nextCheckAt) && (
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
            {advanced && (
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
            )}
          </>
        )}
      </div>

      {/* ── Permissions (advanced: troubleshooting, not day-to-day) ── */}
      {advanced && (
        <div className="set-group">
          <div className="set-group-label">{t('settings.permissions')}</div>
          <div className="set-row">
            <div className="set-info">
              <b>{t('settings.voicePermissions')}</b>
              <span>{t('settings.voicePermissionsHint')}</span>
            </div>
            <Button size="sm" variant="secondary" onClick={onCheckPermissions}>
              {t('settings.checkPermissions')}
            </Button>
          </div>
        </div>
      )}

      {/* ── Reading defaults ── */}
      <div className="set-group">
        <div className="set-group-label">{t('settings.readingDefaults')}</div>
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
            <b>{t('settings.trackingMode')}</b>
            <span>{t('settings.trackingModeHint')}</span>
          </div>
          <Segmented
            size="sm"
            options={[
              { value: 'voice', label: t('reading.voice'), icon: <Mic size={13} /> },
              { value: 'scroll', label: t('reading.scroll'), icon: <TimerIcon size={13} /> },
            ]}
            value={trackingMode}
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
        {advanced && voice && (
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
        {advanced && (
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
        )}
        {advanced && (
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
        )}
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
        {advanced && (
          <div className="set-row">
            <div className="set-info">
              <b>{t('settings.restoreDefaults')}</b>
              <span>{t('settings.restoreDefaultsHint')}</span>
            </div>
            <Button variant="link" onClick={restoreDefaults}>
              {t('settings.reset')}
            </Button>
          </div>
        )}
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
            <b>{t('settings.showIconLabels')}</b>
            <span>{t('settings.showIconLabelsHint')}</span>
          </div>
          <Switch
            size="sm"
            checked={!!showIconLabels}
            label={t('settings.showIconLabels')}
            onChange={(v) => onSettings({ showIconLabels: v })}
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
    </div>
  );
}
