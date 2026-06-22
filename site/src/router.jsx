/* ============================================================
   eyeread.in · marketing site — minimal client router
   ------------------------------------------------------------
   The site is a static SPA on GitHub Pages. The marketing home
   stays multilingual (served per-locale by the prerender), and
   the developer docs add real pages under /docs/*. Rather than
   pull in a routing library, this is a tiny path-based router:
   it reads location.pathname, navigates with history.pushState,
   and re-renders on popstate.

   Direct loads / crawlers don't depend on it — scripts/prerender
   .mjs emits a static HTML file for every docs route, so the URL
   resolves on the server before this ever runs.
   ============================================================ */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const RouterContext = createContext(null);

const currentPath = () => (typeof window === 'undefined' ? '/' : window.location.pathname);

export function RouterProvider({ children }) {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onPop = () => setPath(currentPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to) => {
    if (to === window.location.pathname) {
      window.scrollTo(0, 0);
      return;
    }
    window.history.pushState({}, '', to);
    setPath(to);
    window.scrollTo(0, 0);
  }, []);

  return <RouterContext.Provider value={{ path, navigate }}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  return useContext(RouterContext);
}

// A drop-in <a> that routes internally for app paths (leading "/") and
// behaves like a normal link for everything else (external URLs, #anchors).
// Modifier/middle clicks fall through so "open in new tab" still works.
export function Link({ to, children, ...rest }) {
  const { navigate } = useRouter();
  const internal = typeof to === 'string' && to.startsWith('/');

  const onClick = (e) => {
    if (!internal) return;
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };

  return (
    <a href={to} onClick={onClick} {...rest}>
      {children}
    </a>
  );
}
