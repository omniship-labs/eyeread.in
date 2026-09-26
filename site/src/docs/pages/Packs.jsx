import { useTranslation } from 'react-i18next';
import { CodeBlock, Code } from '../CodeBlock.jsx';

const REPO = 'https://github.com/omniship-labs/eyeread.in/blob/main';

const REFERENCES = [
  { label: 'Creator guide', href: `${REPO}/docs/BUILDING_PACKS.md` },
  { label: 'Pack format', href: `${REPO}/spec/packs/FORMAT.md` },
  { label: 'eyeread.* API', href: `${REPO}/spec/packs/API.md` },
  { label: 'Pack CLA', href: `${REPO}/PACK_CLA.md` },
  { label: 'Content policy', href: `${REPO}/PACK_POLICY.md` },
];

export default function Packs() {
  const { t } = useTranslation('docs');
  const concepts = t('packs.concepts', { returnObjects: true });
  const permissions = t('packs.permissions', { returnObjects: true });
  const netRules = t('packs.netRules', { returnObjects: true });
  const rules = t('packs.rules', { returnObjects: true });
  const verifiedSteps = t('packs.verifiedSteps', { returnObjects: true });

  return (
    <article className="doc-prose">
      <h1>{t('packs.title')}</h1>
      <p className="doc-lead">{t('packs.lead')}</p>

      <h2>{t('packs.conceptsHeading')}</h2>
      <ul>
        {concepts.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>{t('packs.firstHeading')}</h2>
      <p>{t('packs.firstIntro')}</p>

      <h2>{t('packs.manifestHeading')}</h2>
      <p>{t('packs.manifestIntro')}</p>
      <CodeBlock label="pack.json">{`{
  "apiVersion": 1,
  "id": "com.example.notion-sync",
  "name": "Notion Sync",
  "version": "1.2.0",
  "author": { "name": "Ada Example" },
  "license": "AGPL-3.0-only",
  "main": "main.js",
  "permissions": {
    "scripts:write": { "network": ["https://api.notion.com"] },
    "prompter:control": {}
  }
}`}</CodeBlock>

      <h2>{t('packs.permissionsHeading')}</h2>
      <table className="doc-table">
        <tbody>
          {permissions.map((p) => (
            <tr key={p.name}>
              <th scope="row">
                <Code>{p.name}</Code>
              </th>
              <td>{p.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="doc-note">{t('packs.permissionsNote')}</p>

      <h2>{t('packs.handlerHeading')}</h2>
      <p>{t('packs.handlerIntro')}</p>
      <CodeBlock label="main.js">{`eyeread.on('scripts:write', async ({ scripts, net, settings }) => {
  const { pageId } = await settings.get();
  const res = await net.fetch(\`https://api.notion.com/v1/blocks/\${pageId}/children\`);
  await scripts.add({ title: 'From Notion', text: toPlainText(await res.json()) });
});

eyeread.on('prompter:control', ({ prompter }) => {
  // e.g. map a pedal to prompter.toggle()
});`}</CodeBlock>

      <h2>{t('packs.netHeading')}</h2>
      <ul>
        {netRules.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>{t('packs.rulesHeading')}</h2>
      <ul>
        {rules.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>{t('packs.cliHeading')}</h2>
      <p>{t('packs.cliIntro')}</p>
      <CodeBlock label="bash">{`npm create @omniship-labs/eyeread.in-packs my-pack
npx eyeread.in-packs validate
npx eyeread.in-packs build`}</CodeBlock>

      <h2>{t('packs.verifiedHeading')}</h2>
      <p>{t('packs.verifiedIntro')}</p>
      <ol>
        {verifiedSteps.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
      <p className="doc-note">{t('packs.verifiedNote')}</p>

      <h2>{t('packs.specHeading')}</h2>
      <p>{t('packs.specIntro')}</p>
      <ul>
        {REFERENCES.map((r) => (
          <li key={r.href}>
            <a href={r.href} target="_blank" rel="noopener noreferrer">
              {r.label}
            </a>
          </li>
        ))}
      </ul>
    </article>
  );
}
