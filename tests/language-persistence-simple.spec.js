const { test, expect } = require('@playwright/test');

test.describe('Language Persistence Bug Fix Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Capture only important errors (ignore auth errors)
    page.on('console', msg => {
      if (msg.type() === 'error' && 
          !msg.text().includes('Access token required') && 
          !msg.text().includes('401') &&
          !msg.text().includes('Unauthorized')) {
        console.log('❌ Console Error:', msg.text());
      }
    });
  });

  test('Bulgarian language persists after page refresh - Bug Fix Validation', async ({ page }) => {
    console.log('🔍 Testing the specific bug fix: Bulgarian language persistence after refresh');
    
    // Step 1: Navigate to homepage
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Verify initial English state
    console.log('📄 Confirming initial English state...');
    await expect(page.locator('#languageSwitcher')).toBeVisible();
    await expect(page.locator('#currentLanguage')).toHaveText('EN');
    
    // Check English content
    const englishContent = await page.locator('body').textContent();
    expect(englishContent).toContain('Measure Everything in Bitcoin');
    expect(englishContent).toContain('Home');
    expect(englishContent).toContain('Portfolio');
    
    // Step 3: Switch to Bulgarian
    console.log('🔄 Switching to Bulgarian language...');
    await page.locator('#languageSwitcher').click();
    await page.waitForTimeout(1000);
    
    await page.locator('.language-option[data-language="bg"]').click();
    await page.waitForTimeout(2000);
    
    // Step 4: Verify Bulgarian content appears
    console.log('📄 Verifying Bulgarian content appears...');
    await expect(page.locator('#currentLanguage')).toHaveText('BG');
    
    const bulgarianContent = await page.locator('body').textContent();
    expect(bulgarianContent).toContain('Измервайте всичко в Биткойн');
    expect(bulgarianContent).toContain('Начало'); // Home in Bulgarian
    expect(bulgarianContent).toContain('Портфолио'); // Portfolio in Bulgarian
    
    // Verify localStorage
    let storedLanguage = await page.evaluate(() => localStorage.getItem('language'));
    expect(storedLanguage).toBe('bg');
    console.log('💾 Language stored in localStorage:', storedLanguage);
    
    // Step 5: THE CRITICAL TEST - Refresh the page
    console.log('🔄 CRITICAL TEST: Refreshing page to test persistence...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Allow time for language to load
    
    // Step 6: Verify Bulgarian persists after refresh (THIS WAS THE BUG)
    console.log('📄 Verifying Bulgarian persistence after refresh...');
    
    // Check dropdown still shows BG
    await expect(page.locator('#currentLanguage')).toHaveText('BG');
    
    // Check content is still in Bulgarian (this was failing before the fix)
    const refreshedContent = await page.locator('body').textContent();
    expect(refreshedContent).toContain('Измервайте всичко в Биткойн');
    expect(refreshedContent).toContain('Начало');
    
    // Verify localStorage persisted
    storedLanguage = await page.evaluate(() => localStorage.getItem('language'));
    expect(storedLanguage).toBe('bg');
    console.log('💾 Language after refresh:', storedLanguage);
    
    // Step 7: Test switching back to English and persistence
    console.log('🔄 Testing English switch and persistence...');
    await page.locator('#languageSwitcher').click();
    await page.waitForTimeout(1000);
    
    await page.locator('.language-option[data-language="en"]').click();
    await page.waitForTimeout(2000);
    
    // Verify English appears
    await expect(page.locator('#currentLanguage')).toHaveText('EN');
    const englishContentAfter = await page.locator('body').textContent();
    expect(englishContentAfter).toContain('Measure Everything in Bitcoin');
    
    // Refresh to test English persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Verify English persists
    await expect(page.locator('#currentLanguage')).toHaveText('EN');
    const finalContent = await page.locator('body').textContent();
    expect(finalContent).toContain('Measure Everything in Bitcoin');
    
    const finalStoredLanguage = await page.evaluate(() => localStorage.getItem('language'));
    expect(finalStoredLanguage).toBe('en');
    
    console.log('✅ BUG FIX VALIDATED: Language persistence works correctly!');
  });

  test('Verify localStorage synchronization between translation service and UI', async ({ page }) => {
    console.log('🔍 Testing localStorage synchronization...');
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Switch to Bulgarian
    await page.locator('#languageSwitcher').click();
    await page.waitForTimeout(1000);
    await page.locator('.language-option[data-language="bg"]').click();
    await page.waitForTimeout(2000);
    
    // Verify synchronization
    const [storedLang, currentLang] = await page.evaluate(() => {
      return [
        localStorage.getItem('language'),
        document.querySelector('#currentLanguage')?.textContent
      ];
    });
    
    expect(storedLang).toBe('bg');
    expect(currentLang).toBe('BG');
    
    console.log('✅ localStorage and UI are synchronized');
  });
});
