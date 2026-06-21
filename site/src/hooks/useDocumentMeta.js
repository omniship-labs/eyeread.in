import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/* Keep the document <head> in sync with the active language so the browser tab,
   and any social card re-scrape, reflect the chosen locale. The brand name in
   the title ("eyeread.in") is part of the localized string and stays constant.

   Prerendered pages already ship the correct tags (see scripts/prerender.mjs);
   this handles in-session language switches in the live SPA. */
function setMeta(selector, attr, value) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

export function useDocumentMeta({ title, description }) {
  const { i18n } = useTranslation();
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (title) {
      document.title = title;
      setMeta('meta[property="og:title"]', 'content', title);
      setMeta('meta[name="twitter:title"]', 'content', title);
    }
    if (description) {
      setMeta('meta[name="description"]', 'content', description);
      setMeta('meta[property="og:description"]', 'content', description);
    }
    // <html lang> is handled centrally by the i18n languageChanged listener.
  }, [title, description, i18n.resolvedLanguage]);
}
