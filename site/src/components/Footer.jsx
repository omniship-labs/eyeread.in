import Brand from './Brand.jsx';

export default function Footer({ config }) {
  const { brand, footer } = config;
  return (
    <footer className="footer">
      <Brand brand={brand} size={22} small />
      <div className="footer-right">
        {footer.links.map((l) => (
          <a
            className={`footer-link${l.mono ? ' mono' : ''}`}
            href={l.href}
            key={l.label}
            {...(l.href.startsWith('http')
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
          >
            {l.label}
          </a>
        ))}
        <span className="footer-copy">{footer.copy}</span>
      </div>
    </footer>
  );
}
