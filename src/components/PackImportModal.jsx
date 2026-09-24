import { useEffect, useRef } from 'react';
import { FileUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { acceptAttribute } from '../lib/packs';
import './permissions-modal.less';

/**
 * PackImportModal — a pack with `files:import` asked for a file. The app
 * shows its own picker; the pack gets only the one file the user chooses
 * (name, type and contents, never a path or the folder). Nothing happens
 * until the user picks: Cancel is the default focus, and Esc/backdrop cancel.
 */
export function PackImportModal({ name, accept, onChoose, onCancel }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="pm-backdrop" onClick={onCancel} role="presentation">
      <div
        className="pm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pim-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pm-head">
          <span className="pm-icon" aria-hidden="true">
            <FileUp size={18} />
          </span>
          <span className="pm-title" id="pim-title">
            {t('packs.import.title', { name })}
          </span>
        </div>

        <p className="pm-intro">{t('packs.import.body')}</p>

        <input
          ref={inputRef}
          type="file"
          hidden
          accept={acceptAttribute(accept)}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onChoose(file);
          }}
        />

        <div className="pm-actions">
          <button type="button" className="pm-btn pm-btn-cancel" onClick={onCancel} autoFocus>
            {t('packs.import.cancel')}
          </button>
          <button
            type="button"
            className="pm-btn pm-btn-continue"
            onClick={() => inputRef.current?.click()}
          >
            {t('packs.import.choose')}
          </button>
        </div>
      </div>
    </div>
  );
}
