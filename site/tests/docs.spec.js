import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mockExternalData } from './mock-external-data.mjs';

/**
 * End-to-end coverage for the developer docs (/docs) and its react-router
 * routing. Runs under every viewport project (desktop/tablet/mobile); the one
 * behaviour that differs by width — the nav "Docs" link, hidden on phones — is
 * guarded per test.
 *
 * The webServer (see playwright.config.js) is the Vite dev server, whose SPA
 * fallback serves index.html for nested paths, so deep links boot the router.
 */
const SHOTS = resolve(dirname(fileURLToPath(import.meta.url)), 'screenshots');

test.beforeEach(async ({ page }) => {
  await mockExternalData(page);
});

test.describe('developer docs', () => {
  test('deep-loads a docs page directly', async ({ page }) => {
    await page.goto('/docs/architecture/');
    await expect(page.locator('.doc-prose h1')).toHaveText('Architecture');
    await expect(page.locator('.docs-nav')).toBeVisible();
    // DocsLayout syncs the head on render.
    await expect(page).toHaveTitle(/Architecture · eyeread\.in/);
  });

  test('the nav Docs link opens the docs index', async ({ page }) => {
    test.skip(page.viewportSize().width <= 560, 'Docs nav link is hidden on phones by design');
    await page.goto('/');
    await page.click('nav .nav-docs');
    await expect(page).toHaveURL(/\/docs\/?$/);
    await expect(page.locator('.doc-prose h1')).toHaveText('Developer docs');
  });

  test('the footer Docs link routes to the docs', async ({ page }) => {
    await page.goto('/');
    await page.click('footer a:has-text("Docs")');
    await expect(page).toHaveURL(/\/docs\/?$/);
    await expect(page.locator('.doc-prose h1')).toHaveText('Developer docs');
  });

  test('sidebar navigates between pages without a full reload', async ({ page }) => {
    await page.goto('/docs/');
    // A full page reload would wipe this marker; client-side routing keeps it.
    await page.evaluate(() => {
      window.__noReload = true;
    });

    await page.click('.docs-nav a:has-text("Tauri commands")');
    await expect(page).toHaveURL(/\/docs\/tauri-api\/?$/);
    await expect(page.locator('.doc-prose h1')).toHaveText('Tauri commands & API');

    expect(await page.evaluate(() => window.__noReload)).toBe(true);
  });

  test('marks the active page in the sidebar', async ({ page }) => {
    await page.goto('/docs/contributing/');
    const active = page.locator('.docs-nav-link.is-active');
    await expect(active).toHaveCount(1);
    await expect(active).toHaveText('Contributing');
  });

  test('redirects an unknown docs slug to the index', async ({ page }) => {
    await page.goto('/docs/does-not-exist/');
    await expect(page).toHaveURL(/\/docs\/?$/);
    await expect(page.locator('.doc-prose h1')).toHaveText('Developer docs');
  });

  test('the brand returns home from the docs', async ({ page }) => {
    await page.goto('/docs/architecture/');
    await page.click('.brand');
    await page.waitForURL((url) => url.pathname === '/');
    // Home is rendered (no docs sidebar; the download CTA is back).
    await expect(page.locator('.docs-nav')).toHaveCount(0);
    await expect(page.locator('nav .btn-accent')).toBeVisible();
  });

  // Screenshots only, once each — the docs section had zero visual coverage
  // before this. Desktop-only: prose-heavy pages don't need a per-viewport
  // diff surface the way the app/hero layouts do.
  test('captures a full-page screenshot of the docs index', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'screenshot captured once, at desktop only');
    await page.goto('/docs/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: resolve(SHOTS, 'docs-index.png'), fullPage: true });
  });

  test('captures a full-page screenshot of an article page', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'screenshot captured once, at desktop only');
    await page.goto('/docs/architecture/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: resolve(SHOTS, 'docs-architecture.png'), fullPage: true });
  });
});
