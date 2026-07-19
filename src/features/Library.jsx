import { useRef, useState } from 'react';
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
  const tabRefs = useRef([]);

  // Arrow-key roving between tabs (ARIA tablist keyboard pattern).
  const onTabKeyDown = (e) => {
    const i = TABS.indexOf(tab);
    let next;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    else return;
    e.preventDefault();
    setTab(TABS[next]);
    tabRefs.current[next]?.focus();
  };

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
      data-tour="library"
      style={width ? { width, minWidth: width, maxWidth: width } : undefined}
    >
      <div className="lib-top">
        <div className="lib-title">{t('library.title')}</div>
        <div className="lib-search-row">
          <div className="lib-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              aria-label={t('library.searchLabel')}
              placeholder={t('library.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            className="lib-btn"
            data-tour="new-script"
            onClick={onCreate}
            aria-label={t('library.newScript')}
          >
            <Plus size={16} aria-hidden="true" />
            <span className="lib-btn-label">{t('library.newScript')}</span>
          </button>
        </div>
        <div className="lib-tabs" role="tablist" aria-label={t('library.filterScripts')}>
          {TABS.map((tabKey, i) => (
            <button
              key={tabKey}
              ref={(el) => (tabRefs.current[i] = el)}
              type="button"
              role="tab"
              id={`lib-tab-${tabKey}`}
              aria-selected={tab === tabKey}
              aria-controls="lib-list"
              tabIndex={tab === tabKey ? 0 : -1}
              className={'lib-tab' + (tab === tabKey ? ' active' : '')}
              onClick={() => setTab(tabKey)}
              onKeyDown={onTabKeyDown}
            >
              {t(TAB_LABELS[tabKey])}
            </button>
          ))}
        </div>
      </div>
      <div
        className="lib-list"
        id="lib-list"
        role="tabpanel"
        aria-labelledby={`lib-tab-${tab}`}
      >
        {list.length === 0 && <div className="lib-empty">{t('library.empty')}</div>}
        {list.map((s) => (
          <div
            key={s.id}
            role="button"
            tabIndex={0}
            aria-current={selId === s.id ? 'true' : undefined}
            aria-label={t('library.cardLabel', {
              title: s.title,
              words: wordCount(s.text),
              mins: readingMins(s.text, settings.speed),
            })}
            className={'script-card' + (selId === s.id ? ' selected' : '')}
            onClick={() => onSelect(s.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(s.id);
              }
            }}
          >
            <div className={'sc-icon' + (s.tag === 'ready' ? ' live' : '')} aria-hidden="true">
              <FileText size={20} />
            </div>
            <div className="sc-body">
              <div className="sc-title">{s.title}</div>
              <div className="sc-footer">
                <div className="sc-stats">
                  <div className="sc-stat">
                    <Type size={11} aria-hidden="true" />
                    {wordCount(s.text)}w
                  </div>
                  <div className="sc-stat">
                    <Clock size={11} aria-hidden="true" />
                    {readingMins(s.text, settings.speed)}m
                  </div>
                </div>
                <div className="sc-actions">
                  <button
                    className={'sc-act' + (s.pinned ? ' sc-act-active' : '')}
                    data-tip={s.pinned ? t('library.unpin') : t('library.pin')}
                    aria-label={`${s.pinned ? t('library.unpin') : t('library.pin')}: ${s.title}`}
                    aria-pressed={!!s.pinned}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(s.id, !s.pinned);
                    }}
                  >
                    <Pin size={13} aria-hidden="true" />
                  </button>
                  <button
                    className="sc-act"
                    data-tip={t('library.delete')}
                    aria-label={`${t('library.delete')}: ${s.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(s.id);
                    }}
                  >
                    <Trash2 size={13} aria-hidden="true" />
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
