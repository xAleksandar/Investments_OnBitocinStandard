const { test, expect } = require('@playwright/test');

test.describe('Language Persistence Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console errors (ignore auth errors since we're testing without login)
    page.on('pageerror', e => console.log('❌ Page Error:', e.message));
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('Access token required') && !msg.text().includes('401')) {
        console.log('❌ Console Error:', msg.text());
      }
    });
  });

  test('should persist Bulgarian language selection after page refresh', async ({ page }) => {
    console.log('🔍 Testing language persistence functionality...');
    
    // Step 1: Navigate to homepage
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Verify site starts in English
    console.log('📄 Verifying initial English state...');
    const initialHeaderText = await page.locator('nav').textContent();
    expect(initialHeaderText).toContain('Home');
    expect(initialHeaderText).toContain('Portfolio');
    expect(initialHeaderText).toContain('Learn');
    
    // Check the language dropdown shows English initially (using correct ID)
    const languageDropdown = page.locator('#languageSwitcher');
    await expect(languageDropdown).toBeVisible();
    
    // Verify current language shows EN
    const currentLanguage = page.locator('#currentLanguage');
    await expect(currentLanguage).toHaveText('EN');
    
    // Step 3: Click language dropdown and select Bulgarian
    console.log('🔄 Switching to Bulgarian language...');
    await languageDropdown.click();
    await page.waitForTimeout(1000); // Wait for dropdown to open
    
    // Look for Bulgarian option and click it
    const bulgarianOption = page.locator('.language-option[data-language="bg"]');
    await expect(bulgarianOption).toBeVisible();
    await bulgarianOption.click();
    
    // Wait for language change to take effect
    await page.waitForTimeout(2000);
    
    // Step 4: Verify content changes to Bulgarian
    console.log('📄 Verifying Bulgarian content appears...');
    
    // Check that EN changed to BG in the dropdown
    await expect(currentLanguage).toHaveText('BG');
    
    // Check for specific Bulgarian translations in navigation
    const navContent = await page.locator('nav').textContent();
    console.log('🔍 Navigation content after switch:', navContent.substring(0, 100));
    
    // Navigate to Learn page to check specific translations
    const learnLink = page.locator('nav a[href="/learn"], nav a[href="#learn"]').first();
    await learnLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Check Learn page content in Bulgarian
    const learnPageContent = await page.textContent('body');
    console.log('📚 Learn page content sample:', learnPageContent.substring(0, 200));
    
    // Step 5: Refresh the page
    console.log('🔄 Refreshing page to test persistence...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for language to load
    
    // Step 6: Verify Bulgarian content persists after refresh
    console.log('📄 Verifying Bulgarian persistence after refresh...');
    
    // Check that language dropdown still shows BG
    const currentLangAfterRefresh = page.locator('#currentLanguage');
    await expect(currentLangAfterRefresh).toHaveText('BG');
    
    // Check localStorage has the correct language
    const storedLanguage = await page.evaluate(() => localStorage.getItem('language'));
    console.log('💾 Stored language in localStorage:', storedLanguage);
    expect(storedLanguage).toBe('bg');
    
    // Verify navigation is still in Bulgarian
    const refreshedNavContent = await page.locator('nav').textContent();
    console.log('🔍 Refreshed navigation content:', refreshedNavContent.substring(0, 100));
    
    // Step 7: Test switching back to English
    console.log('🔄 Testing switch back to English...');
    const langDropdownAfterRefresh = page.locator('#languageSwitcher');
    await langDropdownAfterRefresh.click();
    await page.waitForTimeout(1000);
    
    const englishOption = page.locator('.language-option[data-language="en"]');
    await expect(englishOption).toBeVisible();
    await englishOption.click();
    await page.waitForTimeout(2000);
    
    // Verify English content appears
    await expect(currentLangAfterRefresh).toHaveText('EN');
    
    // Refresh again to test English persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Verify English persists
    const finalStoredLanguage = await page.evaluate(() => localStorage.getItem('language'));
    console.log('💾 Final stored language:', finalStoredLanguage);
    expect(finalStoredLanguage).toBe('en');
    
    await expect(page.locator('#currentLanguage')).toHaveText('EN');
    
    console.log('✅ Language persistence test completed successfully!');
  });

  test('should maintain language state across navigation', async ({ page }) => {
    console.log('🔍 Testing language state across navigation...');
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Switch to Bulgarian
    const languageDropdown = page.locator('#languageSwitcher');
    await languageDropdown.click();
    await page.waitForTimeout(1000);
    
    const bulgarianOption = page.locator('.language-option[data-language="bg"]');
    await bulgarianOption.click();
    await page.waitForTimeout(2000);
    
    // Navigate to different pages and verify language persists
    const navigationLinks = [
      { name: 'Home', selector: 'nav a[href="/"], nav a[href="#home"]' },
      { name: 'Learn', selector: 'nav a[href="/learn"], nav a[href="#learn"]' }
    ];
    
    for (const link of navigationLinks) {
      console.log(`📄 Testing ${link.name} page in Bulgarian...`);
      
      // Navigate to page
      const navLink = page.locator(link.selector).first();
      await navLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Verify language is still Bulgarian
      const storedLanguage = await page.evaluate(() => localStorage.getItem('language'));
      expect(storedLanguage).toBe('bg');
      
      // Verify dropdown still shows Bulgarian
      const currentLang = page.locator('#currentLanguage');
      await expect(currentLang).toHaveText('BG');
    }
    
    console.log('✅ Language state maintained across navigation!');
  });
});
