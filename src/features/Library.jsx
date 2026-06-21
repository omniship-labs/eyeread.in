import { useState } from 'react';
import { Search, Plus, FileText, Type, Clock, Pin, Trash2 } from 'lucide-react';
import { wordCount, readingMins } from '../lib/utils';

const TABS = ['all', 'recent', 'pinned'];

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
        <div className="lib-title">Scripts</div>
        <div className="lib-search-row">
          <div className="lib-search">
            <Search size={16} />
            <input
              placeholder="Search scripts…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="lib-btn" onClick={onCreate} title="New script">
            <Plus size={16} />
            <span className="lib-btn-label">New script</span>
          </button>
        </div>
        <div className="lib-tabs">
          {TABS.map((t) => (
            <div
              key={t}
              className={'lib-tab' + (tab === t ? ' active' : '')}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </div>
          ))}
        </div>
      </div>
      <div className="lib-list">
        {list.length === 0 && (
          <div className="lib-empty">No scripts yet. Paste one to start.</div>
        )}
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
                    title={s.pinned ? 'Unpin' : 'Pin'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(s.id, !s.pinned);
                    }}
                  >
                    <Pin size={13} />
                  </button>
                  <button
                    className="sc-act"
                    title="Delete"
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
