/**
 * VoiceDebugger — debug-only overlay showing live voice tracking state.
 * Mount anywhere inside OverlayWindow when DEBUG_VOICE=true.
 *
 * Shows:
 *  - Last heard words (raw from SR)
 *  - Each word: matched / skipped / stopped (no match in window)
 *  - Current pointer + active positions
 *  - Running log of events (last 30)
 */
import { useEffect, useRef, useState } from 'react';

const MAX_LOG = 40;

export function useVoiceDebugger() {
  const [log, setLog] = useState([]);
  const seq = useRef(0);

  const push = (entry) => {
    seq.current += 1;
    setLog((prev) => [
      { id: seq.current, ts: Date.now(), ...entry },
      ...prev,
    ].slice(0, MAX_LOG));
  };

  const logHeard = (words) => push({ type: 'heard', words });
  const logMatch = (heard, scriptWord, scriptIdx) => push({ type: 'match', heard, scriptWord, scriptIdx });
  const logSkip  = (heard, from, to) => push({ type: 'skip', heard, from, to, skipped: to - from - 1 });
  const logStop  = (heard, atIdx) => push({ type: 'stop', heard, atIdx });
  const logJump  = (from, to, reason) => push({ type: 'jump', from, to, reason });

  return { log, logHeard, logMatch, logSkip, logStop, logJump };
}

const TYPE_COLOR = {
  heard:  '#94a3b8',
  match:  '#4ade80',
  skip:   '#facc15',
  stop:   '#f87171',
  jump:   '#818cf8',
};

function relTime(ts) {
  const s = ((Date.now() - ts) / 1000).toFixed(1);
  return `${s}s ago`;
}

export function VoiceDebugger({ log, pointer, active, words }) {
  const bottomRef = useRef(null);

  // Keep scroll at top (newest first)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [log.length]);

  const scriptWord = (i) => words?.[i] ?? '—';

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <span style={styles.title}>VOICE DEBUG</span>
        <span style={styles.meta}>
          ptr <b style={{ color: '#818cf8' }}>{pointer}</b>
          {' · '}
          active <b style={{ color: '#4ade80' }}>{active}</b>
          {' · '}
          <span style={{ color: '#94a3b8' }}>&quot;{scriptWord(active)}&quot;</span>
        </span>
      </div>

      <div style={styles.log}>
        {log.map((e) => (
          <div key={e.id} style={{ ...styles.row, borderLeftColor: TYPE_COLOR[e.type] ?? '#555' }}>
            <span style={{ ...styles.tag, color: TYPE_COLOR[e.type] }}>{e.type}</span>
            <span style={styles.body}>{renderEntry(e, scriptWord)}</span>
            <span style={styles.time}>{relTime(e.ts)}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function renderEntry(e, sw) {
  switch (e.type) {
    case 'heard':
      return <>[{e.words.map((w, i) => <span key={i} style={styles.word}>{w}</span>)}]</>;
    case 'match':
      return <>heard <q style={{ color: '#4ade80' }}>{e.heard}</q> → script[{e.scriptIdx}] <q style={{ color: '#4ade80' }}>{e.scriptWord}</q></>;
    case 'skip':
      return <>heard <q style={{ color: '#facc15' }}>{e.heard}</q> jumped {e.from}→{e.to} (skipped {e.skipped} word{e.skipped !== 1 ? 's' : ''}: [{Array.from({ length: e.skipped }, (_, i) => <span key={i} style={styles.word}>{sw(e.from + 1 + i)}</span>)}])</>;
    case 'stop':
      return <>heard <q style={{ color: '#f87171' }}>{e.heard}</q> — no match near [{e.atIdx}] <q>{sw(e.atIdx)}</q></>;
    case 'jump':
      return <>{e.reason}: {e.from}→{e.to} <q style={{ color: '#818cf8' }}>{sw(e.to)}</q></>;
    default:
      return JSON.stringify(e);
  }
}

const styles = {
  root: {
    position: 'fixed',
    bottom: 12,
    right: 12,
    width: 380,
    maxHeight: 320,
    background: 'rgba(8, 8, 14, 0.92)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#cbd5e1',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 9999,
    backdropFilter: 'blur(12px)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  title: {
    fontSize: 10,
    letterSpacing: '0.1em',
    color: '#475569',
    fontWeight: 700,
  },
  meta: {
    fontSize: 11,
    color: '#64748b',
  },
  log: {
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column-reverse',
    padding: '6px 0',
    flex: 1,
  },
  row: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    padding: '3px 12px',
    borderLeft: '2px solid transparent',
    lineHeight: 1.5,
  },
  tag: {
    fontSize: 9,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    fontWeight: 700,
    flexShrink: 0,
    width: 36,
  },
  body: {
    flex: 1,
    color: '#94a3b8',
    flexWrap: 'wrap',
  },
  time: {
    color: '#334155',
    fontSize: 9,
    flexShrink: 0,
  },
  word: {
    background: 'rgba(255,255,255,0.07)',
    borderRadius: 3,
    padding: '0 3px',
    margin: '0 1px',
  },
};
