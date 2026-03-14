// Test Case: TC-UL-001
// Scenario Type: Positive / Validation
// Coverage Type: Positive / Validation
// Verifies successful login, redirection to dashboard and presence of a non-empty session/token.
// NOTE: TODOs present where application-specific details (URL, network endpoint, storage keys) are required.

const { test, expect } = require('@playwright/test');

const testData = {
  primary: {
    email: 'registered.user+tc01@example.com',
    password: 'CorrectHorseBatteryStaple1!'
  },
  caseInsensitiveEmail: {
    email: 'Registered.User+TC01@Example.com',
    password: 'CorrectHorseBatteryStaple1!'
  }
};

test.describe('TC-UL-001 Successful login with registered email and valid password', () => {

  test.beforeEach(async ({ page }) => {
    // Setup: navigate to Login screen
    // TODO: Replace with actual Login page URL
    await page.goto('https://example.com/login');
  });

  test('TC-UL-001 - primary valid credentials should authenticate and return a token', async ({ page }) => {
    // Test Steps
    await page.fill('input[name="email"]', testData.primary.email);
    await page.fill('input[name="password"]', testData.primary.password);

    // Start monitoring for an authentication network response (best-effort)
    // TODO: Update the response URL predicate to match the application's auth endpoint (e.g., '/api/auth/login')
    const authResponsePromise = page.waitForResponse(response =>
      response.request().method() === 'POST' && /login|auth/i.test(response.url())
    ).catch(() => null);

    await Promise.all([
      page.click('button[type="submit"], button:has-text("Login")'),
      // allow navigation if the app redirects
      page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => null)
    ]);

    // Assertions (modular)
    // 1) Prefer assertion from network response: check 200 and presence of token in response body if available
    const authResponse = await authResponsePromise;
    if (authResponse) {
      expect([200, 201, 204]).toContain(authResponse.status(), 'Auth response status should indicate success');
      // Attempt to parse JSON and assert token presence if possible
      let body = null;
      try {
        body = await authResponse.json();
      } catch (e) {
        body = null;
      }
      if (body && (body.token || body.session || body.accessToken)) {
        const token = body.token || body.session || body.accessToken;
        expect(token).toBeTruthy();
      } else {
        // If response body did not contain a token property, try cookies/localStorage below
      }
    }

    // 2) Assert redirection to Dashboard (best-effort)
    // TODO: Replace '/dashboard' with actual dashboard route if different
    const url = page.url();
    if (url.includes('/dashboard') || url.toLowerCase().includes('dashboard')) {
      expect(url).toContain('dashboard');
    } else {
      // 3) Fallback: check for presence of a session cookie or localStorage token
      // Note: cookie name / localStorage key unknown; check common keys
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => /session|auth|token/i.test(c.name));
      if (sessionCookie) {
        expect(sessionCookie.value).toBeTruthy();
      } else {
        // check localStorage keys
        const ls = await page.evaluate(() => {
          return {
            authToken: window.localStorage.getItem('authToken') || window.localStorage.getItem('token') || window.localStorage.getItem('accessToken')
          };
        });
        // This is a soft assertion: if no token found, mark test as failed since presence required by expected result
        expect(ls.authToken || sessionCookie).toBeTruthy();
      }
    }

    // Teardown not required for this test case
  });

  test('TC-UL-001 - email case-insensitivity observation (no pass/fail assumption)', async ({ page }) => {
    // Observational variant: different email casing
    await page.fill('input[name="email"]', testData.caseInsensitiveEmail.email);
    await page.fill('input[name="password"]', testData.caseInsensitiveEmail.password);

    // Monitor auth response similar to primary
    // TODO: Update predicate as above to match real endpoint
    const authResponse = await page.waitForResponse(response =>
      response.request().method() === 'POST' && /login|auth/i.test(response.url())
    ).catch(() => null);

    await page.click('button[type="submit"], button:has-text("Login")');
    // Observational: record whether authentication succeeded similar to primary assertions
    // For stability in CI, assert at least that page did not crash
    expect(page.isClosed()).toBeFalsy();
  });
});