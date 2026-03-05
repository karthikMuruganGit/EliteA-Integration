import { test, expect } from '@playwright/test';

// Test: Navigate to https://elitea.ai/doc and print menu items
test('Print menu items on /doc', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('https://elitea.ai/doc', { waitUntil: 'networkidle' });
  // Wait a moment for potential dynamic content
  await page.waitForLoadState('domcontentloaded');
  const items = await page.evaluate(() => {
    const sel = 'nav a, header nav a, .menu a, .navbar a, [role="navigation"] a';
    const nodes = Array.from(document.querySelectorAll(sel));
    const candidates = nodes.length ? nodes : Array.from(document.querySelectorAll('header a, a[href^="/"], a[href^="#"]'));
    return candidates.map(n => ({ text: (n.textContent || '').trim(), href: (n.href || '') })).filter(i => i.text);
  });
  console.log('Menu items:', items);
  expect(items.length).toBeGreaterThan(0);
});
