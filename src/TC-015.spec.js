// TC-015
// Title: Authentication with varied email inputs: case variations, extremely long input, control characters, and international/unicode characters
// Scenario Type: Edge / Validation
// Coverage Type: Data-driven (Subcases A-D variants)
// Notes: Uses network observation to detect request/response and cookies/localStorage. Token artifact names/formats unspecified -> TODO Pending Clarification.

const { test, expect } = require('@playwright/test');

test.describe('TC-015 - Email variation and edge inputs for authentication', () => {
  const emailSelector = 'input[name="email"]';
  const passwordSelector = 'input[name="password"]';
  const loginButtonSelector = 'button[type="submit"], button#login, button[name="login"]';
  const dashboardPathFragment = '/dashboard';

  // Data-driven scenarios per TEST DATA
  const scenarios = [
    // Subcase A - Case variation (server may be case-insensitive -> success OR case-sensitive -> generic failure)
    {
      id: 'TC-015-A',
      name: 'Subcase A - Case variation (User@Domain.com)',
      email: 'User@Domain.com',
      password: 'P@ssw0rd!',
      expectEither: true, // Accept either success-with-token or generic failure
      precondition: { email: 'user@domain.com', password: 'P@ssw0rd!' }
    },

    // Subcase B - Extremely long email (client-side blocked)
    {
      id: 'TC-015-B1',
      name: 'Subcase B - Extremely long email (client-side blocked)',
      email: 'a'.repeat(4990) + '@d.co',
      password: 'ValidPass1!',
      expectClientBlocked: true
    },

    // Subcase B - Extremely long email (server-side rejection)
    {
      id: 'TC-015-B2',
      name: 'Subcase B - Extremely long email (server-side rejection)',
      email: 'a'.repeat(4990) + '@domain.com',
      password: 'ValidPass1!',
      expectServerHandled: true
    },

    // Subcase B - Edge with plus addressing
    {
      id: 'TC-015-B3',
      name: 'Subcase B - Extremely long local-part with plus addressing',
      email: 'long+' + 'b'.repeat(4970) + '@x.co',
      password: 'ValidPass1!',
      expectServerHandled: true
    },

    // Subcase C - Embedded NUL
    {
      id: 'TC-015-C1',
      name: 'Subcase C - Non-printable embedded NUL',
      email: 'user\u0000@domain.com',
      password: 'AnyPass1!',
      expectServerHandled: true
    },

    // Subcase C - Embedded tab/newline
    {
      id: 'TC-015-C2',
      name: 'Subcase C - Non-printable embedded tab',
      email: 'user\tname@domain.com',
      password: 'AnyPass1!',
      expectServerHandled: true
    },

    // Subcase C - Leading/trailing control chars
    {
      id: 'TC-015-C3',
      name: 'Subcase C - Leading BEL control char',
      email: '\u0007user@domain.com',
      password: 'AnyPass1!',
      expectServerHandled: true
    },

    // Subcase D - International/unicode (registered account success)
    {
      id: 'TC-015-D1',
      name: 'Subcase D - Unicode registered account (usêr@domain.com)',
      email: 'usêr@domain.com',
      password: 'IntlPass1!',
      expectEither: true,
      precondition: { email: 'usêr@domain.com', password: 'IntlPass1!' }
    },

    // Subcase D - IDN / punycode (may be unsupported)
    {
      id: 'TC-015-D2',
      name: 'Subcase D - IDN form (user@пример.рф)',
      email: 'user@пример.рф',
      password: 'AnyPass1!',
      expectServerHandled: true
    },

    // Subcase D - Unsupported Unicode (negative)
    {
      id: 'TC-015-D3',
      name: 'Subcase D - Unsupported Unicode (ユーザー@例え.テスト)',
      email: 'ユーザー@例え.テスト',
      password: 'AnyPass1!',
      expectServerHandled: true
    },
  ];

  test.beforeEach(async ({ page }) => {
    // Setup: navigate to login
    await page.goto('/login');
    await expect(page.locator(emailSelector)).toBeVisible();
    await expect(page.locator(passwordSelector)).toBeVisible();
    await expect(page.locator(loginButtonSelector)).toBeVisible();
  });

  for (const s of scenarios) {
    test(s.name, async ({ page, context }) => {
      // Clear fields
      await page.fill(emailSelector, '');
      await page.fill(passwordSelector, '');

      // Monitor POST requests and responses for authentication attempts
      let postRequestSeen = false;
      let authResponse = null;
      const postRequests = [];
      page.on('request', (req) => {
        try {
          if (req.method().toUpperCase() === 'POST') postRequests.push(req);
        } catch (e) {}
      });
      page.on('response', (resp) => {
        try {
          const req = resp.request();
          if (req.method().toUpperCase() === 'POST') {
            postRequestSeen = true;
            authResponse = resp;
          }
        } catch (e) {}
      });

      // Fill and attempt action
      await page.fill(emailSelector, s.email);
      await page.fill(passwordSelector, s.password);

      // If expecting client-side blocked submission, check button state before click
      const loginButton = page.locator(loginButtonSelector).first();
      const isDisabledBefore = await loginButton.isDisabled().catch(() => false);

      // Try click (some scenarios expect click attempt)
      await Promise.all([
        page.click(loginButtonSelector).catch(() => {}),
        // navigation may or may not happen
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 3000 }).catch(() => {})
      ]);

      // Assertions

      // 1) If test expects client-side block and button was disabled -> ensure no POST sent
      if (s.expectClientBlocked) {
        if (!isDisabledBefore) {
          // if button was enabled but specification expected client block, we still observe network
        }
        // Assert no POST was made (allow small delay for requests)
        await page.waitForTimeout(500);
        if (postRequests.length > 0) {
          throw new Error(`${s.id}: Expected client-side block but POST request(s) observed.`);
        } else {
          // Verify a visible client-side validation message exists (generic check)
          const bodyText = (await page.textContent('body')) || '';
          expect(bodyText.toLowerCase()).toMatch(/(too long|invalid|please enter a valid email|email.*length)/i);
          return;
        }
      }

      // 2) If a POST was sent, inspect response and client artifacts
      await page.waitForTimeout(300); // allow network handlers to capture
      if (!postRequestSeen) {
        // No POST observed. This could be because client blocked, or the form used GET or JS handled differently.
        // Treat as client blocked or no request. Ensure no cookie/token created.
        const cookies = await context.cookies();
        // Check for presence of any likely session cookie (generic check)
        const hasSessionCookie = cookies.some(c => /session|auth|token/i.test(c.name));
        if (hasSessionCookie) {
          throw new Error(`${s.id}: No POST observed but session cookie present (unexpected).`);
        }
        // Attempt to find generic validation message
        const bodyText = (await page.textContent('body')) || '';
        expect(bodyText.toLowerCase()).toMatch(/(invalid|error|please)/i);
        return;
      }

      // If POST observed, analyze authResponse, cookies, and page state
      const cookiesAfter = await context.cookies();
      const hasSessionCookie = cookiesAfter.some(c => /session|auth|token/i.test(c.name));

      // Read response body safely
      let respBodyText = '';
      try {
        respBodyText = await authResponse.text();
      } catch (e) {
        respBodyText = '';
      }
      const respHeaders = authResponse.headers();

      // Subcase A and D allow either success or generic failure.
      if (s.expectEither) {
        // Condition: success => redirect to dashboard OR session cookie present
        const currentUrl = page.url();
        const redirectedToDashboard = currentUrl.includes(dashboardPathFragment);
        const genericErrorVisible = ((await page.textContent('body')) || '').includes('Invalid email or password.');

        // Determine success indicator
        if (redirectedToDashboard || hasSessionCookie) {
          // Success path: ensure no sensitive token in URL
          expect(currentUrl).not.toMatch(/token=|auth=|session=/i);
          // Also check Set-Cookie not present in URL (redundant) and ensure cookie not leaked to URL
          return;
        }

        // Determine safe failure: generic error message visible and no session cookie
        if (genericErrorVisible && !hasSessionCookie) {
          return;
        }

        // If neither observed, fail as ambiguous/unexpected behavior
        throw new Error(`${s.id}: Observed neither allowed success nor allowed safe failure. Response headers: ${JSON.stringify(respHeaders)} Body snippet: ${respBodyText.slice(0,200)}`);
      }

      // For scenarios expecting server-handled failure (B2/B3, C*, D2/D3)
      if (s.expectServerHandled) {
        // Expect no session cookie and either generic error or validation message; also no server stack traces
        if (hasSessionCookie) {
          throw new Error(`${s.id}: Unexpected session cookie set for invalid/edge input.`);
        }
        const bodyText = (await page.textContent('body')) || '';
        const genericError = bodyText.includes('Invalid email or password.') || /invalid|error|validation/i.test(bodyText);
        // Also ensure response body doesn't contain stacktrace keywords
        const respLower = respBodyText.toLowerCase();
        const stacktracePresent = /exception|stack trace|at\s+Object|Traceback|<pre>/i.test(respLower);

        expect(genericError).toBeTruthy();
        expect(stacktracePresent).toBeFalsy();
        return;
      }

      // Default: if no explicit expectation flag, fail the test to signal missing assertion mapping
      throw new Error(`${s.id}: No assertion path matched. Scenario data may be incomplete.`);
    });
  }

  test.afterEach(async ({ page, context }) => {
    // Teardown: clear cookies and localStorage to leave environment clean
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      // Do not expose any sensitive data in logs
    });
  });
});
