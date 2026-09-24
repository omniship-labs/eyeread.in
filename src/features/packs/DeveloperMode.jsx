import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Switch } from '../../components/Switch';
import { pickFolder } from '../../lib/tauri';
import { loadDevFolder, newPack, packErrorMessage, setDevMode } from '../../lib/packs';

/**
 * Settings ▸ Packs ▸ Developer mode (advanced view): run unpacked pack
 * folders, which reload as you edit, and scaffold new packs. Each dev pack's
 * own screen adds Validate, Build pack and a log panel.
 */
export function DeveloperMode({ enabled, onChange }) {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [author, setAuthor] = useState('');

  const fail = (e) => setError(packErrorMessage(e));
  const run = (promise) => {
    setError(null);
    promise.then(onChange).catch(fail);
  };

  const load = async () => {
    const folder = await pickFolder(t('packs.dev.chooseFolder'));
    if (folder) run(loadDevFolder(folder));
  };
  const create = async () => {
    const parent = await pickFolder(t('packs.dev.chooseParent'));
    if (!parent) return;
    setCreating(false);
    run(newPack(parent, name, author));
  };

  return (
    <>
      <div className="set-subgroup-label">{t('packs.dev.title')}</div>
      <div className="set-row">
        <div className="set-info">
          <b>{t('packs.dev.enable')}</b>
          <span>{t('packs.dev.hint')}</span>
        </div>
        <Switch
          size="sm"
          checked={enabled}
          label={t('packs.dev.enable')}
          onChange={(on) => run(setDevMode(on))}
        />
      </div>
      {enabled && (
        <div className="set-row pk-actions">
          <Button size="sm" variant="secondary" onClick={load}>
            {t('packs.dev.load')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setCreating((c) => !c)}>
            {t('packs.dev.new')}
          </Button>
        </div>
      )}
      {enabled && creating && (
        <div className="set-row pk-new">
          <Input
            aria-label={t('packs.dev.newName')}
            placeholder={t('packs.dev.newName')}
            value={name}
            maxLength={64}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            aria-label={t('packs.dev.newAuthor')}
            placeholder={t('packs.dev.newAuthor')}
            value={author}
            maxLength={64}
            onChange={(e) => setAuthor(e.target.value)}
          />
          <Button size="sm" onClick={create} disabled={!name.trim()}>
            {t('packs.dev.create')}
          </Button>
        </div>
      )}
      {error && (
        <div className="set-row">
          <span className="set-error" role="alert">
            {error}
          </span>
        </div>
      )}
    </>
  );
}
