import { useTranslation } from 'react-i18next';

export default function Contributing() {
  const { t } = useTranslation('docs');
  const looking = t('contributing.looking', { returnObjects: true });
  const askFirst = t('contributing.askFirst', { returnObjects: true });
  const checklist = t('contributing.checklist', { returnObjects: true });

  return (
    <article className="doc-prose">
      <h1>{t('contributing.title')}</h1>
      <p className="doc-lead">{t('contributing.lead')}</p>

      <h2>{t('contributing.claHeading')}</h2>
      <p>{t('contributing.claBody')}</p>

      <h2>{t('contributing.lookingHeading')}</h2>
      <ul>
        {looking.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>{t('contributing.askFirstHeading')}</h2>
      <ul>
        {askFirst.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="doc-note">{t('contributing.askFirstNote')}</p>

      <h2>{t('contributing.checklistHeading')}</h2>
      <ul className="doc-checklist">
        {checklist.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>{t('contributing.commitHeading')}</h2>
      <p>{t('contributing.commitBody')}</p>
    </article>
  );
}
