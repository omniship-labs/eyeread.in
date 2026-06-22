import { useTranslation } from 'react-i18next';
import Brand from './Brand.jsx';
import { Icon } from './Icon.jsx';
import { Link } from '../router.jsx';
import { docsPath } from '../docs/registry.js';

export default function Nav({ config }) {
  const { brand, links, nav } = config;
  const { t } = useTranslation('docs');
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Brand brand={brand} size={28} />
        <div className="nav-right">
          <Link className="btn btn-ghost btn-sm nav-docs" to={docsPath('')}>
            {t('nav.label')}
          </Link>
          <a
            className="btn btn-ghost btn-sm"
            href={links.github}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="github" size={15} />
            <span className="btn-label">{nav.githubLabel}</span>
          </a>
          <a className="btn btn-accent btn-sm" href={links.download}>
            {nav.cta}
          </a>
        </div>
      </div>
    </nav>
  );
}
