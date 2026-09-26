import { useTranslation } from 'react-i18next';
import { CodeBlock, Code } from '../CodeBlock.jsx';

export default function Packs() {
  const { t } = useTranslation('docs');
  const permissions = t('packs.permissions', { returnObjects: true });
  const connectedBody = t('packs.connectedBody', { returnObjects: true });
  const whatBody = t('packs.whatBody', { returnObjects: true });
  const agentBody = t('packs.agentBody', { returnObjects: true });

  return (
    <article className="doc-prose">
      <h1>{t('packs.title')}</h1>
      <p className="doc-lead">{t('packs.lead')}</p>

      <h2>{t('packs.whatHeading')}</h2>
      {whatBody.map((p) => (
        <p key={p}>{p}</p>
      ))}

      <h2>{t('packs.permissionsHeading')}</h2>
      <p>{t('packs.permissionsIntro')}</p>
      <table className="doc-table">
        <thead>
          <tr>
            <th>Permission</th>
            <th>Grants</th>
          </tr>
        </thead>
        <tbody>
          {permissions.map((p) => (
            <tr key={p.name}>
              <td>
                <Code>{p.name}</Code>
              </td>
              <td>{p.grants}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>{t('packs.permissionsNote')}</p>

      <h2>{t('packs.makeHeading')}</h2>
      <p>{t('packs.makeIntro')}</p>
      <h3>{t('packs.makeStepsHeading')}</h3>
      <CodeBlock label="terminal">{`npm create @omniship-labs/eyeread.in-packs my-pack
cd my-pack
npx @omniship-labs/eyeread.in-packs validate
npx @omniship-labs/eyeread.in-packs build`}</CodeBlock>

      <h2>{t('packs.agentHeading')}</h2>
      {agentBody.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <CodeBlock
        label={t('packs.agentInstallLabel')}
      >{`npx skills add https://github.com/omniship-labs/eyeread.in-packs-sdk/tree/main/.claude/skills/eyeread-packs`}</CodeBlock>

      <h2>{t('packs.verifiedHeading')}</h2>
      <p>{t('packs.verifiedBody')}</p>

      <h2>{t('packs.connectedHeading')}</h2>
      {connectedBody.map((p) => (
        <p key={p}>{p}</p>
      ))}

      <h2>{t('packs.moreHeading')}</h2>
      <p>{t('packs.moreBody')}</p>
      <ul>
        <li>
          <a
            href="https://github.com/omniship-labs/eyeread.in-packs-sdk"
            target="_blank"
            rel="noopener noreferrer"
          >
            omniship-labs/eyeread.in-packs-sdk
          </a>{' '}
          — the spec, the CLI, and the scaffold.
        </li>
        <li>
          <a
            href="https://github.com/omniship-labs/eyeread.in/blob/main/docs/PACKS.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            docs/PACKS.md
          </a>{' '}
          — the Connected apps HTTP API, in full.
        </li>
      </ul>
    </article>
  );
}
