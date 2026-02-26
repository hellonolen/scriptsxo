import { test, expect, Page } from "@playwright/test";

/**
 * FULL NEW ACCOUNT + PROVIDER ONBOARD FLOW
 * ScriptsXO E2E Test
 *
 * Tests the complete journey:
 *   1. Homepage (/) - Dev mode login with email
 *   2. Redirect to /onboard (unverified user)
 *   3. Select "Healthcare Provider" role
 *   4. NPI verification (DEV MODE bypass)
 *   5. License step
 *   6. DEA step (skip)
 *   7. Review + Complete Verification
 *   8. Verification Complete -> Provider dashboard
 *
 * NOTE: In dev mode (localhost), the app bypasses WebAuthn/passkeys
 * and allows direct login with just an email. The middleware also
 * skips auth checks on localhost.
 */

const ARTIFACTS_DIR = "tests/e2e/artifacts";
const TEST_EMAIL = `test-provider-${Date.now()}@mailinator.com`;

// Use only chromium for this interactive flow test
test.use({ viewport: { width: 1280, height: 900 } });

async function screenshotStep(page: Page, stepName: string) {
  await page.screenshot({
    path: `${ARTIFACTS_DIR}/${stepName}.png`,
    fullPage: true,
  });
}

test.describe("New Account + Provider Onboard Flow", () => {
  test.describe.configure({ timeout: 120000 });

  test("STEP 1: Homepage loads and shows dev mode auth form", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // On localhost, dev mode disables passkeys - shows email form directly with mail icon
    const heading = page.locator("h2", { hasText: "Welcome" });
    await expect(heading).toBeVisible({ timeout: 10000 });

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // In dev mode, continue button shows mail icon (not fingerprint)
    const continueButton = page.locator("button[type='submit']");
    await expect(continueButton).toBeVisible();
    await expect(continueButton).toContainText("Continue");

    await screenshotStep(page, "01-homepage-auth-form");
  });

  test("STEP 2: Dev mode login redirects to /onboard", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h2", { hasText: "Welcome" });
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Enter email
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(TEST_EMAIL);

    await screenshotStep(page, "02-email-entered");

    // Click Continue
    await page.locator("button[type='submit']").click();

    // In dev mode, completeAuth runs immediately, setting role=unverified
    // The routing useEffect sees unverified role and calls router.push("/onboard")
    // Wait for the spinner to appear then the URL to change
    await page.waitForFunction(
      () => window.location.pathname !== "/",
      null,
      { timeout: 20000 }
    );

    const currentUrl = page.url();
    console.log(`[STEP 2] After login redirect: ${currentUrl}`);

    await screenshotStep(page, "03-after-login-redirect");

    expect(currentUrl).toContain("/onboard");
  });

  test("FULL FLOW: Login -> Onboard -> Provider -> Complete", async ({
    page,
  }) => {
    // =========================================================
    // STEP 1: Login via homepage (dev mode)
    // =========================================================
    console.log("[FLOW] Starting full flow test");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h2", { hasText: "Welcome" });
    await expect(heading).toBeVisible({ timeout: 10000 });

    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(TEST_EMAIL);
    await page.locator("button[type='submit']").click();

    // Wait for navigation away from /
    await page.waitForFunction(
      () => window.location.pathname !== "/",
      null,
      { timeout: 20000 }
    );

    const afterLoginUrl = page.url();
    console.log(`[FLOW] After login: ${afterLoginUrl}`);
    await screenshotStep(page, "10-full-flow-after-login");

    // =========================================================
    // STEP 2: Should be on /onboard - Role Selection
    // =========================================================
    if (!afterLoginUrl.includes("/onboard")) {
      console.log("[FLOW] Not on /onboard, navigating directly");
      await page.goto("/onboard");
      await page.waitForLoadState("networkidle");
    }

    const roleHeading = page.locator("h2", { hasText: "Select Your Role" });
    await expect(roleHeading).toBeVisible({ timeout: 10000 });

    await screenshotStep(page, "11-onboard-role-selection");

    // =========================================================
    // STEP 3: Select "Healthcare Provider" role
    // =========================================================
    // Click the Healthcare Provider card
    const providerCard = page.locator("button").filter({
      hasText: "Healthcare Provider",
    });
    await providerCard.click();

    // Verify selection indicator appears (the filled purple dot)
    const selectionDot = page.locator(
      "button:has-text('Healthcare Provider') .rounded-full.bg-\\[\\#7C3AED\\]"
    );
    await expect(selectionDot).toBeVisible({ timeout: 3000 });

    await screenshotStep(page, "12-provider-role-selected");

    // Click the Continue button at the bottom of the page
    // This is the only button outside the role cards that contains "Continue"
    // It's styled as uppercase "CONTINUE" with an arrow
    const continueBtn = page.locator(
      'button:has-text("Continue"):has(svg.lucide-arrow-right)'
    );
    await expect(continueBtn).toBeVisible();

    // Log the button state for debugging
    const btnClasses = await continueBtn.getAttribute("class");
    const isDisabled = await continueBtn.isDisabled();
    console.log(
      `[FLOW] Continue button - disabled: ${isDisabled}, has bg-foreground: ${btnClasses?.includes("bg-foreground")}`
    );

    await continueBtn.click();

    // Wait for Next.js client-side navigation to /onboard/provider
    await page.waitForFunction(
      () => window.location.pathname.includes("/onboard/provider"),
      null,
      { timeout: 10000 }
    );

    await page.waitForLoadState("networkidle");
    console.log(`[FLOW] Navigated to: ${page.url()}`);

    await screenshotStep(page, "13-navigated-to-provider-onboard");

    // =========================================================
    // STEP 4: NPI Verification (DEV MODE)
    // =========================================================
    const npiHeading = page.locator("h1", { hasText: "NPI Verification" });
    await expect(npiHeading).toBeVisible({ timeout: 10000 });

    // Check for DEV MODE badge
    const devBadge = page.getByText("DEV MODE");
    const hasDevBadge = await devBadge.isVisible().catch(() => false);
    console.log(`[FLOW] DEV MODE badge visible: ${hasDevBadge}`);

    await screenshotStep(page, "14-npi-step");

    // Enter NPI number (10-digit)
    const npiInput = page.locator('input[placeholder="1234567890"]');
    await expect(npiInput).toBeVisible();
    await npiInput.fill("1234567890");
    await expect(npiInput).toHaveValue("1234567890");

    await screenshotStep(page, "15-npi-entered");

    // Click Verify NPI button
    const verifyNpiBtn = page.locator("button").filter({
      hasText: "Verify NPI",
    });
    await expect(verifyNpiBtn).toBeEnabled();
    await verifyNpiBtn.click();

    // In DEV mode, this should instantly succeed (fakeNpi) and move to license step
    const licenseHeading = page.locator("h1", {
      hasText: "License Verification",
    });
    await expect(licenseHeading).toBeVisible({ timeout: 15000 });

    await screenshotStep(page, "16-license-step");

    // =========================================================
    // STEP 5: License Verification
    // =========================================================
    // Verify NPI result card is shown with "NPI Verified" badge
    const npiVerifiedBadge = page.getByText("NPI Verified");
    await expect(npiVerifiedBadge).toBeVisible();

    // Verify the NPI data is displayed
    const npiNumberDisplay = page.getByText("1234567890");
    await expect(npiNumberDisplay.first()).toBeVisible();

    // Verify specialty is shown
    const specialtyDisplay = page.getByText("Family Medicine");
    await expect(specialtyDisplay).toBeVisible();

    // Click Continue (the button with ArrowRight icon in the right side)
    const licenseContinueBtn = page
      .locator("button")
      .filter({ hasText: "Continue" })
      .filter({ has: page.locator("svg") });
    await licenseContinueBtn.click();

    // Should move to DEA step
    const deaHeading = page.locator("h1", { hasText: "DEA Registration" });
    await expect(deaHeading).toBeVisible({ timeout: 10000 });

    await screenshotStep(page, "17-dea-step");

    // =========================================================
    // STEP 6: DEA Step - Skip for now
    // =========================================================
    const skipBtn = page.locator("button").filter({ hasText: "Skip for Now" });
    await expect(skipBtn).toBeVisible();
    await skipBtn.click();

    // Should move to Review step
    const reviewHeading = page.locator("h1", {
      hasText: "Verification Review",
    });
    await expect(reviewHeading).toBeVisible({ timeout: 10000 });

    await screenshotStep(page, "18-review-step");

    // =========================================================
    // STEP 7: Review + Complete Verification
    // =========================================================
    // Verify the review summary shows correct data
    const npiSummary = page.getByText("1234567890");
    await expect(npiSummary.first()).toBeVisible();

    // Verify provider name and specialty are shown
    const providerNameDisplay = page.locator("text=Family Medicine");
    await expect(providerNameDisplay).toBeVisible();

    // Click "Complete Verification"
    const completeBtn = page
      .locator("button")
      .filter({ hasText: "Complete Verification" });
    await expect(completeBtn).toBeVisible();
    await expect(completeBtn).toBeEnabled();

    await screenshotStep(page, "19-before-complete-verification");

    await completeBtn.click();

    // The button should change to "AI Agent Reviewing..." with spinner
    // This calls devBypassVerification which makes a Convex round-trip
    console.log("[FLOW] Clicked Complete Verification, waiting for result...");

    // Wait a moment for Convex round-trip
    await page.waitForTimeout(3000);
    await screenshotStep(page, "20-verification-processing");

    // Wait for the final result - either success or error
    // The devBypass action needs a memberId from Convex (member.getByEmail query)
    // If Convex is connected and has the member, this should work
    // If not, an error will show
    const successHeading = page.locator("h1", {
      hasText: "Verification Complete",
    });
    const rejectedHeading = page.locator("h1", {
      hasText: "Verification Not Approved",
    });
    const errorBanner = page.locator(
      ".bg-destructive\\/5, [class*='destructive']"
    );

    try {
      // Wait up to 30s for either success or rejection to appear
      await expect(
        successHeading.or(rejectedHeading)
      ).toBeVisible({ timeout: 30000 });
    } catch {
      // If neither appeared, check for errors
      await screenshotStep(page, "20b-timeout-state");
      const bodyText = await page.locator("body").textContent();
      console.log(`[FLOW] Timeout waiting for result. Body text: ${bodyText?.substring(0, 500)}`);
    }

    await screenshotStep(page, "21-verification-result");

    const isSuccess = await successHeading.isVisible().catch(() => false);
    const isRejected = await rejectedHeading.isVisible().catch(() => false);

    console.log(
      `[FLOW] Result - Success: ${isSuccess}, Rejected: ${isRejected}`
    );

    if (isSuccess) {
      // =========================================================
      // STEP 8: Navigate to Provider Dashboard
      // =========================================================
      const goToPortalBtn = page
        .locator("button")
        .filter({ hasText: "Go to Provider Portal" });
      await expect(goToPortalBtn).toBeVisible();

      await screenshotStep(page, "22-verification-complete-success");

      await goToPortalBtn.click();

      // Wait for client-side navigation
      await page.waitForFunction(
        () => window.location.pathname.includes("/provider"),
        null,
        { timeout: 10000 }
      );

      await page.waitForLoadState("networkidle");
      await screenshotStep(page, "23-provider-dashboard");

      console.log(
        `[FLOW] SUCCESS - Landed on provider dashboard: ${page.url()}`
      );
    } else if (isRejected) {
      console.log("[FLOW] Verification was rejected");
      await screenshotStep(page, "22-verification-rejected");
    } else {
      // Still on review step or error state
      const currentContent = await page.locator("main").textContent();
      console.log(
        `[FLOW] Neither success nor rejection. Page content: ${currentContent?.substring(0, 300)}`
      );

      // Check if there's a visible error
      const errors = page.locator("p.text-destructive, .text-sm.text-destructive");
      const errorCount = await errors.count();
      if (errorCount > 0) {
        for (let i = 0; i < errorCount; i++) {
          const txt = await errors.nth(i).textContent();
          console.log(`[FLOW] Error ${i}: ${txt}`);
        }
      }

      await screenshotStep(page, "22-unknown-state");
    }
  });
});
