import { Link } from 'react-router-dom';
import Brand from './Brand.jsx';
import Collective from './Collective.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';

export default function Footer({ config }) {
  const { brand, footer, collective, switcher } = config;
  return (
    <footer className="footer-outer">
      <Collective data={collective} />
      <div className="footer">
        <Brand brand={brand} size={22} small />
        <div className="footer-right">
          <LanguageSwitcher label={switcher.label} />
          {footer.links.map((l) => {
            const className = `footer-link${l.mono ? ' mono' : ''}`;
            // Internal app paths (e.g. /docs) route client-side; external URLs
            // open in a new tab, in-page anchors stay as plain links.
            return l.href.startsWith('/') ? (
              <Link className={className} to={l.href} key={l.label}>
                {l.label}
              </Link>
            ) : (
              <a
                className={className}
                href={l.href}
                key={l.label}
                {...(l.href.startsWith('http')
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
              >
                {l.label}
              </a>
            );
          })}
          <span className="footer-copy">{footer.copy}</span>
        </div>
      </div>
    </footer>
  );
}
