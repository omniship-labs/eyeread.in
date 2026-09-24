// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../../i18n';

const api = vi.hoisted(() => ({
  setDevMode: vi.fn(),
  loadDevFolder: vi.fn(),
  newPack: vi.fn(),
  validatePackFolder: vi.fn(),
  buildPackFolder: vi.fn(),
  unloadDevFolder: vi.fn(),
  getPackLogs: vi.fn(),
  getPackNetLog: vi.fn(),
  getPackGrants: vi.fn(() => Promise.resolve([])),
  getPackSettings: vi.fn(() => Promise.resolve({})),
}));
const platform = vi.hoisted(() => ({ pickFolder: vi.fn() }));
vi.mock('../../lib/packs', async (importOriginal) => ({ ...(await importOriginal()), ...api }));
vi.mock('../../lib/tauri', async (importOriginal) => ({
  ...(await importOriginal()),
  ...platform,
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

const { DeveloperMode } = await import('./DeveloperMode');
const { PackScreen } = await import('./PackScreen');

beforeAll(() => i18n.changeLanguage('en'));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  api.setDevMode.mockResolvedValue({ enabled: true, folders: [] });
  api.loadDevFolder.mockResolvedValue({});
  api.newPack.mockResolvedValue({});
  api.getPackLogs.mockResolvedValue([
    { time: 2, level: 'error', message: 'TypeError: x is undefined', sandbox: '' },
  ]);
  api.getPackNetLog.mockResolvedValue([
    {
      time: 1,
      permission: 'scripts:write',
      method: 'GET',
      host: 'api.notion.com',
      status: 200,
      bytesOut: 0,
      bytesIn: 1,
      outcome: 'ok',
    },
  ]);
});

describe('DeveloperMode', () => {
  it('turns on, then loads a folder picked with the native picker', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<DeveloperMode enabled={false} onChange={onChange} />);
    expect(screen.queryByRole('button', { name: 'Load folder…' })).toBeNull();
    fireEvent.click(screen.getByRole('switch', { name: 'Developer mode' }));
    expect(api.setDevMode).toHaveBeenCalledWith(true);
    rerender(<DeveloperMode enabled onChange={onChange} />);
    platform.pickFolder.mockResolvedValue('/Users/ada/packs/pedal');
    fireEvent.click(screen.getByRole('button', { name: 'Load folder…' }));
    await waitFor(() =>
      expect(api.loadDevFolder).toHaveBeenCalledWith('/Users/ada/packs/pedal')
    );
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(2));
  });

  it('scaffolds a new pack where the user chooses', async () => {
    render(<DeveloperMode enabled onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'New pack…' }));
    const create = screen.getByRole('button', { name: 'Create…' });
    expect(create.disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox', { name: 'Pack name' }), {
      target: { value: 'Foot Pedal' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Your name' }), {
      target: { value: 'Ada' },
    });
    platform.pickFolder.mockResolvedValue('/Users/ada/packs');
    fireEvent.click(create);
    await waitFor(() =>
      expect(api.newPack).toHaveBeenCalledWith('/Users/ada/packs', 'Foot Pedal', 'Ada')
    );
  });

  it('shows why a folder can’t be loaded, in the validator’s words', async () => {
    api.loadDevFolder.mockRejectedValue({
      code: 'PACK_LICENSE_FILE',
      message: 'The pack needs a LICENSE file with the GNU Affero General Public License text.',
    });
    platform.pickFolder.mockResolvedValue('/tmp/x');
    render(<DeveloperMode enabled onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load folder…' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'The pack needs a LICENSE file with the GNU Affero General Public License text.'
    );
  });
});

const devPack = (over = {}) => ({
  id: 'com.example.pedal',
  version: '0.1.0+dev.3',
  manifest: {
    id: 'com.example.pedal',
    name: 'Pedal',
    version: '0.1.0',
    author: { name: 'Ada' },
    license: 'AGPL-3.0-or-later',
    permissions: {},
    settings: [],
    includes: [],
  },
  enabled: true,
  topLevel: true,
  usedBy: [],
  status: 'ok',
  statusReason: null,
  verified: false,
  installedAt: 0,
  dev: true,
  folder: '/Users/ada/packs/pedal',
  devError: null,
  ...over,
});

describe('a dev pack’s screen', () => {
  it('has a Dev badge, its folder, Validate, Build pack and a live log', async () => {
    api.validatePackFolder.mockResolvedValue(['com.example.pedal@0.1.0']);
    api.buildPackFolder.mockResolvedValue('/Users/ada/packs/com.example.pedal-0.1.0.zip');
    render(<PackScreen pack={devPack()} onBack={() => {}} />);
    expect(screen.getByText('Dev')).toBeTruthy();
    expect(screen.getByText('Folder: /Users/ada/packs/pedal')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Validate' }));
    expect(await screen.findByText('Valid: com.example.pedal@0.1.0')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Build pack' }));
    expect(
      await screen.findByText('Built /Users/ada/packs/com.example.pedal-0.1.0.zip')
    ).toBeTruthy();
    const log = await screen.findByTestId('pk-dev-log');
    await waitFor(() => expect(log.querySelectorAll('li')).toHaveLength(2));
    expect(log.querySelectorAll('li')[0].textContent).toContain('TypeError: x is undefined');
    expect(log.querySelectorAll('li')[1].textContent).toContain('GET api.notion.com → 200');
  });

  it('shows a validation error and offers no Update/Uninstall', () => {
    render(
      <PackScreen
        pack={devPack({
          devError: {
            code: 'PACK_MINIFIED',
            message:
              'main.js: code looks minified or obfuscated; packs must include readable source.',
          },
        })}
        onBack={() => {}}
      />
    );
    expect(screen.getByRole('alert').textContent).toContain('main.js: code looks minified');
    expect(screen.queryByRole('button', { name: 'Update…' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Unload' })).toBeTruthy();
  });
});
