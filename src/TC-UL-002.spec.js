// Test Case: TC-UL-002
// Scenario Type: Negative / Validation / Edge
// Coverage Type: Negative / Validation / Edge
// Verifies authentication fails and exact error message "Invalid email or password." is shown.

const { test, expect } = require('@playwright/test');

const variations = [
  {
    name: 'Incorrect password for registered email',
    email: 'registered.user+tc02@example.com',
    password: 'WrongPassword123'
  },
  {
    name: 'Unregistered email with any password',
    email: 'unknown.user+tc02@example.com',
    password: 'AnyPassword!23'
  },
  {
    name: 'Registered email with empty password (if submission allowed)',
    email: 'registered.user+tc02@example.com',
    password: '' // may be blocked by UI
  }
];

test.describe('TC-UL-002 Login fails with invalid credentials and displays exact error message', () => {

  test.beforeEach(async ({ page }) => {
    // TODO: Replace with actual login page URL
    await page.goto('https://example.com/login');
  });

  for (const v of variations) {
    test(`TC-UL-002 - ${v.name}`, async ({ page }) => {
      // Test Steps
      await page.fill('input[name="email"]', v.email);
      await page.fill('input[name="password"]', v.password);

      // Attempt submit. If button is disabled, clicking may be a no-op.
      await Promise.all([
        page.click('button[type="submit"], button:has-text("Login")').catch(() => null),
        page.waitForTimeout(500) // short wait to allow client-side validation to surface
      ]);

      // Assertions: exact error message must be displayed
      const errorLocator = page.locator('text="Invalid email or password."');
      // Wait up to a short timeout for the error to appear
      await expect(errorLocator).toBeVisible({ timeout: 2000 });

      // Strict exact match is enforced by locator text query above (case and punctuation).
    });
  }
});