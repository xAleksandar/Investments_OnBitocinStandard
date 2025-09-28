const { test, expect } = require('@playwright/test');

test.describe('Education Page Language Switching', () => {
  test('should switch content language from English to Bulgarian and back', async ({ page }) => {
    // Capture console errors and page errors
    const consoleErrors = [];
    const pageErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('🚨 Console Error:', msg.text());
      }
    });
    
    page.on('pageerror', error => {
      pageErrors.push(error.message);
      console.log('❌ Page Error:', error.message);
    });

    // 1. Navigate to home page first
    console.log('📄 Navigating to home page...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // 2. Navigate to education/learn page
    console.log('📚 Navigating to education page...');
    await page.click('text=Learn');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the education page
    await expect(page).toHaveURL(/.*\/education/);

    // 3. Verify initial English content
    console.log('🔍 Verifying initial English content...');
    
    // Check for English topic titles
    await expect(page.locator('text=The Fiat Experiment')).toBeVisible();
    await expect(page.locator('text=Satoshi Revolution')).toBeVisible();
    await expect(page.locator('text=21 Million Club')).toBeVisible();
    
    // Check page title/subtitle in English
    await expect(page.locator('text=Learn Bitcoin')).toBeVisible();
    
    // Check Get Started section
    await expect(page.locator('text=Get Started')).toBeVisible();

    // 4. Switch to Bulgarian language
    console.log('🇧🇬 Switching to Bulgarian language...');
    
    // Click the language dropdown
    await page.click('[data-testid="language-switcher"]');
    await page.waitForTimeout(500); // Wait for dropdown to open
    
    // Click Bulgarian option
    await page.click('text=български');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for language change to process

    // 5. Verify Bulgarian content
    console.log('🔍 Verifying Bulgarian content...');
    
    // Check for Bulgarian topic titles
    await expect(page.locator('text=Фиатният експеримент')).toBeVisible();
    await expect(page.locator('text=Революция Сатоши')).toBeVisible();
    await expect(page.locator('text=Клуб 21 милион')).toBeVisible();
    
    // Check page title/subtitle in Bulgarian
    await expect(page.locator('text=Научи Биткойн')).toBeVisible();
    
    // Check Get Started section in Bulgarian
    await expect(page.locator('text=Започни')).toBeVisible();

    // 6. Switch back to English
    console.log('🇺🇸 Switching back to English...');
    
    // Click the language dropdown again
    await page.click('[data-testid="language-switcher"]');
    await page.waitForTimeout(500);
    
    // Click English option
    await page.click('text=English');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 7. Verify English content is back
    console.log('🔍 Verifying English content restored...');
    
    // Check for English topic titles again
    await expect(page.locator('text=The Fiat Experiment')).toBeVisible();
    await expect(page.locator('text=Satoshi Revolution')).toBeVisible();
    await expect(page.locator('text=21 Million Club')).toBeVisible();
    
    // Check page title/subtitle in English
    await expect(page.locator('text=Learn Bitcoin')).toBeVisible();

    // 8. Test on a specific topic page
    console.log('📖 Testing language switch on specific topic page...');
    
    // Click on a topic to navigate to specific page
    await page.click('text=The Fiat Experiment');
    await page.waitForLoadState('networkidle');
    
    // Switch to Bulgarian on topic page
    await page.click('[data-testid="language-switcher"]');
    await page.waitForTimeout(500);
    await page.click('text=български');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Verify Bulgarian content on topic page
    await expect(page.locator('text=Фиатният експеримент')).toBeVisible();
    
    // Switch back to English on topic page
    await page.click('[data-testid="language-switcher"]');
    await page.waitForTimeout(500);
    await page.click('text=English');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Verify English content restored on topic page
    await expect(page.locator('text=The Fiat Experiment')).toBeVisible();

    // 9. Final validation - no errors should have occurred
    console.log('✅ Validating no errors occurred...');
    
    if (consoleErrors.length > 0) {
      console.log('❌ Console errors found:', consoleErrors);
      throw new Error(`Console errors occurred: ${consoleErrors.join(', ')}`);
    }
    
    if (pageErrors.length > 0) {
      console.log('❌ Page errors found:', pageErrors);
      throw new Error(`Page errors occurred: ${pageErrors.join(', ')}`);
    }
    
    console.log('🎉 All language switching tests passed successfully!');
  });

  test('should maintain language preference during navigation', async ({ page }) => {
    // Test that language preference persists when navigating between pages
    console.log('🔄 Testing language persistence during navigation...');
    
    // Navigate to home page
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Switch to Bulgarian
    await page.click('[data-testid="language-switcher"]');
    await page.waitForTimeout(500);
    await page.click('text=български');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Navigate to education page
    await page.click('text=Научи'); // "Learn" in Bulgarian
    await page.waitForLoadState('networkidle');
    
    // Verify content is still in Bulgarian
    await expect(page.locator('text=Фиатният експеримент')).toBeVisible();
    await expect(page.locator('text=Научи Биткойн')).toBeVisible();
    
    console.log('✅ Language preference persisted during navigation!');
  });
});
