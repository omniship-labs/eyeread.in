import { useTranslation } from 'react-i18next';
import { CodeBlock } from '../CodeBlock.jsx';

export default function BuildFromSource() {
  const { t } = useTranslation('docs');
  const prereqs = t('build.prereqs', { returnObjects: true });
  const platforms = t('build.platforms', { returnObjects: true });

  return (
    <article className="doc-prose">
      <h1>{t('build.title')}</h1>
      <p className="doc-lead">{t('build.lead')}</p>

      <h2>{t('build.prereqHeading')}</h2>
      <p>{t('build.prereqIntro')}</p>
      <ul>
        {prereqs.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="doc-note">{t('build.prereqWebNote')}</p>

      <h2>{t('build.cloneHeading')}</h2>
      <CodeBlock label="bash">{`git clone https://github.com/omniship-labs/eyeread.in
cd eyeread.in
npm install`}</CodeBlock>

      <h2>{t('build.runHeading')}</h2>
      <p>{t('build.runIntro')}</p>
      <CodeBlock label="bash">{`# Web demo — UI in your browser, no Rust build
npm run dev

# Native app — the full Tauri desktop shell
npm run tauri dev`}</CodeBlock>
      <p>{t('build.webNote')}</p>
      <p>{t('build.nativeNote')}</p>

      <h2>{t('build.buildHeading')}</h2>
      <p>{t('build.buildIntro')}</p>
      <CodeBlock label="bash">{`# Front-end production bundle
npm run build

# Distributable native binary for the current platform
npm run tauri build`}</CodeBlock>

      <h2>{t('build.checksHeading')}</h2>
      <p>{t('build.checksIntro')}</p>
      <CodeBlock label="bash">{`npm test            # Vitest
npm run lint        # ESLint
npx prettier --check .   # formatting (or: npm run format to fix)`}</CodeBlock>
      <p className="doc-note">{t('build.ciNote')}</p>

      <h2>{t('build.platformHeading')}</h2>
      <p>{t('build.platformIntro')}</p>
      <table className="doc-table">
        <thead>
          <tr>
            <th>OS</th>
            <th>Screen-capture exclusion</th>
          </tr>
        </thead>
        <tbody>
          {platforms.map((row) => (
            <tr key={row.os}>
              <th scope="row">{row.os}</th>
              <td>{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
