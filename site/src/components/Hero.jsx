import { Fragment } from 'react';
import { Icon } from './Icon.jsx';
import Demo from './Demo.jsx';

/* headline is an array; string items render plain, {emphasis} renders accented */
function Headline({ parts }) {
  return parts.map((p, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {typeof p === 'string' ? p : <em>{p.emphasis}</em>}
    </Fragment>
  ));
}

export default function Hero({ config }) {
  const { hero, links } = config;
  return (
    <section className="hero" id="top">
      <div className="glow glow-top" />
      <div className="glow glow-btm" />

      <div className="hero-badges">
        <span className="eyebrow">
          <span className="dot" />
          {hero.eyebrow}
        </span>
        <a className="pill-link" href={links.github} target="_blank" rel="noopener noreferrer">
          <Icon name="github" size={13} />
          <Icon name="star" size={12} /> {hero.star}
        </a>
      </div>

      <h1>
        <Headline parts={hero.headline} />
      </h1>
      <p className="hero-sub">{hero.subhead}</p>

      <div className="cta-row">
        <a className="btn btn-accent btn-lg" href={hero.primaryCta.href}>
          <Icon name="apple" size={17} /> {hero.primaryCta.label}
        </a>
        <a
          className="btn btn-ghost btn-lg"
          href={hero.secondaryCta.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="github" size={16} /> {hero.secondaryCta.label}
        </a>
      </div>
      <p className="hero-note">
        <Icon name="check" size={13} /> {hero.note}
      </p>

      <Demo data={config.demo} />
    </section>
  );
}
