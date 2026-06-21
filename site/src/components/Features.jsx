import { Icon } from './Icon.jsx';

export default function Features({ data }) {
  return (
    <section className="section features">
      <div className="sec-ey">{data.eyebrow}</div>
      <h2 className="sec-h">{data.heading}</h2>
      <div className="feat-grid">
        {data.items.map((it) => (
          <article className="feat" key={it.title}>
            <div className="feat-icon">
              <Icon name={it.icon} size={20} />
            </div>
            <h3 className="feat-h">{it.title}</h3>
            <p className="feat-p">{it.body}</p>
            <span className="tag">{it.tag}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
