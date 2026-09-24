// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import i18n from '../../i18n';

const api = vi.hoisted(() => ({
  getPackGrants: vi.fn(),
  setPackGrant: vi.fn(),
  getPackSettings: vi.fn(),
  setPackSettings: vi.fn(),
  getPackNetLog: vi.fn(),
  clearPackNetLog: vi.fn(),
  setPackEnabled: vi.fn(),
  uninstallPack: vi.fn(),
  requestPackInstall: vi.fn(),
}));
vi.mock('../../lib/packs', async (importOriginal) => ({ ...(await importOriginal()), ...api }));
vi.mock('../../lib/tauri', async (importOriginal) => ({
  ...(await importOriginal()),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

const { PackScreen } = await import('./PackScreen');

beforeAll(() => i18n.changeLanguage('en'));
afterEach(cleanup);

const manifest = {
  apiVersion: 1,
  id: 'com.example.notion',
  name: 'Notion Sync',
  version: '1.2.0',
  author: { name: 'Ada Example' },
  license: 'AGPL-3.0-only',
  main: 'main.js',
  permissions: {
    'scripts:write': { network: ['https://api.notion.com'] },
    'prompter:control': { network: [] },
  },
  settings: [
    { key: 'autoOpen', type: 'toggle', label: 'Open after import' },
    {
      key: 'format',
      type: 'select',
      label: 'Format',
      options: [
        { value: 'plain', label: 'Plain' },
        { value: 'md', label: 'Markdown' },
      ],
    },
    { key: 'poll', type: 'number', label: 'Check every', min: 10, max: 600, unit: 's' },
    { key: 'pageId', type: 'text', label: 'Page ID' },
  ],
  includes: [],
};

const installed = (over = {}) => ({
  id: 'com.example.notion',
  version: '1.2.0',
  manifest,
  enabled: true,
  topLevel: true,
  usedBy: [],
  status: 'ok',
  statusReason: null,
  verified: true,
  installedAt: 0,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  api.getPackGrants.mockResolvedValue([
    {
      permission: 'scripts:write',
      network: ['https://api.notion.com'],
      allowed: false,
      internet: false,
    },
    { permission: 'prompter:control', network: [], allowed: true, internet: false },
  ]);
  api.setPackGrant.mockImplementation((id, permission, allowed, internet) =>
    Promise.resolve([
      { permission: 'scripts:write', network: ['https://api.notion.com'], allowed, internet },
      { permission: 'prompter:control', network: [], allowed: true, internet: false },
    ])
  );
  api.getPackSettings.mockResolvedValue({
    autoOpen: false,
    format: 'plain',
    poll: 60,
    pageId: '',
  });
  api.setPackSettings.mockImplementation((id, values) =>
    Promise.resolve({ autoOpen: false, format: 'plain', poll: 60, pageId: '', ...values })
  );
  api.getPackNetLog.mockResolvedValue([
    {
      time: 0,
      permission: 'scripts:write',
      method: 'GET',
      host: 'api.notion.com',
      status: 200,
      bytesOut: 0,
      bytesIn: 512,
      outcome: 'ok',
    },
    {
      time: 1,
      permission: 'scripts:write',
      method: 'GET',
      host: 'evil.example.net',
      status: null,
      bytesOut: 0,
      bytesIn: 0,
      outcome: 'E_NETWORK_DENIED',
    },
  ]);
  api.setPackEnabled.mockResolvedValue({});
  api.clearPackNetLog.mockResolvedValue(undefined);
  api.uninstallPack.mockResolvedValue([]);
});

const row = (permission) => document.querySelector(`[data-permission="${permission}"]`);

describe('PackScreen', () => {
  it('shows the app-controlled header', async () => {
    render(<PackScreen pack={installed()} onBack={() => {}} />);
    expect(screen.getByText('Verified')).toBeTruthy();
    expect(screen.getByText('1.2.0 · by Ada Example · AGPL-3.0-only')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Update…' })).toBeTruthy();
    await waitFor(() => expect(row('scripts:write')).toBeTruthy());
  });

  it('draws the Allow / Internet grid with sites, and internet needs Allow first', async () => {
    render(<PackScreen pack={installed()} onBack={() => {}} />);
    await waitFor(() => expect(row('scripts:write')).toBeTruthy());
    const scripts = within(row('scripts:write'));
    expect(scripts.getByText('Internet: https://api.notion.com')).toBeTruthy();
    const internet = scripts.getByRole('switch', { name: 'Internet for: Add scripts' });
    expect(internet.disabled).toBe(true);

    fireEvent.click(scripts.getByRole('switch', { name: 'Allow: Add scripts' }));
    expect(api.setPackGrant).toHaveBeenCalledWith(
      'com.example.notion',
      'scripts:write',
      true,
      false
    );
    await waitFor(() => expect(internet.disabled).toBe(false));
    fireEvent.click(internet);
    expect(api.setPackGrant).toHaveBeenLastCalledWith(
      'com.example.notion',
      'scripts:write',
      true,
      true
    );

    // An offline permission has no internet switch at all.
    expect(
      within(row('prompter:control')).queryByRole('switch', { name: /Internet for/ })
    ).toBeNull();
  });

  it('draws declared settings with the app’s own controls', async () => {
    render(<PackScreen pack={installed()} onBack={() => {}} />);
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Open after import' })).toBeTruthy()
    );
    fireEvent.click(screen.getByRole('switch', { name: 'Open after import' }));
    expect(api.setPackSettings).toHaveBeenCalledWith('com.example.notion', { autoOpen: true });
    fireEvent.click(screen.getByRole('button', { name: 'Markdown' }));
    expect(api.setPackSettings).toHaveBeenCalledWith('com.example.notion', { format: 'md' });
    expect(screen.getByRole('slider', { name: 'Check every' })).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Page ID' }), {
      target: { value: 'abc' },
    });
    expect(api.setPackSettings).toHaveBeenCalledWith('com.example.notion', { pageId: 'abc' });
  });

  it('shows the network log, newest first, with denials', async () => {
    render(<PackScreen pack={installed()} onBack={() => {}} />);
    const log = await screen.findByTestId('pk-net-log');
    const rows = log.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('evil.example.net');
    expect(rows[0].textContent).toContain('E_NETWORK_DENIED');
    expect(rows[1].textContent).toContain('api.notion.com');
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(api.clearPackNetLog).toHaveBeenCalledWith('com.example.notion');
  });

  it('shows a tampered pack’s reason, and it can’t be switched on', async () => {
    render(
      <PackScreen
        pack={installed({
          enabled: false,
          status: 'tampered',
          statusReason: 'main.js: contents don’t match files.json',
        })}
        onBack={() => {}}
      />
    );
    expect(screen.getAllByRole('alert')[0].textContent).toContain(
      'main.js: contents don’t match files.json'
    );
    expect(screen.getByRole('switch', { name: 'Notion Sync on or off' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Reinstall…' })).toBeTruthy();
    await waitFor(() => expect(api.getPackGrants).toHaveBeenCalled());
  });

  it('shows revoked and crashed states with their reason', () => {
    render(
      <PackScreen
        pack={installed({ status: 'revoked', statusReason: 'Malware.' })}
        onBack={() => {}}
      />
    );
    expect(screen.getByText(/Blocked by eyeread\.in: Malware\./)).toBeTruthy();
    cleanup();
    render(
      <PackScreen
        pack={installed({ status: 'crashed', statusReason: 'Hung for 10 s.' })}
        onBack={() => {}}
      />
    );
    expect(screen.getByText(/Stopped after repeated crashes: Hung for 10 s\./)).toBeTruthy();
  });

  it('asks before uninstalling', async () => {
    const onBack = vi.fn();
    render(<PackScreen pack={installed()} onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: 'Uninstall' }));
    expect(screen.getByText('Uninstall Notion Sync and its settings?')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Uninstall' }).at(-1));
    expect(api.uninstallPack).toHaveBeenCalledWith('com.example.notion');
    await waitFor(() => expect(onBack).toHaveBeenCalled());
  });
});
