const { test, expect } = require('@playwright/test');

test('Debug page structure and elements', async ({ page }) => {
  console.log('🔍 Loading page to understand structure...');
  
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Take a screenshot
  await page.screenshot({ path: '.temp/homepage-structure.png', fullPage: true });
  console.log('📸 Screenshot saved to .temp/homepage-structure.png');
  
  // Log page title
  const title = await page.title();
  console.log('📄 Page title:', title);
  
  // Check what main content containers exist
  const mainContainers = await page.locator('main, .main, .container, .content, .app, #app, .page').all();
  console.log('📦 Found containers:', mainContainers.length);
  
  for (let i = 0; i < mainContainers.length; i++) {
    const container = mainContainers[i];
    const tagName = await container.evaluate(el => el.tagName.toLowerCase());
    const className = await container.evaluate(el => el.className);
    const id = await container.evaluate(el => el.id);
    console.log('📦 Container', i + 1, ':', tagName, 'class=', className, 'id=', id);
  }
  
  // Look for language dropdown elements
  const languageElements = await page.locator('[class*="language"], [data-testid*="language"], .dropdown, select').all();
  console.log('🌐 Found language elements:', languageElements.length);
  
  for (let i = 0; i < languageElements.length; i++) {
    const element = languageElements[i];
    const tagName = await element.evaluate(el => el.tagName.toLowerCase());
    const className = await element.evaluate(el => el.className);
    const textContent = await element.textContent();
    console.log('🌐 Language element', i + 1, ':', tagName, 'class=', className, 'text=', textContent);
  }
  
  // Look for buttons and links
  const buttons = await page.locator('button, a').all();
  console.log('🔘 Found buttons/links:', buttons.length);
  
  for (let i = 0; i < Math.min(buttons.length, 10); i++) {
    const button = buttons[i];
    const textContent = await button.textContent();
    const href = await button.getAttribute('href');
    const tagName = await button.evaluate(el => el.tagName.toLowerCase());
    console.log('🔘 Button', i + 1, ':', tagName, 'text=', textContent, 'href=', href);
  }
  
  // Check for any text that might be welcome content
  const bodyText = await page.textContent('body');
  const hasPortfolioText = bodyText.includes('Portfolio') || bodyText.includes('portfolio');
  const hasWelcomeText = bodyText.includes('Welcome') || bodyText.includes('welcome');
  const hasStartText = bodyText.includes('Start') || bodyText.includes('start');
  
  console.log('📝 Page contains "Portfolio":', hasPortfolioText);
  console.log('📝 Page contains "Welcome":', hasWelcomeText);
  console.log('📝 Page contains "Start":', hasStartText);
  
  // Log first 500 characters of body text
  console.log('📝 Body text sample:', bodyText.substring(0, 500));
});
