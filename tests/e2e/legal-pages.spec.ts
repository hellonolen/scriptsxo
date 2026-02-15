import { test, expect } from "@playwright/test";

/**
 * Legal Pages E2E Tests
 * ScriptsXO - Telehealth Prescription Fulfillment Platform
 *
 * SITECONFIG defines legal page URLs:
 *   - /privacy  (privacyUrl)
 *   - /terms    (termsUrl)
 *   - /hipaa    (hipaaUrl)
 *
 * However, as of the current codebase state, NO page files exist for these
 * routes under src/app/. The tests below verify the expected 404 behavior
 * for missing legal pages, which documents the gap and will automatically
 * start passing for content checks once the pages are created.
 */

test.describe("Legal Pages - Existence Check", () => {
  test("/privacy returns a page (currently expected to 404)", async ({
    page,
  }) => {
    const response = await page.goto("/privacy");

    // No src/app/privacy/page.tsx exists yet.
    // Next.js will return a 404 page for this route.
    expect(response).not.toBeNull();
    const status = response!.status();

    if (status === 200) {
      // If the page has been created, verify it has meaningful content
      const body = page.locator("body");
      await expect(body).not.toBeEmpty();

      // A proper privacy page should contain the word "privacy" somewhere
      const pageText = await page.textContent("body");
      expect(pageText?.toLowerCase()).toContain("privacy");
    } else {
      // Document that this page is missing (404)
      expect(status).toBe(404);
    }
  });

  test("/terms returns a page (currently expected to 404)", async ({
    page,
  }) => {
    const response = await page.goto("/terms");

    expect(response).not.toBeNull();
    const status = response!.status();

    if (status === 200) {
      const body = page.locator("body");
      await expect(body).not.toBeEmpty();

      const pageText = await page.textContent("body");
      expect(pageText?.toLowerCase()).toContain("terms");
    } else {
      expect(status).toBe(404);
    }
  });

  test("/hipaa returns a page (currently expected to 404)", async ({
    page,
  }) => {
    const response = await page.goto("/hipaa");

    expect(response).not.toBeNull();
    const status = response!.status();

    if (status === 200) {
      const body = page.locator("body");
      await expect(body).not.toBeEmpty();

      const pageText = await page.textContent("body");
      expect(pageText?.toLowerCase()).toContain("hipaa");
    } else {
      expect(status).toBe(404);
    }
  });
});

test.describe("Legal Page Links in SITECONFIG", () => {
  test("access page references HIPAA in trust badges", async ({ page }) => {
    // The access page shows "HIPAA" as a trust badge in the auth form area
    await page.goto("/access");

    const hipaaBadge = page.getByText("HIPAA", { exact: false });
    await expect(hipaaBadge.first()).toBeVisible();
  });

  test("access page left panel shows HIPAA Secure indicator", async ({
    page,
  }) => {
    // Desktop viewport (default 1280x720) shows the left branding panel
    await page.goto("/access");

    const hipaaSecure = page.getByText("HIPAA Secure");
    await expect(hipaaSecure).toBeVisible();
  });
});
