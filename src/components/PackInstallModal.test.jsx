// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18n from '../i18n';
import { PackInstallModal } from './PackInstallModal';

beforeAll(() => i18n.changeLanguage('en'));
afterEach(cleanup);

const pack = (over = {}) => ({
  id: 'com.example.notion',
  name: 'Notion Sync',
  version: '1.2.0',
  description: 'Sends a Notion page to your library.',
  author: { name: 'Ada Example' },
  license: 'AGPL-3.0-only',
  permissions: [],
  settings: 0,
  includes: [],
  verification: { status: 'community' },
  verified: false,
  installed: null,
  ...over,
});

const review = (over = {}) => ({
  path: '/tmp/p.zip',
  bundleHash: 'abc',
  pack: pack(),
  included: [],
  permissions: [
    {
      permission: 'scripts:write',
      packs: ['com.example.notion'],
      network: ['https://api.notion.com'],
    },
    {
      permission: 'prompter:control',
      packs: ['com.example.notion', 'com.example.a'],
      network: [],
    },
  ],
  conflict: null,
  ...over,
});

function setup(props) {
  const onInstall = vi.fn();
  const onDeny = vi.fn();
  render(<PackInstallModal busy={false} onInstall={onInstall} onDeny={onDeny} {...props} />);
  return { onInstall, onDeny, install: screen.getByRole('button', { name: 'Install' }) };
}

describe('PackInstallModal', () => {
  it('lists every permission and internet site combined', () => {
    setup({ review: review() });
    const list = screen.getByTestId('pk-install-permissions');
    expect(list.textContent).toContain('Add scripts');
    expect(list.textContent).toContain('Control playback');
    expect(list.textContent).toContain('Internet: https://api.notion.com');
    expect(screen.getByText('License: AGPL-3.0-only')).toBeTruthy();
  });

  it('keeps Install disabled for an unsigned pack until the risks are acknowledged', () => {
    const { install, onInstall } = setup({ review: review() });
    expect(screen.getByText('Not verified')).toBeTruthy();
    expect(install.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('I understand the risks'));
    expect(install.disabled).toBe(false);
    fireEvent.click(install);
    expect(onInstall).toHaveBeenCalledOnce();
  });

  it('needs no acknowledgement for a Verified pack', () => {
    const { install } = setup({ review: review({ pack: pack({ verified: true }) }) });
    expect(screen.queryByLabelText('I understand the risks')).toBeNull();
    expect(screen.getByText(/Verified by eyeread\.in/)).toBeTruthy();
    expect(install.disabled).toBe(false);
  });

  it('focuses Don’t install, and Esc denies', () => {
    const { onDeny } = setup({ review: review() });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Don’t install' }));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onDeny).toHaveBeenCalledOnce();
  });

  it('shows included packs, and blocks a conflicting install with the reason', () => {
    const { install } = setup({
      review: review({
        pack: pack({ verified: true }),
        included: [
          pack({ id: 'com.example.a', name: 'Helper', version: '1.0.0', verified: false }),
        ],
        conflict: {
          code: 'INSTALL_CONFLICT',
          message: 'Helper 2.0.0 is installed and used by Studio.',
        },
      }),
    });
    expect(screen.getByText('Also installs:')).toBeTruthy();
    expect(screen.getByText('Helper')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('used by Studio');
    expect(install.disabled).toBe(true);
  });

  it('shows why a pack file was rejected', () => {
    const { install } = setup({ error: 'main.js: code looks minified or obfuscated.' });
    expect(screen.getByRole('alert').textContent).toContain('minified');
    expect(install.disabled).toBe(true);
  });
});
