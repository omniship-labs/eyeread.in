import { useState } from 'react';
import { Icon } from './Icon.jsx';
import { useSponsors } from '../hooks/useSponsors.js';

const initials = (name = '?') =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase() || '?';

export function Avatar({ member, size }) {
  const [broken, setBroken] = useState(false);
  const showImg = member.image && !broken;
  const chip = (
    <span className="sp-avatar" style={{ '--sp-size': `${size}px` }} title={member.name}>
      {showImg ? (
        <img
          src={member.image}
          alt={member.name}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="sp-fallback">{initials(member.name)}</span>
      )}
    </span>
  );
  return member.profile ? (
    <a className="sp-link" href={member.profile} target="_blank" rel="noopener noreferrer">
      {chip}
    </a>
  ) : (
    chip
  );
}

export function Group({ label, icon, members, size, large }) {
  if (!members.length) return null;
  return (
    <div className="sp-group">
      <div className="sp-group-label">
        <Icon name={icon} size={12} /> {label}
      </div>
      <div className={`sp-row${large ? ' sp-row-lg' : ''}`}>
        {members.map((m) => (
          <Avatar key={m.MemberId ?? m.profile ?? m.name} member={m} size={size} />
        ))}
      </div>
    </div>
  );
}

export default function Sponsors({ data }) {
  const { status, sponsors, backers } = useSponsors({
    collectiveSlug: data.collectiveSlug,
    sponsorThreshold: data.sponsorThreshold,
  });

  return (
    <section className="section sponsors">
      <div className="sec-ey">{data.eyebrow}</div>
      <h2 className="sec-h">{data.heading}</h2>
      <p className="sponsors-sub">{data.subhead}</p>

      <div className="sp-mount">
        {status === 'loading' && <div className="sp-status">{data.loadingMessage}</div>}
        {status === 'empty' && (
          <a
            className="sp-status"
            href={data.ctaHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            {data.emptyMessage}
          </a>
        )}
        {status === 'error' && (
          <a
            className="sp-status sp-error"
            href={data.ctaHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            {data.errorMessage}
          </a>
        )}
        {status === 'ready' && (
          <>
            <Group label={data.sponsorsLabel} icon="heart" members={sponsors} size={64} large />
            <Group label={data.backersLabel} icon="star" members={backers} size={44} />
          </>
        )}
      </div>

      <a
        className="btn btn-ghost"
        href={data.ctaHref}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Icon name="heart" size={16} /> {data.ctaLabel}
      </a>
    </section>
  );
}
