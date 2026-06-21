import Brand from './Brand.jsx';
import { Icon } from './Icon.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';

export default function Nav({ config }) {
  const { brand, links, nav, switcher } = config;
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Brand brand={brand} size={28} />
        <div className="nav-right">
          <LanguageSwitcher label={switcher.label} />
          <a
            className="btn btn-ghost btn-sm"
            href={links.github}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="github" size={15} /> {nav.githubLabel}
          </a>
          <a className="btn btn-accent btn-sm" href={links.download}>
            {nav.cta}
          </a>
        </div>
      </div>
    </nav>
  );
}
