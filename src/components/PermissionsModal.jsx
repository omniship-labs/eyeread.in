import { useEffect } from 'react';
import { Mic } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isMacOS } from '../lib/tauri';
import { PermissionRow } from './PermissionRow';
import { Button } from './Button';
import './permissions-modal.less';

/**
 * PermissionsModal — shown when voice tracking is about to start but mic
 * and/or speech-recognition access isn't confirmed granted yet. Mirrors
 * LinuxShareConsent's backdrop/card shell, but hosts several independent
 * PermissionRows instead of one accept/cancel choice, since each permission
 * grants on its own and none of them block the others.
 *
 * Continue always works, even with permissions still missing — this is a
 * head start, not a hard gate. Once inside the overlay, its own retry chips
 * (mic-denied gesture healer, mic-issue Dictation link) keep handling
 * recovery for whichever session actually ends up live.
 */
export function PermissionsModal({
  micState,
  speechState,
  onGrantMic,
  onGrantSpeech,
  onOpenMicSettings,
  onOpenSpeechSettings,
  onOpenDictationSettings,
  onContinue,
  onCancel,
}) {
  const { t } = useTranslation();

  // Esc cancels, like every other dismissible surface in the app.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const micLabels = {
    granted: t('settings.micGranted'),
    denied: t('settings.micDenied'),
    prompt: t('settings.micPrompt'),
    unknown: t('settings.micUnknown'),
    openSettings: t('settings.openSystemSettings'),
    deniedHint: t('settings.micDeniedHint'),
  };
  const speechLabels = {
    granted: t('settings.speechGranted'),
    denied: t('settings.speechDenied'),
    unknown: t('settings.speechUnknown'),
    openSettings: t('settings.openSystemSettings'),
    deniedHint: t('settings.speechDeniedHint'),
  };

  return (
    <div className="pm-backdrop" onClick={onCancel} role="presentation">
      <div
        className="pm-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pm-head">
          <span className="pm-icon" aria-hidden="true">
            <Mic size={18} />
          </span>
          <span className="pm-title" id="pm-title">
            {t('permissions.title')}
          </span>
        </div>

        <p className="pm-intro">{t('permissions.intro')}</p>

        <div className="pm-rows">
          <PermissionRow
            label={t('settings.micAccess')}
            hint={t('settings.micAccessHint')}
            state={micState}
            stateLabels={micLabels}
            onRequest={onGrantMic}
            onOpenSettings={onOpenMicSettings}
          />
          <PermissionRow
            label={t('settings.speechAccess')}
            hint={t('settings.speechAccessHint')}
            state={speechState}
            stateLabels={speechLabels}
            onRequest={onGrantSpeech}
            onOpenSettings={onOpenSpeechSettings}
          />
          {isMacOS && (
            <div className="pm-row">
              <div className="pm-row-info">
                <b>{t('settings.dictationAccess')}</b>
                <span>{t('settings.dictationAccessHint')}</span>
              </div>
              <Button size="sm" variant="secondary" onClick={onOpenDictationSettings}>
                {t('settings.openSystemSettings')}
              </Button>
            </div>
          )}
        </div>

        <div className="pm-actions">
          <button type="button" className="pm-btn pm-btn-cancel" onClick={onCancel}>
            {t('permissions.cancel')}
          </button>
          <button
            type="button"
            className="pm-btn pm-btn-continue"
            onClick={onContinue}
            autoFocus
          >
            {t('permissions.continue')}
          </button>
        </div>
      </div>
    </div>
  );
}
