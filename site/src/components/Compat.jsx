import { Icon } from './Icon.jsx';
import { compat, PLATFORM_ORDER, PLATFORM_GUARANTEE, isStaleVersion } from '../data/compat.js';

// Map a result to its pill modifier class.
const STATUS_CLASS = {
  hidden: 'lc-ok',
  partial: 'lc-warn',
  visible: 'lc-bad',
  untested: 'lc-muted',
};

function Verifiers({ people, untestedLabel }) {
  if (!people || people.length === 0) {
    return <span className="lc-testers-wanted">{untestedLabel}</span>;
  }
  return (
    <span className="lc-verifiers">
      {people.map((p, i) => (
        <span key={p.profile ?? p.name}>
          {i > 0 && ', '}
          {p.profile ? (
            <a href={p.profile} target="_blank" rel="noopener noreferrer">
              @{p.name}
            </a>
          ) : (
            <span>@{p.name}</span>
          )}
        </span>
      ))}
    </span>
  );
}

export default function Compat({ data }) {
  const {
    eyebrow,
    heading,
    subhead,
    cols,
    status,
    guaranteed,
    bestEffort,
    untestedLabel,
    staleLabel,
    ctaLabel,
    reportHref,
  } = data;
  const guaranteeLabel = { guaranteed, bestEffort };

  return (
    <section className="section compat" id="compatibility">
      <div className="sec-ey">{eyebrow}</div>
      <h2 className="sec-h">{heading}</h2>
      <p className="lc-sub">{subhead}</p>

      <div className="lc-table-wrap">
        <table className="lc-table">
          <thead>
            <tr>
              <th>{cols.version}</th>
              <th>{cols.environment}</th>
              <th>{cols.result}</th>
              <th>{cols.verifiedBy}</th>
              <th>{cols.appVersion}</th>
            </tr>
          </thead>
          {PLATFORM_ORDER.map((platform) => {
            const rows = compat.filter((r) => r.platform === platform);
            if (rows.length === 0) return null;
            const level = PLATFORM_GUARANTEE[platform] || 'bestEffort';
            return (
              <tbody key={platform}>
                <tr className="lc-group">
                  <th colSpan={5} scope="colgroup">
                    {platform}
                    <span className={`lc-guarantee lc-${level}`}>{guaranteeLabel[level]}</span>
                  </th>
                </tr>
                {rows.map((row, i) => (
                  <tr key={`${row.version}-${row.env}-${i}`}>
                    <td>
                      <b>{row.version}</b>
                    </td>
                    <td>{row.env}</td>
                    <td>
                      <span className={`lc-pill ${STATUS_CLASS[row.result] || 'lc-muted'}`}>
                        {status[row.result] || status.untested}
                      </span>
                    </td>
                    <td>
                      <Verifiers people={row.verifiers} untestedLabel={untestedLabel} />
                    </td>
                    <td className="lc-app">
                      {row.appVersion || '—'}
                      {row.result !== 'untested' && isStaleVersion(row.appVersion) && (
                        <span className="lc-stale" title={staleLabel}>
                          ⟳ {staleLabel}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            );
          })}
        </table>
      </div>

      <a className="btn btn-ghost" href={reportHref} target="_blank" rel="noopener noreferrer">
        <Icon name="check" size={16} /> {ctaLabel}
      </a>
    </section>
  );
}
