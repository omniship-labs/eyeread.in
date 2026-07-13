import { useEffect } from 'react';
import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { useConfig } from './config.js';
import { useDocumentMeta } from './hooks/useDocumentMeta.js';
import { docsPages, DOCS_ROUTE, DOCS_SLUG_ROUTE } from './docs/registry.js';
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
import Download from './pages/Download.jsx';

const DOCS_INDEX = docsPages.find((p) => p.slug === '');

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

// /docs/:slug — resolve the slug to a docs page, or bounce to the docs index.
function DocsRoute() {
  const { slug = '' } = useParams();
  const page = docsPages.find((p) => p.slug === slug);
  return page ? <DocsLayout page={page} /> : <Navigate to="/docs" replace />;
}

// React Router doesn't restore scroll on navigation — reset to the top on every
// pathname change (matching a fresh page load).
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const config = useConfig();
  return (
    <>
      <ScrollToTop />
      <Nav config={config} />
      <Routes>
        <Route path={DOCS_ROUTE} element={<DocsLayout page={DOCS_INDEX} />} />
        <Route path={DOCS_SLUG_ROUTE} element={<DocsRoute />} />
        <Route path="/download" element={<Download config={config} />} />
        <Route path="*" element={<Home config={config} />} />
      </Routes>
      <Footer config={config} />
    </>
  );
}
