import { Play, Mic, MicOff, Timer as TimerIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  { value: 'en', label: 'English' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Português' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'pl', label: 'Polski' },
  { value: 'ru', label: 'Русский' },
  { value: 'ar', label: 'العربية' },
  { value: 'he', label: 'עברית' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'zh-CN', label: '中文（简体）' },
  { value: 'zh-TW', label: '中文（繁體）' },
  { value: 'hi', label: 'हिन्दी' },
];

export function Editor({
  script,
  settings,
  onChange,
  onScriptSettings,
  onResetScript,
  onResetLayout,
  onStart,
}) {
  const { t } = useTranslation();
  const overrides = script.settingsOverrides ?? {};
  const effective = resolveSettings(settings, overrides);
  const { size, speed, voice, opacity, blur, mirror } = effective;

  const set = (k, v) => onScriptSettings({ ...overrides, [k]: v });
  const revert = (...keys) => {
    const n = { ...overrides };
    keys.forEach((k) => delete n[k]);
    onScriptSettings(n);
  };
  const hasAny = Object.keys(overrides).length > 0;

  const mode = voice ? 'voice' : 'scroll';
  const countFromMins = Math.round((effective.countFrom ?? 300) / 60);

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
    <div className="editor">
      <div className="ed-main">
        <div className="ed-topbar">
          <input
            className="ed-title"
            aria-label="Script title"
            value={script.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
          <div className="ed-stats">
            <span>{wordCount(script.text)}w</span>
            <span>
              {t('editor.readStats', { mins: readingMins(script.text, speed), wpm: speed })}
            </span>
          </div>
        </div>
        <div className="ed-body">
          <textarea
            className="ed-textarea"
            aria-label="Script text"
            value={script.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder={t('editor.textareaPlaceholder')}
          />

          <div className="ed-panel">
            <Button block iconLeft={<Play size={16} />} onClick={onStart}>
              {t('editor.startReading')}
            </Button>

            <div className="ep-card">
              <div className="ep-label">
                {t('editor.reading')}
                <Button
                  variant="link"
                  style={{
                    visibility: hasAny ? 'visible' : 'hidden',
                    fontSize: 10,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                  onClick={onResetScript}
                >
                  {t('editor.resetAllToGlobal')}
                </Button>
              </div>

              {si(
                'voice',
                t('reading.tracking'),
                null,
                <>
                  <Segmented
                    size="sm"
                    style={{ width: '100%', marginBottom: 0 }}
                    options={[
                      { value: 'voice', label: t('reading.voice'), icon: <Mic size={14} /> },
                      {
                        value: 'scroll',
                        label: t('reading.scroll'),
                        icon: <TimerIcon size={14} />,
                      },
                    ]}
                    value={mode}
                    onChange={(m) => {
                      const on = m === 'voice';
                      if (on && voiceAvailable) {
                        requestMicPermission().then((granted) => set('voice', granted));
                      } else {
                        set('voice', on);
                      }
                    }}
                  />
                  <div className="ep-mode-detail">
                    {voice ? (
                      <span className={'ep-mode-note' + (voiceAvailable ? '' : ' warn')}>
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
                        `${speed} wpm`,
                        <Slider
                          min={80}
                          max={220}
                          value={speed}
                          ariaLabel={t('reading.scrollSpeed')}
                          onChange={(v) => set('speed', v)}
                        />
                      )
                    )}
                  </div>
                </>
              )}

              {si(
                'size',
                t('reading.textSize'),
                `${size}px`,
                <Slider
                  min={22}
                  max={52}
                  value={size}
                  ariaLabel={t('reading.textSize')}
                  onChange={(v) => set('size', v)}
                />
              )}

              {si(
                'opacity',
                t('reading.overlayOpacity'),
                `${opacity}%`,
                <Slider
                  min={10}
                  max={100}
                  value={opacity}
                  ariaLabel={t('reading.overlayOpacity')}
                  onChange={(v) => set('opacity', v)}
                />
              )}

              {si(
                'blur',
                t('reading.glassBlur'),
                `${blur}px`,
                <Slider
                  min={0}
                  max={18}
                  value={blur}
                  ariaLabel={t('reading.glassBlur')}
                  onChange={(v) => set('blur', v)}
                />
              )}

              {si(
                'mirror',
                t('reading.mirrorText'),
                null,
                <Switch
                  size="sm"
                  checked={!!mirror}
                  onChange={(v) => set('mirror', v)}
                  label={t('reading.mirrorText')}
                />
              )}

              {si(
                ['timerMode', 'countFrom'],
                t('reading.timer'),
                null,
                <>
                  <Segmented
                    size="sm"
                    style={{ width: '100%' }}
                    options={[
                      { value: 'off', label: t('reading.off') },
                      { value: 'up', label: t('reading.up') },
                      { value: 'down', label: t('reading.down') },
                    ]}
                    value={effective.timerMode}
                    onChange={(v) => set('timerMode', v)}
                  />
                  {effective.timerMode !== 'off' && (
                    <div className="ep-row" style={{ marginTop: 10, marginBottom: 0 }}>
                      <span>
                        {effective.timerMode === 'down'
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
                        <span className="ep-val">min</span>
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="ep-card">
              <div className="ep-label">{t('editor.language')}</div>
              <select
                className="ep-select"
                aria-label="Script language"
                value={script.language ?? 'en'}
                onChange={(e) => onChange({ language: e.target.value })}
              >
                {LANGUAGES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {onResetLayout && (script.overlayPos || script.overlaySize) && (
              <Button variant="ghost" block onClick={onResetLayout}>
                {t('prompter.resetLayout')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
