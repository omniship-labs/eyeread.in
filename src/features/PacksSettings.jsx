import { useTranslation } from 'react-i18next';
import { packsAvailable } from '../lib/packs';
import { ConnectedAppsSettings } from './ConnectedAppsSettings';

/**
 * Settings ▸ Packs. For now it holds one subsection, Connected apps (the
 * local HTTP API); installed packs join it here. Native only.
 */
export function PacksSettings() {
  const { t } = useTranslation();
  if (!packsAvailable) return null;
  return (
    <div className="set-group">
      <div className="set-group-label">{t('packs.title')}</div>
      <ConnectedAppsSettings />
    </div>
  );
}
