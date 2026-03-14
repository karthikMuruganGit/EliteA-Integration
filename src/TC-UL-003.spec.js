// Test Case: TC-UL-003
// Scenario Type: Validation / Boundary / Negative / Edge
// Coverage Type: Validation / Boundary / Negative / Edge
// Verifies Login button state behavior with empty/partial/whitespace inputs and that no auth request is sent when disabled.

const { test, expect } = require('@playwright/test');

const variations = [
  { name: 'Both fields empty', email: '', password: '', expectDisabled: true },
  { name: 'Only Email populated', email: 'user.onlyemail+tc03@example.com', password: '', expectDisabled: true },
  { name: 'Only Password populated', email: '', password: 'SomePassword!23', expectDisabled: true },
  { name: 'Both fields populated', email: 'user.both+tc03@example.com', password: 'SomePassword!23', expectDisabled: false },
  { name: 'Whitespace-only inputs', email: '   ', password: '   ', expectDisabled: 'observe' } // observe behavior
];

test.describe('TC-UL-003 Login button disabled/enabled behavior and submission prevention', () => {

  test.beforeEach(async ({ page }) => {
    // TODO: Replace with actual login page URL
    await page.goto('https://example.com/login');
  });

  for (const v of variations) {
    test(`TC-UL-003 - ${v.name}`, async ({ page }) => {
      // Track outgoing POST requests to detect authentication requests
      let postRequestCount = 0;
      page.on('request', req => {
        if (req.method() === 'POST') {
          postRequestCount++;
        }
      });

      // Fill inputs as per scenario
      await page.fill('input to start the processes and return {Message} as output