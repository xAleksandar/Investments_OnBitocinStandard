import { test, expect } from '@playwright/test';

/**
 * Navigation Flow Tests for Measure Everything in Bitcoin
 * Tests comprehensive navigation patterns and user flows
 */

test.describe('Navigation Flow Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh for each test
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Complete public page navigation flow', async ({ page }) => {
    // Start at home page
    await page.goto('/#home');
    await expect(page).toHaveURL(/.*#home/);

    // Navigate to assets page
    await page.click('a[href="#assets"]');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*#assets/);

    // Navigate to education page
    await page.click('a[href="#education"]');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*#education/);

    // Navigate to components page
    await page.click('a[href="#components"]');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*#components/);

    // Navigate back to home
    await page.click('a[href="#home"]');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*#home/);
  });

  test('Mobile navigation menu works correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/#home');
    await page.waitForLoadState('networkidle');

    // Look for mobile menu toggle button
    const mobileToggle = page.locator('button[aria-label="Toggle navigation"], #menuToggle, .mobile-menu-toggle');

    if (await mobileToggle.isVisible()) {
      // Click to open mobile menu
      await mobileToggle.click();

      // Mobile menu should be visible
      const mobileMenu = page.locator('.mobile-menu, #mobileMenu, [data-testid="mobile-menu"]');
      await expect(mobileMenu).toBeVisible();

      // Test navigation within mobile menu
      await page.click('a[href="#assets"].mobile-nav-link, .mobile-menu a[href="#assets"]');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*#assets/);
    }
  });

  test('Browser back and forward navigation works', async ({ page }) => {
    // Navigate through pages
    await page.goto('/#home');
    await page.waitForLoadState('networkidle');

    await page.goto('/#assets');
    await page.waitForLoadState('networkidle');

    await page.goto('/#education');
    await page.waitForLoadState('networkidle');

    // Use browser back button
    await page.goBack();
    await expect(page).toHaveURL(/.*#assets/);

    await page.goBack();
    await expect(page).toHaveURL(/.*#home/);

    // Use browser forward button
    await page.goForward();
    await expect(page).toHaveURL(/.*#assets/);
  });

  test('Direct URL navigation works for all routes', async ({ page }) => {
    const routes = [
      '/#home',
      '/#assets',
      '/#education',
      '/#components'
    ];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(new RegExp(route));

      // Page should load content (not blank)
      const bodyText = await page.locator('body').textContent();
      expect(bodyText.trim()).not.toBe('');
    }
  });

  test('Navigation maintains state correctly', async ({ page }) => {
    // Visit home page and check title/heading
    await page.goto('/#home');
    await page.waitForLoadState('networkidle');

    const homeContent = await page.locator('h1, .page-title, [data-testid="page-title"]').first().textContent();

    // Navigate away and back
    await page.goto('/#assets');
    await page.waitForLoadState('networkidle');

    await page.goto('/#home');
    await page.waitForLoadState('networkidle');

    // Content should be the same
    const homeContentAfter = await page.locator('h1, .page-title, [data-testid="page-title"]').first().textContent();
    expect(homeContentAfter).toBe(homeContent);
  });

  test('Navigation handles invalid routes gracefully', async ({ page }) => {
    // Try an invalid route
    await page.goto('/#invalid-route');
    await page.waitForLoadState('networkidle');

    // Should redirect to home or show 404 page, not crash
    const bodyText = await page.locator('body').textContent();
    expect(bodyText.trim()).not.toBe('');

    // Should not show JavaScript errors in console
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigation should still work after invalid route
    await page.click('a[href="#home"]');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*#home/);

    expect(consoleErrors).toHaveLength(0);
  });

  test('Page refresh maintains current route', async ({ page }) => {
    // Navigate to a specific page
    await page.goto('/#education');
    await page.waitForLoadState('networkidle');

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be on the education page
    await expect(page).toHaveURL(/.*#education/);

    // Content should be loaded
    const bodyText = await page.locator('body').textContent();
    expect(bodyText.trim()).not.toBe('');
  });

  test('Navigation accessibility with keyboard', async ({ page }) => {
    await page.goto('/#home');
    await page.waitForLoadState('networkidle');

    // Focus on navigation
    const firstNavLink = page.locator('nav a').first();
    await firstNavLink.focus();

    // Tab through navigation links
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Press Enter on a focused link
    const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('href'));

    if (focusedElement && focusedElement.startsWith('#')) {
      await page.keyboard.press('Enter');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(new RegExp(focusedElement));
    }
  });

  test('Page loading states are handled properly', async ({ page }) => {
    // Monitor for loading states
    const loadingStates = [];

    page.on('domcontentloaded', () => {
      loadingStates.push('domcontentloaded');
    });

    page.on('load', () => {
      loadingStates.push('load');
    });

    // Navigate to a page
    await page.goto('/#assets');
    await page.waitForLoadState('networkidle');

    // Should have proper loading sequence
    expect(loadingStates).toContain('domcontentloaded');
    expect(loadingStates).toContain('load');

    // Page should be fully interactive
    const interactiveState = await page.evaluate(() => document.readyState);
    expect(interactiveState).toBe('complete');
  });

  test('External link handling (if any)', async ({ page }) => {
    await page.goto('/#home');
    await page.waitForLoadState('networkidle');

    // Look for external links
    const externalLinks = await page.locator('a[href^="http"], a[target="_blank"]').count();

    if (externalLinks > 0) {
      // External links should have proper attributes
      const firstExternalLink = page.locator('a[href^="http"], a[target="_blank"]').first();
      const target = await firstExternalLink.getAttribute('target');
      const rel = await firstExternalLink.getAttribute('rel');

      // External links should open in new tab and have security attributes
      if (target === '_blank') {
        expect(rel).toContain('noopener');
      }
    }
  });
});
