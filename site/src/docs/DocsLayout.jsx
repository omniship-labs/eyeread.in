import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '../router.jsx';
import { Icon } from '../components/Icon.jsx';
import { docsPages, docsPath, docsMeta } from './registry.js';
import Overview from './pages/Overview.jsx';
import BuildFromSource from './pages/BuildFromSource.jsx';
import Architecture from './pages/Architecture.jsx';
import Contributing from './pages/Contributing.jsx';
import TauriApi from './pages/TauriApi.jsx';

const PAGE_COMPONENTS = {
  index: Overview,
  build: BuildFromSource,
  architecture: Architecture,
  contributing: Contributing,
  tauriApi: TauriApi,
};

// GitHub source for "Edit this page" — maps a page key to its content slice.
const EDIT_URL =
  'https://github.com/omniship-labs/eyeread.in/edit/main/site/src/docs/content.en.js';

export default function DocsLayout({ page }) {
  const { t } = useTranslation('docs');
  const Active = PAGE_COMPONENTS[page.key] || Overview;

  // Sync the document <head> with the active page (the prerender sets the
  // initial values for crawlers; this keeps them right on in-app navigation).
  useEffect(() => {
    const { title, description } = docsMeta(page.key);
    if (title) document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta && description) meta.setAttribute('content', description);
  }, [page.key]);

  return (
    <div className="docs-shell">
      <aside className="docs-sidebar">
        <nav className="docs-nav" aria-label={t('layout.sidebarHeading')}>
          <span className="docs-nav-heading">{t('layout.sidebarHeading')}</span>
          <ul>
            {docsPages.map((p) => (
              <li key={p.slug || 'index'}>
                <Link
                  to={docsPath(p.slug)}
                  className={`docs-nav-link${p.key === page.key ? ' is-active' : ''}`}
                  aria-current={p.key === page.key ? 'page' : undefined}
                >
                  {t(`${p.key}.nav`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className="docs-content">
        <Active />
        <div className="docs-edit">
          <a href={EDIT_URL} target="_blank" rel="noopener noreferrer">
            <Icon name="file-text" size={14} />
            {t('layout.editPrefix')} {t('layout.editSuffix')}
          </a>
        </div>
      </main>
    </div>
  );
}
