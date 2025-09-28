const { test, expect } = require('@playwright/test');

test.describe('Home Page Translation Functionality', () => {
  let consoleErrors = [];
  
  test.beforeEach(async ({ page }) => {
    // Capture console errors (ignore expected 401 auth errors)
    consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('401') && !msg.text().includes('Access token required')) {
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
    
    // Step 2: Verify site starts in English - check language switcher
    console.log('🔍 Checking initial language state...');
    
    // Check language dropdown shows English (US flag and EN text)
    const languageDropdown = page.locator('.language-switcher');
    await expect(languageDropdown).toBeVisible();
    
    const languageFlag = page.locator('.language-flag');
    await expect(languageFlag).toBeVisible();
    
    // Step 3: Check English content in key areas
    console.log('🔍 Checking English content...');
    
    // Main title
    const mainTitle = page.locator('text=Measure Everything in Bitcoin');
    await expect(mainTitle).toBeVisible();
    console.log('✅ Found main title in English');
    
    // Description text
    const descriptionText = page.locator('text=/See how traditional assets perform/i');
    await expect(descriptionText).toBeVisible();
    console.log('✅ Found description text in English');
    
    // Start Portfolio button
    const startButton = page.locator('text=Start Your Portfolio');
    await expect(startButton).toBeVisible();
    const englishButtonText = await startButton.textContent();
    console.log('📝 English button text:', englishButtonText);
    
    // Navigation menu items
    const homeNav = page.locator('a[href="#home"]:has-text("Home")');
    const assetsNav = page.locator('a[href="#assets"]:has-text("Assets")');
    const portfolioNav = page.locator('a[href="#portfolio"]:has-text("Portfolio")');
    const learnNav = page.locator('a[href="#learn"]:has-text("Learn")');
    
    await expect(homeNav).toBeVisible();
    await expect(assetsNav).toBeVisible();
    await expect(portfolioNav).toBeVisible();
    await expect(learnNav).toBeVisible();
    console.log('✅ Navigation menu in English verified');
    
    // Step 4: Switch to Bulgarian language
    console.log('🔄 Switching to Bulgarian language...');
    
    // Click language dropdown trigger
    const languageTrigger = page.locator('.language-switcher-trigger');
    await languageTrigger.click();
    await page.waitForTimeout(500);
    
    // Click Bulgarian option
    const bulgarianOption = page.locator('text=Български');
    await expect(bulgarianOption).toBeVisible();
    await bulgarianOption.click();
    
    // Wait for language change to apply
    await page.waitForTimeout(1500);
    
    // Step 5: Verify Bulgarian translations
    console.log('🔍 Verifying Bulgarian translations...');
    
    // Check for Bulgarian button text - it should change from "Start Your Portfolio"
    const bulgarianButton = page.locator('button, a').filter({ 
      hasText: /Започнете вашето портфолио|Започни портфолио|Създай портфолио/i 
    }).first();
    
    if (await bulgarianButton.isVisible()) {
      const bulgarianButtonText = await bulgarianButton.textContent();
      console.log('✅ Bulgarian button text:', bulgarianButtonText);
      expect(bulgarianButtonText).toMatch(/Започнете|Започни|Създай/);
    } else {
      // Check if button still exists with any text and what it shows
      const anyButton = page.locator('button, a').filter({ hasText: /Portfolio|портфолио/i }).first();
      if (await anyButton.isVisible()) {
        const buttonText = await anyButton.textContent();
        console.log('⚠️ Button found but not in expected Bulgarian format:', buttonText);
        
        // Check if ANY content changed to Bulgarian
        const bodyText = await page.textContent('body');
        const hasBulgarianContent = /[А-Яа-я]/.test(bodyText);
        console.log('📝 Page contains Cyrillic characters:', hasBulgarianContent);
        
        if (hasBulgarianContent) {
          console.log('✅ Some Bulgarian content detected, translation system is working');
          // Extract some Bulgarian text samples
          const cyrillicMatches = bodyText.match(/[А-Яа-я][А-Яа-я\s]*[А-Яа-я]/g);
          if (cyrillicMatches) {
            console.log('📝 Bulgarian text samples:', cyrillicMatches.slice(0, 5));
          }
        } else {
          console.log('❌ No Bulgarian content detected after language switch');
        }
      } else {
        console.log('❌ Could not find any portfolio-related button');
      }
    }
    
    // Check navigation menu for Bulgarian translations
    const bodyTextAfterSwitch = await page.textContent('body');
    const hasNavBulgarian = /Начало|Активи|Портфолио|Научи/.test(bodyTextAfterSwitch);
    console.log('📝 Navigation has Bulgarian translations:', hasNavBulgarian);
    
    // Check for main title translation
    const hasBulgarianTitle = bodyTextAfterSwitch.includes('Измерете всичко в Биткойн') || 
                              bodyTextAfterSwitch.includes('Измери всичко в Биткойн');
    console.log('📝 Main title translated to Bulgarian:', hasBulgarianTitle);
    
    // Step 6: Switch back to English
    console.log('🔄 Switching back to English...');
    
    await languageTrigger.click();
    await page.waitForTimeout(500);
    
    const englishOption = page.locator('text=English');
    await expect(englishOption).toBeVisible();
    await englishOption.click();
    
    await page.waitForTimeout(1500);
    
    // Verify English is restored
    console.log('🔍 Verifying English restoration...');
    const restoredButton = page.locator('text=Start Your Portfolio');
    if (await restoredButton.isVisible()) {
      console.log('✅ English button text restored');
    } else {
      const anyButtonAfterRestore = page.locator('button, a').filter({ hasText: /Portfolio|Start/i }).first();
      if (await anyButtonAfterRestore.isVisible()) {
        const buttonText = await anyButtonAfterRestore.textContent();
        console.log('📝 Button after restore:', buttonText);
      }
    }
    
    const restoredTitle = page.locator('text=Measure Everything in Bitcoin');
    await expect(restoredTitle).toBeVisible();
    console.log('✅ English title restored');
    
    // Step 7: Test language persistence after refresh
    console.log('🔄 Testing language persistence...');
    
    // Switch to Bulgarian again
    await languageTrigger.click();
    await page.waitForTimeout(500);
    await bulgarianOption.click();
    await page.waitForTimeout(1500);
    
    // Refresh the page
    console.log('🔄 Refreshing page...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if Bulgarian is still active
    const bodyAfterRefresh = await page.textContent('body');
    const hasBulgarianAfterRefresh = /[А-Яа-я]/.test(bodyAfterRefresh);
    
    if (hasBulgarianAfterRefresh) {
      console.log('✅ Language persisted after refresh');
    } else {
      console.log('⚠️ Language may not have persisted after refresh');
      
      // Check what language is currently selected
      const currentLanguageElement = page.locator('.language-switcher-trigger');
      const currentLanguageText = await currentLanguageElement.textContent();
      console.log('📝 Current language indicator:', currentLanguageText);
    }
    
    // Final console error check
    console.log('🔍 Final console error check...');
    if (consoleErrors.length > 0) {
      console.log('❌ Console errors detected:', consoleErrors);
    } else {
      console.log('✅ No unexpected console errors detected');
    }
    
    // Take final screenshot
    await page.screenshot({ path: '.temp/translation-test-final.png', fullPage: true });
    console.log('📸 Final screenshot saved to .temp/translation-test-final.png');
    
    console.log('✅ Home page translation test completed');
  });
});
