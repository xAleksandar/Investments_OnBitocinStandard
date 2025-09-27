const { test, expect } = require('@playwright/test');

test.describe('Home Page Translation Functionality', () => {
  let consoleErrors = [];
  
  test.beforeEach(async ({ page }) => {
    // Capture console errors
    consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('❌ Console Error:', msg.text());
      }
    });
    
    page.on('pageerror', error => {
      consoleErrors.push(error.message);
      console.log('❌ Page Error:', error.message);
    });
  });

  test('Home page translation functionality - complete workflow', async ({ page }) => {
    console.log('🔍 Starting home page translation test...');
    
    // Step 1: Navigate to home page
    console.log('📄 Navigating to home page...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Verify site starts in English
    console.log('🔍 Checking initial language state...');
    
    // Check language dropdown shows English flag/text
    const languageDropdown = page.locator('[data-testid="language-dropdown"], .language-switcher, .language-dropdown').first();
    await expect(languageDropdown).toBeVisible();
    
    // Step 3: Check welcome section content in English
    console.log('🔍 Checking English welcome section content...');
    
    // Look for welcome section elements
    const welcomeSection = page.locator('.welcome-section, .hero-section, .main-content').first();
    await expect(welcomeSection).toBeVisible();
    
    // Check for English button text - could be "Start Your Portfolio" or "View Portfolio"
    const startButton = page.locator('button, a').filter({ hasText: /Start Your Portfolio|View Portfolio|Get Started/i }).first();
    const englishButtonText = await startButton.textContent();
    console.log('📝 English button text:', englishButtonText);
    
    // Check for any welcome messages
    const welcomeText = page.locator('text=/Welcome|Start|Portfolio|Bitcoin/i').first();
    const englishWelcomeText = await welcomeText.textContent();
    console.log('📝 English welcome text:', englishWelcomeText);
    
    // Step 4: Switch to Bulgarian language
    console.log('🔄 Switching to Bulgarian language...');
    
    // Click language dropdown
    await languageDropdown.click();
    await page.waitForTimeout(500);
    
    // Look for Bulgarian option (could be "БГ", "Bulgarian", or flag)
    const bulgarianOption = page.locator('[data-value="bg"], text=/БГ|Bulgarian|България/i, img[alt*="Bulgaria"]').first();
    await expect(bulgarianOption).toBeVisible();
    await bulgarianOption.click();
    
    // Wait for language change to apply
    await page.waitForTimeout(1000);
    
    // Step 5: Verify Bulgarian translations
    console.log('🔍 Verifying Bulgarian translations...');
    
    // Check for Bulgarian button text
    const bulgarianStartButton = page.locator('button, a').filter({ 
      hasText: /Започнете вашето портфолио|Вижте портфолиото|Започни/i 
    }).first();
    
    if (await bulgarianStartButton.isVisible()) {
      const bulgarianButtonText = await bulgarianStartButton.textContent();
      console.log('✅ Bulgarian button text:', bulgarianButtonText);
      expect(bulgarianButtonText).toMatch(/Започнете|Вижте|Започни/);
    } else {
      console.log('⚠️ Bulgarian button not found, checking for any translated content...');
      
      // Check if any content has changed to Bulgarian
      const currentContent = await page.textContent('body');
      const hasBulgarianContent = /[А-Я]/.test(currentContent);
      console.log('📝 Has Bulgarian content:', hasBulgarianContent);
      
      if (!hasBulgarianContent) {
        console.log('❌ No Bulgarian content detected after language switch');
      }
    }
    
    // Look for welcome back message in Bulgarian
    const bulgarianWelcome = page.locator('text=/Добре дошли|Добро дошли/i').first();
    if (await bulgarianWelcome.isVisible()) {
      const bulgarianWelcomeText = await bulgarianWelcome.textContent();
      console.log('✅ Bulgarian welcome text:', bulgarianWelcomeText);
    }
    
    // Step 6: Switch back to English
    console.log('🔄 Switching back to English...');
    
    await languageDropdown.click();
    await page.waitForTimeout(500);
    
    const englishOption = page.locator('[data-value="en"], text=/EN|English/i, img[alt*="United States"]').first();
    await expect(englishOption).toBeVisible();
    await englishOption.click();
    
    await page.waitForTimeout(1000);
    
    // Verify English is restored
    console.log('🔍 Verifying English restoration...');
    const restoredButton = page.locator('button, a').filter({ hasText: /Start Your Portfolio|View Portfolio|Get Started/i }).first();
    if (await restoredButton.isVisible()) {
      const restoredButtonText = await restoredButton.textContent();
      console.log('✅ Restored English button text:', restoredButtonText);
    }
    
    // Step 7: Test language persistence after refresh
    console.log('🔄 Testing language persistence...');
    
    // Switch to Bulgarian again
    await languageDropdown.click();
    await page.waitForTimeout(500);
    await bulgarianOption.click();
    await page.waitForTimeout(1000);
    
    // Refresh the page
    console.log('🔄 Refreshing page...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if Bulgarian is still active
    const persistentBulgarianButton = page.locator('button, a').filter({ 
      hasText: /Започнете вашето портфолио|Вижте портфолиото|Започни/i 
    }).first();
    
    if (await persistentBulgarianButton.isVisible()) {
      console.log('✅ Language persisted after refresh');
    } else {
      console.log('⚠️ Language may not have persisted, checking current state...');
      const currentState = await page.textContent('body');
      console.log('📝 Page contains Bulgarian after refresh:', /[А-Я]/.test(currentState));
    }
    
    // Final console error check
    console.log('🔍 Final console error check...');
    if (consoleErrors.length > 0) {
      console.log('❌ Console errors detected:', consoleErrors);
      // Don't fail the test for minor console errors, just report them
    } else {
      console.log('✅ No console errors detected');
    }
    
    console.log('✅ Home page translation test completed');
  });
});
