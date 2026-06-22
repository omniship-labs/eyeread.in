import { useTranslation } from 'react-i18next';
import { Code } from '../CodeBlock.jsx';

const LAYOUT = [
  ['design/', 'Design system — tokens, components, prototypes (single source of truth).'],
  ['src/', 'The React + Vite front end (shared by every window).'],
  ['src/windows/', 'Per-window entry points (main, overlay, settings, about).'],
  ['src/features/', 'Screen-level React components.'],
  ['src/components/', 'Production component library (er-* class prefix).'],
  ['src/lib/tauri.js', 'Thin platform layer — Tauri APIs with a browser fallback.'],
  ['src-tauri/', 'The Rust/Tauri backend (commands, menu, tray, migrations).'],
  ['site/', 'This marketing + docs site (standalone Vite build).'],
];

export default function Architecture() {
  const { t } = useTranslation('docs');
  const windows = t('architecture.windows', { returnObjects: true });
  const designBody = t('architecture.designBody', { returnObjects: true });
  const dataBody = t('architecture.dataBody', { returnObjects: true });

  return (
    <article className="doc-prose">
      <h1>{t('architecture.title')}</h1>
      <p className="doc-lead">{t('architecture.lead')}</p>

      <h2>{t('architecture.layoutHeading')}</h2>
      <p>{t('architecture.layoutIntro')}</p>
      <table className="doc-table">
        <thead>
          <tr>
            <th>Path</th>
            <th>What it is</th>
          </tr>
        </thead>
        <tbody>
          {LAYOUT.map(([path, desc]) => (
            <tr key={path}>
              <td>
                <Code>{path}</Code>
              </td>
              <td>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{t('architecture.windowsHeading')}</h2>
      <p>{t('architecture.windowsIntro')}</p>
      <table className="doc-table">
        <tbody>
          {windows.map((w) => (
            <tr key={w.label}>
              <th scope="row">
                <Code>{w.label}</Code>
              </th>
              <td>{w.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="doc-note">{t('architecture.windowsNote')}</p>

      <h2>{t('architecture.designHeading')}</h2>
      {designBody.map((p) => (
        <p key={p}>{p}</p>
      ))}

      <h2>{t('architecture.dataHeading')}</h2>
      {dataBody.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </article>
  );
}
