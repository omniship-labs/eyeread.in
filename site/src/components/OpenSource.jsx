import { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';

function useStarCount(repo) {
  const [count, setCount] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`https://api.github.com/repos/${repo}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json) setCount(json.stargazers_count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [repo]);

  return count;
}

export default function OpenSource({ data, links }) {
  const stars = useStarCount('omniship-labs/eyeread.in');

  return (
    <section className="section">
      <div className="oss">
        <div className="oss-left">
          <h2>{data.heading}</h2>
          <p>{data.body}</p>
          <a
            className="repo-link"
            href={links.github}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="github" size={15} /> {links.repo}
            <span className="repo-badge">{data.repoBadge}</span>
            {stars !== null && (
              <span className="repo-badge repo-badge-stars">
                <Icon name="star" size={12} /> {stars}
              </span>
            )}
          </a>
          <div className="oss-shields">
            <img
              src="https://img.shields.io/cii/summary/13607"
              alt="CII Best Practices"
              loading="lazy"
            />
            <img
              src="https://img.shields.io/w3c-validation/default?targetUrl=https%3A%2F%2Fget.eyeread.in"
              alt="W3C Validation"
              loading="lazy"
            />
            <img
              src="https://img.shields.io/github/commits-since/omniship-labs/eyeread.in/latest"
              alt="GitHub commits since latest release"
              loading="lazy"
            />
            <img
              src="https://img.shields.io/github/commit-activity/m/omniship-labs/eyeread.in"
              alt="GitHub commit activity"
              loading="lazy"
            />
          </div>
        </div>
        <div className="oss-right">
          {data.guarantees.map((g) => (
            <div
              className={`oss-row${g.icon === 'info' ? ' oss-row-muted' : ''}`}
              key={g.title}
            >
              <Icon name={g.icon} size={18} />
              <div>
                <h4>{g.title}</h4>
                <p>{g.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
