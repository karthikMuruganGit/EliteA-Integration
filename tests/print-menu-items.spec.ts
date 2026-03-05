import { test, expect } from '@playwright/test';

// Test: navigate to playwright.dev and print top menu items
test('print menu items on playwright.dev', async ({ page }) => {
  // Maximize the browser viewport as required
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Navigate to the site
  await page.goto('https://playwright.dev/');
  await page.waitForSelector('header');

  // Extract menu items (links and buttons in header)
  const items = await page.$$eval('header a, header button', els =>
    Array.from(els)
      .map(e => e.textContent?.trim())
      .filter(Boolean)
  );

  // Print to console (test runner will capture this)
  console.log('Menu items:', items);

  // Assertion: ensure we found at least one menu item
  expect(items.length).toBeGreaterThan(0);
});
