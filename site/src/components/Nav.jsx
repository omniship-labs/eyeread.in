import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Brand from './Brand.jsx';
import { Icon } from './Icon.jsx';
import { docsPath } from '../docs/registry.js';
import { useOSPlatform } from '../hooks/useOSPlatform.js';

const NAV_OS_ICON = { macos: 'apple', windows: 'windows' };
const NAV_OS_SIZE = { macos: 14, windows: 13 };

export default function Nav({ config }) {
  const { brand, links, nav } = config;
  const { t } = useTranslation('docs');
  const os = useOSPlatform();
  const navIcon = NAV_OS_ICON[os];
  const navIconSize = NAV_OS_SIZE[os] ?? 0;
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
            {navIcon && <Icon name={navIcon} size={navIconSize} />}
            {nav.cta}
          </a>
        </div>
      </div>
    </nav>
  );
}
