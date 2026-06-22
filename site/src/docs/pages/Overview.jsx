import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { docsPages, docsPath } from '../registry.js';
import { Icon } from '../../components/Icon.jsx';

const CARD_ICON = {
  build: 'wrench',
  architecture: 'aperture',
  contributing: 'heart',
  tauriApi: 'code',
};

// The slug a card's `key` maps to, so cards can link to their page.
const slugForKey = (key) => docsPages.find((p) => p.key === key)?.slug ?? '';

const STACK = [
  { label: 'Shell', value: 'Tauri v2 (Rust)' },
  { label: 'Front end', value: 'React 18 + Vite' },
  { label: 'Styling', value: 'Plain CSS, design-system tokens' },
  { label: 'Data', value: 'SQLite (tauri-plugin-sql)' },
  { label: 'License', value: 'AGPL-3.0' },
];

export default function Overview() {
  const { t } = useTranslation('docs');
  const intro = t('index.intro', { returnObjects: true });
  const cards = t('index.cards', { returnObjects: true });

  return (
    <article className="doc-prose">
      <h1>{t('index.title')}</h1>
      <p className="doc-lead">{t('index.lead')}</p>

      {intro.map((p) => (
        <p key={p}>{p}</p>
      ))}

      <h2>{t('index.cardsHeading')}</h2>
      <div className="doc-cards">
        {cards.map((card) => (
          <Link className="doc-card" to={docsPath(slugForKey(card.key))} key={card.key}>
            <span className="doc-card-icon">
              <Icon name={CARD_ICON[card.key] || 'file-text'} size={18} />
            </span>
            <span className="doc-card-title">{card.title}</span>
            <span className="doc-card-body">{card.body}</span>
          </Link>
        ))}
      </div>

      <h2>{t('index.stackHeading')}</h2>
      <table className="doc-table">
        <tbody>
          {STACK.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
