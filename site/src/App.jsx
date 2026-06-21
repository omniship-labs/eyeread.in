import { useConfig } from './config.js';
import { useDocumentMeta } from './hooks/useDocumentMeta.js';
import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import Features from './components/Features.jsx';
import HowItWorks from './components/HowItWorks.jsx';
import OpenSource from './components/OpenSource.jsx';
import Sponsors from './components/Sponsors.jsx';
import Credits from './components/Credits.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  const config = useConfig();
  useDocumentMeta(config.meta);
  return (
    <>
      <Nav config={config} />
      <main>
        <Hero config={config} />
        <Features data={config.features} />
        <HowItWorks data={config.how} />
        <OpenSource data={config.oss} links={config.links} />
        <Sponsors data={config.sponsors} />
        {/* Self-hides until credits.js has entries — inject buckets on demand. */}
        <Credits />
      </main>
      <Footer config={config} />
    </>
  );
}
