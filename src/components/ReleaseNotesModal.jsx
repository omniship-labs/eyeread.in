import { useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { renderReleaseNotesHtml } from '../lib/releaseNotes';
import './release-notes-modal.less';

/**
 * ReleaseNotesModal — "what's new" for the update currently available,
 * rendered from the same manifest body check_for_update already fetches
 * (previously discarded). Mirrors the ShortcutsModal / PermissionsModal
 * backdrop+card shell.
 */
export function ReleaseNotesModal({ version, notes, onClose }) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="rnm-backdrop" onClick={onClose} role="presentation">
      <div
        className="rnm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rnm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rnm-head">
          <span className="rnm-icon" aria-hidden="true">
            <Sparkles size={18} />
          </span>
          <span className="rnm-title" id="rnm-title">
            {t('settings.whatsNewTitle', { version })}
          </span>
          <button
            type="button"
            className="rnm-close"
            aria-label={t('settings.close')}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {notes ? (
          <div
            className="rnm-notes"
            dangerouslySetInnerHTML={{ __html: renderReleaseNotesHtml(notes) }}
          />
        ) : (
          <p className="rnm-empty">{t('settings.whatsNewEmpty')}</p>
        )}
      </div>
    </div>
  );
}
