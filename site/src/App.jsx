import { useConfig } from './config.js';
import { useDocumentMeta } from './hooks/useDocumentMeta.js';
import { useRouter } from './router.jsx';
import { locales } from './i18n/index.js';
import { matchDocsRoute } from './docs/registry.js';
import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import Features from './components/Features.jsx';
import HowItWorks from './components/HowItWorks.jsx';
import OpenSource from './components/OpenSource.jsx';
import Compat from './components/Compat.jsx';
import Sponsors from './components/Sponsors.jsx';
import Credits from './components/Credits.jsx';
import Footer from './components/Footer.jsx';
import DocsLayout from './docs/DocsLayout.jsx';

const LOCALE_CODES = locales.map((l) => l.code);

function Home({ config }) {
  useDocumentMeta(config.meta);
  return (
    <main>
      <Hero config={config} />
      <Features data={config.features} />
      <HowItWorks data={config.how} />
      <OpenSource data={config.oss} links={config.links} />
      <Compat data={config.compat} />
      <Sponsors data={config.sponsors} />
      {/* Self-hides until credits.js has entries — inject buckets on demand. */}
      <Credits />
    </main>
  );
}

export default function App() {
  const config = useConfig();
  const { path } = useRouter();
  const docsPage = matchDocsRoute(path, LOCALE_CODES);

  return (
    <>
      <Nav config={config} />
      {docsPage ? <DocsLayout page={docsPage} /> : <Home config={config} />}
      <Footer config={config} />
    </>
  );
}
