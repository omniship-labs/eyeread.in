import { useState } from 'react';
import { Search, Plus, FileText, Type, Clock, Pin, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { wordCount, readingMins } from '../lib/utils';

const TABS = ['all', 'recent', 'pinned'];
const TAB_LABELS = {
  all: 'library.tabAll',
  recent: 'library.tabRecent',
  pinned: 'library.tabPinned',
};

export function Library({
  scripts,
  selId,
  settings,
  onSelect,
  onCreate,
  onTogglePin,
  onDelete,
  width,
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');

  let list = scripts.filter(
    (s) =>
      !query ||
      s.title.toLowerCase().includes(query.toLowerCase()) ||
      s.text.toLowerCase().includes(query.toLowerCase())
  );
  if (tab === 'pinned') list = list.filter((s) => s.pinned);
  if (tab === 'recent') list = [...list].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);
  if (tab === 'all') list = [...list].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <div
      className="lib"
      style={width ? { width, minWidth: width, maxWidth: width } : undefined}
    >
      <div className="lib-top">
        <div className="lib-title">{t('library.title')}</div>
        <div className="lib-search-row">
          <div className="lib-search">
            <Search size={16} />
            <input
              placeholder={t('library.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="lib-btn" onClick={onCreate} title={t('library.newScript')}>
            <Plus size={16} />
            <span className="lib-btn-label">{t('library.newScript')}</span>
          </button>
        </div>
        <div className="lib-tabs">
          {TABS.map((tabKey) => (
            <div
              key={tabKey}
              className={'lib-tab' + (tab === tabKey ? ' active' : '')}
              onClick={() => setTab(tabKey)}
            >
              {t(TAB_LABELS[tabKey])}
            </div>
          ))}
        </div>
      </div>
      <div className="lib-list">
        {list.length === 0 && <div className="lib-empty">{t('library.empty')}</div>}
        {list.map((s) => (
          <div
            key={s.id}
            className={'script-card' + (selId === s.id ? ' selected' : '')}
            onClick={() => onSelect(s.id)}
          >
            <div className={'sc-icon' + (s.tag === 'ready' ? ' live' : '')}>
              <FileText size={20} />
            </div>
            <div className="sc-body">
              <div className="sc-title">{s.title}</div>
              <div className="sc-footer">
                <div className="sc-stats">
                  <div className="sc-stat">
                    <Type size={11} />
                    {wordCount(s.text)}w
                  </div>
                  <div className="sc-stat">
                    <Clock size={11} />
                    {readingMins(s.text, settings.speed)}m
                  </div>
                </div>
                <div className="sc-actions">
                  <button
                    className={'sc-act' + (s.pinned ? ' sc-act-active' : '')}
                    title={s.pinned ? t('library.unpin') : t('library.pin')}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(s.id, !s.pinned);
                    }}
                  >
                    <Pin size={13} />
                  </button>
                  <button
                    className="sc-act"
                    title={t('library.delete')}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(s.id);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
