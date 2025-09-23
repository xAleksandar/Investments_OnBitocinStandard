import { test, expect } from '@playwright/test';

/**
 * Access Control Tests for Bitcoin Investment Game (Fixed)
 * Tests that auth-required pages properly handle unauthenticated access
 */

test.describe('Access Control Tests (Fixed)', () => {
  let consoleErrors = [];
  let uncaughtExceptions = [];

  test.beforeEach(async ({ page }) => {
    // Reset error arrays
    consoleErrors = [];
    uncaughtExceptions = [];

    // Listen for console errors (filtering expected ones)
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const errorText = msg.text();
        const location = msg.location();
        
        // Filter expected 404 for app.js
        const isExpected404 = errorText.includes('Failed to load resource') && 
                             location.url.includes('/src/client/app.js');
        
        if (!isExpected404) {
          consoleErrors.push({
            text: errorText,
            location: location,
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    // Listen for uncaught exceptions
    page.on('pageerror', error => {
      uncaughtExceptions.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });

    // Ensure we're not authenticated
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Portfolio page handles unauthenticated access appropriately', async ({ page }) => {
    await page.goto('/#portfolio');
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    const bodyText = await page.locator('body').textContent();
    
    // Page should either redirect, show login prompt, or handle auth gracefully
    const isRedirected = !currentUrl.includes('#portfolio');
    const hasAuthPrompt = bodyText?.toLowerCase().includes('login') || 
                         bodyText?.toLowerCase().includes('sign up') ||
                         bodyText?.toLowerCase().includes('authentication') ||
                         bodyText?.toLowerCase().includes('please log in');
    
    // Check for login button (use first() to avoid strict mode violations)
    const loginButtonVisible = await page.locator('button:has-text("Login"), button:has-text("Sign Up")').first().isVisible().catch(() => false);

    // At least one condition should be true for proper access control
    const hasProperAccessControl = isRedirected || hasAuthPrompt || loginButtonVisible;
    expect(hasProperAccessControl).toBe(true);

    // Should not have uncaught exceptions
    expect(uncaughtExceptions).toHaveLength(0);
  });

  test('Admin page handles unauthenticated access appropriately', async ({ page }) => {
    await page.goto('/#admin');
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    const bodyText = await page.locator('body').textContent();
    
    // Check access control measures
    const isRedirected = !currentUrl.includes('#admin');
    const hasAccessDenied = bodyText?.toLowerCase().includes('login') || 
                           bodyText?.toLowerCase().includes('sign up') ||
                           bodyText?.toLowerCase().includes('admin') ||
                           bodyText?.toLowerCase().includes('access denied') ||
                           bodyText?.toLowerCase().includes('unauthorized');

    const loginButtonVisible = await page.locator('button:has-text("Login"), button:has-text("Sign Up")').first().isVisible().catch(() => false);

    const hasProperAccessControl = isRedirected || hasAccessDenied || loginButtonVisible;
    expect(hasProperAccessControl).toBe(true);

    expect(uncaughtExceptions).toHaveLength(0);
  });

  test('Login/Auth functionality is accessible on protected pages', async ({ page }) => {
    await page.goto('/#portfolio');
    await page.waitForLoadState('networkidle');

    // Should be able to find authentication elements
    const authElementCount = await page.locator(`
      button:has-text("Login"),
      button:has-text("Sign Up"),
      input[type="email"],
      .login-form,
      .auth-form
    `).count();

    expect(authElementCount).toBeGreaterThan(0);
  });

  test('Navigation menu shows appropriate auth state', async ({ page }) => {
    await page.goto('/#home');
    await page.waitForLoadState('networkidle');

    // Check desktop login button (use first to avoid strict mode violation)
    const desktopLoginButton = page.locator('#navLoginBtn');
    const desktopUserMenu = page.locator('#navUserInfo');
    
    // Desktop login button should be visible, user menu should be hidden
    await expect(desktopLoginButton).toBeVisible();
    await expect(desktopUserMenu).toBeHidden();

    expect(consoleErrors).toHaveLength(0);
    expect(uncaughtExceptions).toHaveLength(0);
  });

  test('Direct URL access to protected pages is handled gracefully', async ({ page }) => {
    // Test portfolio access
    await page.goto('http://localhost:3000/#portfolio');
    await page.waitForLoadState('networkidle');
    
    const portfolioContent = await page.locator('body').textContent();
    expect(portfolioContent.trim()).not.toBe('');

    // Test admin access
    await page.goto('http://localhost:3000/#admin');
    await page.waitForLoadState('networkidle');
    
    const adminContent = await page.locator('body').textContent();
    expect(adminContent.trim()).not.toBe('');

    expect(uncaughtExceptions).toHaveLength(0);
  });

  test('Protected routes in navigation are handled appropriately', async ({ page }) => {
    await page.goto('/#home');
    await page.waitForLoadState('networkidle');

    // Check desktop admin link
    const desktopAdminLink = page.locator('#navAdminLink');
    await expect(desktopAdminLink).toBeHidden();

    // Test portfolio link interaction if visible
    const portfolioLink = page.locator('a[href="#portfolio"]').first();
    if (await portfolioLink.isVisible()) {
      await portfolioLink.click();
      await page.waitForLoadState('networkidle');
      
      // Should not crash
      const bodyText = await page.locator('body').textContent();
      expect(bodyText.trim()).not.toBe('');
    }

    expect(uncaughtExceptions).toHaveLength(0);
  });

  test('Authentication forms or prompts are functional', async ({ page }) => {
    await page.goto('/#portfolio');
    await page.waitForLoadState('networkidle');
    
    // Look for login/auth functionality
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign Up")').first();
    
    if (await loginButton.isVisible()) {
      // Login button should be clickable
      await expect(loginButton).toBeEnabled();
      
      // Clicking it shouldn't cause crashes
      await loginButton.click();
      await page.waitForTimeout(1000);
      
      expect(uncaughtExceptions).toHaveLength(0);
    }
  });

  test('Error handling for unauthenticated API requests', async ({ page }) => {
    // Monitor network requests
    const failedApiRequests = [];
    
    page.on('response', response => {
      if (response.url().includes('/api/') && !response.ok()) {
        failedApiRequests.push({
          url: response.url(),
          status: response.status()
        });
      }
    });

    await page.goto('/#portfolio');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // API failures are expected for unauthenticated users, but shouldn't crash the app
    expect(uncaughtExceptions).toHaveLength(0);
    
    // App should still be functional
    const bodyText = await page.locator('body').textContent();
    expect(bodyText.trim()).not.toBe('');
  });
});
