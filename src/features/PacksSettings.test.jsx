// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import i18n from '../i18n';

const api = vi.hoisted(() => ({
  packsAvailable: true,
  listPacks: vi.fn(),
  getPackGrants: vi.fn(),
  setPackEnabled: vi.fn(),
  requestPackInstall: vi.fn(),
  getPackSettings: vi.fn(() => Promise.resolve({})),
  getPackNetLog: vi.fn(() => Promise.resolve([])),
}));
vi.mock('../lib/packs', async (importOriginal) => ({ ...(await importOriginal()), ...api }));
vi.mock('../lib/tauri', async (importOriginal) => ({
  ...(await importOriginal()),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));
vi.mock('./ConnectedAppsSettings', () => ({
  ConnectedAppsSettings: () => <div data-testid="connected-apps">Connected apps</div>,
}));

const { PacksSettings } = await import('./PacksSettings');

beforeAll(() => i18n.changeLanguage('en'));
afterEach(cleanup);

const pack = (id, name, over = {}) => ({
  id,
  version: '1.0.0',
  manifest: {
    id,
    name,
    version: '1.0.0',
    author: { name: 'Ada' },
    license: 'AGPL-3.0-only',
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
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  api.listPacks.mockResolvedValue([
    pack('com.example.notion', 'Notion Sync', { verified: true }),
    pack('com.example.pedal', 'Foot Pedal', {
      enabled: false,
      status: 'tampered',
      statusReason: 'main.js changed',
    }),
    pack('com.example.helper', 'Helper', { topLevel: false, usedBy: ['com.example.notion'] }),
  ]);
  api.getPackGrants.mockImplementation((id) =>
    Promise.resolve(
      id === 'com.example.notion'
        ? [
            {
              permission: 'scripts:write',
              network: ['https://api.notion.com'],
              allowed: true,
              internet: true,
            },
          ]
        : []
    )
  );
  api.setPackEnabled.mockResolvedValue({});
});

const item = (id) => document.querySelector(`[data-pack="${id}"]`);

describe('PacksSettings', () => {
  it('lists the packs the user installed, with badge, 🌐 and problems', async () => {
    render(<PacksSettings advanced={false} />);
    await screen.findByText('Notion Sync');
    expect(item('com.example.helper')).toBeNull(); // included packs live under their bundle
    const notion = within(item('com.example.notion'));
    expect(notion.getByText('Verified')).toBeTruthy();
    expect(await notion.findByRole('img', { name: 'Internet access is on' })).toBeTruthy();
    const pedal = within(item('com.example.pedal'));
    expect(pedal.getByText('Community')).toBeTruthy();
    expect(pedal.queryByRole('img', { name: 'Internet access is on' })).toBeNull();
    expect(pedal.getByRole('alert').textContent).toContain('main.js changed');
    expect(pedal.getByRole('switch').disabled).toBe(true);
  });

  it('switches a pack on and off', async () => {
    render(<PacksSettings advanced={false} />);
    await screen.findByText('Notion Sync');
    fireEvent.click(
      within(item('com.example.notion')).getByRole('switch', { name: 'Notion Sync on or off' })
    );
    expect(api.setPackEnabled).toHaveBeenCalledWith('com.example.notion', false);
  });

  it('hands a picked .zip to the installer', async () => {
    render(<PacksSettings advanced={false} />);
    await screen.findByText('Notion Sync');
    expect(screen.getByRole('button', { name: 'Install pack…' })).toBeTruthy();
    const input = document.querySelector('input[type="file"][accept=".zip"]');
    const file = new File(['PK'], 'pack.zip', { type: 'application/zip' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(api.requestPackInstall).toHaveBeenCalledWith(file);
  });

  it('opens a pack’s own screen and goes back', async () => {
    render(<PacksSettings advanced={false} />);
    fireEvent.click(await screen.findByText('Notion Sync'));
    expect(screen.getByRole('button', { name: 'All packs' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'All packs' }));
    expect(screen.getByRole('button', { name: 'Install pack…' })).toBeTruthy();
  });

  it('shows Connected apps under Packs in the advanced view only', async () => {
    render(<PacksSettings advanced={false} />);
    await screen.findByText('Notion Sync');
    expect(screen.queryByTestId('connected-apps')).toBeNull();
    cleanup();
    render(<PacksSettings advanced />);
    await screen.findByText('Notion Sync');
    expect(screen.getByTestId('connected-apps')).toBeTruthy();
    expect(screen.getByText('Packs')).toBeTruthy();
  });
});
