import { useTranslation } from 'react-i18next';
import { CodeBlock, Code } from '../CodeBlock.jsx';

// The commands registered in src-tauri/src/lib.rs (invoke_handler). Signatures
// and names are literal — they mirror the Rust source and aren't translated.
const COMMANDS = [
  {
    name: 'set_app_protected',
    args: 'protected: boolean',
    returns: 'void',
    desc: 'Toggle screen-capture invisibility on every app window at once (macOS/Windows capture exclusion; no-op on Linux).',
  },
  {
    name: 'show_about_window',
    args: '—',
    returns: 'void',
    desc: 'Show, center, and focus the About window.',
  },
  {
    name: 'check_for_update',
    args: '—',
    returns: 'Result<string, string>',
    desc: 'Check for an update; resolves to "update:<version>" or "up_to_date".',
  },
  {
    name: 'install_update',
    args: '—',
    returns: 'Result<void, string>',
    desc: 'Download and install a pending update, then restart the app.',
  },
];

export default function TauriApi() {
  const { t } = useTranslation('docs');
  const plugins = t('tauriApi.plugins', { returnObjects: true });

  return (
    <article className="doc-prose">
      <h1>{t('tauriApi.title')}</h1>
      <p className="doc-lead">{t('tauriApi.lead')}</p>

      <h2>{t('tauriApi.commandsHeading')}</h2>
      <p>{t('tauriApi.commandsIntro')}</p>
      <table className="doc-table">
        <thead>
          <tr>
            <th>Command</th>
            <th>Args</th>
            <th>Returns</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {COMMANDS.map((cmd) => (
            <tr key={cmd.name}>
              <td>
                <Code>{cmd.name}</Code>
              </td>
              <td>
                <Code>{cmd.args}</Code>
              </td>
              <td>
                <Code>{cmd.returns}</Code>
              </td>
              <td>{cmd.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{t('tauriApi.invokeHeading')}</h2>
      <p>{t('tauriApi.invokeIntro')}</p>
      <CodeBlock label="src/lib/tauri.js">{`import { invoke } from '@tauri-apps/api/core';

// Hide every window from screen capture.
await invoke('set_app_protected', { protected: true });`}</CodeBlock>

      <h2>{t('tauriApi.pluginsHeading')}</h2>
      <p>{t('tauriApi.pluginsIntro')}</p>
      <table className="doc-table">
        <tbody>
          {plugins.map((p) => (
            <tr key={p.name}>
              <th scope="row">
                <Code>{p.name}</Code>
              </th>
              <td>{p.note}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{t('tauriApi.eventsHeading')}</h2>
      <p>{t('tauriApi.eventsBody')}</p>
    </article>
  );
}
