import { useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isMacOS } from '../lib/tauri';
import './shortcuts-modal.less';

/**
 * ShortcutsModal — the keyboard-shortcut reference, pulled out of the main
 * Settings list (where six read-only rows added length without adding
 * anything a user tunes) and into an on-demand modal. Mirrors the
 * PermissionsModal / LinuxShareConsent backdrop+card shell.
 */
export function ShortcutsModal({ onClose }) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const modKey = isMacOS ? '⌘' : 'Ctrl';
  const altKey = isMacOS ? '⌥' : 'Alt';

  return (
    <div className="ksm-backdrop" onClick={onClose} role="presentation">
      <div
        className="ksm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ksm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ksm-head">
          <span className="ksm-icon" aria-hidden="true">
            <Keyboard size={18} />
          </span>
          <span className="ksm-title" id="ksm-title">
            {t('settings.hotkeys')}
          </span>
          <button
            type="button"
            className="ksm-close"
            aria-label={t('settings.close')}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <div className="ksm-rows">
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
      </div>
    </div>
  );
}
