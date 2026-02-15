import { test, expect } from "@playwright/test";

/**
 * Access Page (Login/Register) E2E Tests
 * ScriptsXO - Telehealth Prescription Fulfillment Platform
 *
 * The /access page is the authentication entry point with a multi-step flow:
 *   1. "email" step - Email input + Continue button
 *   2. "name" step - Registration form (shown after failed auth lookup)
 *   3. "processing" / "routing" - Loading spinners
 *   4. "error" - Error display with retry
 *   5. "unsupported" - Device not supported message
 *
 * IMPORTANT: Headless browsers do not support WebAuthn/platform authenticators.
 * The access page checks for WebAuthn support on mount and shows
 * "Device Not Supported" when biometrics are unavailable. Tests that need
 * the email form must mock WebAuthn APIs via page.addInitScript().
 */

/**
 * Helper: Injects WebAuthn API stubs so the access page renders the
 * email step instead of the "unsupported" fallback.
 */
async function mockWebAuthnSupport(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    // Stub the PublicKeyCredential API so isWebAuthnSupported() returns true
    if (!window.PublicKeyCredential) {
      // @ts-expect-error -- minimal stub for feature detection
      window.PublicKeyCredential = class {
        static isUserVerifyingPlatformAuthenticatorAvailable() {
          return Promise.resolve(true);
        }
        static isConditionalMediationAvailable() {
          return Promise.resolve(true);
        }
      };
    } else {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable =
        () => Promise.resolve(true);
    }
  });
}

test.describe("Access Page - Unsupported Device (Default Headless)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/access");
  });

  test("page renders without errors", async ({ page }) => {
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("shows 'Device Not Supported' heading in headless browser", async ({
    page,
  }) => {
    // Headless Chromium lacks WebAuthn, so the page shows the unsupported state
    const heading = page.locator("h2", { hasText: "Device Not Supported" });
    await expect(heading).toBeVisible();
  });

  test("shows explanation about biometric requirements", async ({ page }) => {
    const explanation = page.getByText(
      "Your device does not support biometric authentication"
    );
    await expect(explanation).toBeVisible();
  });

  test("page title contains ScriptsXO", async ({ page }) => {
    await expect(page).toHaveTitle(/ScriptsXO/);
  });
});

test.describe("Access Page - Email Step (with WebAuthn mocked)", () => {
  test.beforeEach(async ({ page }) => {
    await mockWebAuthnSupport(page);
    await page.goto("/access");
  });

  test("shows 'Welcome' heading with description text", async ({ page }) => {
    const heading = page.locator("h2", { hasText: "Welcome" });
    await expect(heading).toBeVisible();

    const description = page.getByText(
      "Enter your email to sign in or create an account."
    );
    await expect(description).toBeVisible();
  });

  test("email input field is visible with correct label", async ({ page }) => {
    const label = page.locator("label", { hasText: "Email Address" });
    await expect(label).toBeVisible();

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toBeEnabled();
  });

  test("email input has correct placeholder", async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute("placeholder", "you@example.com");
  });

  test("Continue button is visible and enabled", async ({ page }) => {
    const continueButton = page.locator("button[type='submit']", {
      hasText: "Continue",
    });
    await expect(continueButton).toBeVisible();
    await expect(continueButton).toBeEnabled();
  });

  test("HIPAA and Passkey badges are visible", async ({ page }) => {
    const hipaaBadge = page.getByText("HIPAA", { exact: false });
    await expect(hipaaBadge.first()).toBeVisible();

    const passkeyBadge = page.getByText("Passkey", { exact: false });
    await expect(passkeyBadge.first()).toBeVisible();
  });

  test("email input accepts text entry", async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill("test@example.com");
    await expect(emailInput).toHaveValue("test@example.com");
  });

  test("email input is marked as required", async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute("required", "");
  });

  test("email input has correct autocomplete attribute", async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute(
      "autocomplete",
      "email webauthn"
    );
  });
});

test.describe("Access Page - Desktop Layout", () => {
  test("shows left branding panel on desktop viewport", async ({ page }) => {
    await page.goto("/access");

    // The left panel has the editorial branding with the tagline
    const tagline = page.getByText("Your prescriptions,");
    await expect(tagline).toBeVisible();

    const effortlessly = page.getByText("effortlessly");
    await expect(effortlessly).toBeVisible();

    const managed = page.getByText("managed.");
    await expect(managed).toBeVisible();
  });

  test("shows concierge description on desktop", async ({ page }) => {
    await page.goto("/access");

    const description = page.getByText(
      "A private concierge experience for telehealth consultations"
    );
    await expect(description).toBeVisible();
  });

  test("shows trust indicators on desktop panel", async ({ page }) => {
    await page.goto("/access");

    const hipaaSecure = page.getByText("HIPAA Secure");
    await expect(hipaaSecure).toBeVisible();

    const boardCertified = page.getByText("Board Certified");
    await expect(boardCertified).toBeVisible();

    const encrypted = page.getByText("Encrypted");
    await expect(encrypted).toBeVisible();
  });

  test("brand name link appears on desktop panel", async ({ page }) => {
    await page.goto("/access");

    const brandLinks = page.locator("a", { hasText: "ScriptsXO" });
    await expect(brandLinks.first()).toBeVisible();
  });
});

test.describe("Access Page - Mobile Layout", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("hides left branding panel on mobile", async ({ page }) => {
    await page.goto("/access");

    const tagline = page.getByText("Your prescriptions,");
    await expect(tagline).toBeHidden();
  });

  test("shows mobile brand logo on small screens", async ({ page }) => {
    await page.goto("/access");

    const mobileBrand = page.locator(".lg\\:hidden a", {
      hasText: "ScriptsXO",
    });
    await expect(mobileBrand).toBeVisible();
  });

  test("email form is visible on mobile (with WebAuthn mocked)", async ({
    page,
  }) => {
    await mockWebAuthnSupport(page);
    await page.goto("/access");

    const heading = page.locator("h2", { hasText: "Welcome" });
    await expect(heading).toBeVisible();

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    const continueButton = page.locator("button[type='submit']", {
      hasText: "Continue",
    });
    await expect(continueButton).toBeVisible();
  });

  test("trust indicators (HIPAA Secure, Board Certified) are hidden on mobile", async ({
    page,
  }) => {
    await page.goto("/access");

    const hipaaSecure = page.getByText("HIPAA Secure");
    await expect(hipaaSecure).toBeHidden();
  });
});
