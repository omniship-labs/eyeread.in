import { Icon } from './Icon.jsx';

export default function OpenSource({ data, links }) {
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
          </a>
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
