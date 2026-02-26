/**
 * AUTHZ ROLE-BASED E2E TESTS (Phase 9)
 *
 * Tests role-based access control from the browser perspective.
 * Verifies that protected routes redirect unauthenticated users
 * and that the authz matrix is enforced at the HTTP level.
 *
 * Role login helpers use the dev helper endpoint to set a session cookie.
 * These tests run against localhost:3001 by default, or PLAYWRIGHT_TEST_BASE_URL.
 */

import { test, expect, type Page } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://localhost:3001";

// ─── Cookie session helper ─────────────────────────────────────────────────

/**
 * Sets a synthetic session cookie to simulate a logged-in user with the given role.
 * Uses the same cookie name and format as src/lib/auth.ts.
 */
async function setSessionCookie(page: Page, role: string, email: string) {
  const expiresAt = Date.now() + 86_400_000;
  const session = JSON.stringify({ email, role, expiresAt });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ cookieValue, domain }) => {
      document.cookie = `app_session=${encodeURIComponent(cookieValue)}; path=/; domain=${domain}`;
    },
    { cookieValue: session, domain: new URL(BASE).hostname }
  );
}

async function clearSession(page: Page) {
  await page.evaluate(() => {
    document.cookie = "app_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    document.cookie = "app_admin=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UNAUTHENTICATED ROUTE GUARDS
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Unauthenticated route guards", () => {
  test("/dashboard redirects unauthenticated user to /access", async ({ page }) => {
    await clearSession(page);
    await page.goto(BASE + "/dashboard");
    await page.waitForURL(/\/access|\/$/);
    const finalPath = new URL(page.url()).pathname;
    expect(["/access", "/"]).toContain(finalPath);
  });

  test("/admin redirects unauthenticated user away", async ({ page }) => {
    await clearSession(page);
    await page.goto(BASE + "/admin");
    await page.waitForURL(/\/access|\/$/);
    const finalPath = new URL(page.url()).pathname;
    expect(["/access", "/"]).toContain(finalPath);
  });

  test("/provider redirects unauthenticated user away", async ({ page }) => {
    await clearSession(page);
    await page.goto(BASE + "/provider");
    await page.waitForURL(/\/access|\/$/);
    const finalPath = new URL(page.url()).pathname;
    expect(["/access", "/"]).toContain(finalPath);
  });

  test("/pharmacy redirects unauthenticated user away", async ({ page }) => {
    await clearSession(page);
    await page.goto(BASE + "/pharmacy");
    await page.waitForURL(/\/access|\/$/);
    const finalPath = new URL(page.url()).pathname;
    expect(["/access", "/"]).toContain(finalPath);
  });

  test("/ is publicly accessible", async ({ page }) => {
    await clearSession(page);
    const response = await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    expect(response!.status()).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT ROLE — CAPABILITY ENFORCEMENT
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Patient role access enforcement", () => {
  test.beforeEach(async ({ page }) => {
    await setSessionCookie(page, "patient", "patient@test.scriptsxo.com");
  });

  test("patient can access /dashboard", async ({ page }) => {
    await page.goto(BASE + "/dashboard");
    await page.waitForLoadState("domcontentloaded");
    // Should not be redirected to /access
    expect(new URL(page.url()).pathname).not.toBe("/access");
  });

  test("patient is denied /admin (redirected away)", async ({ page }) => {
    await page.goto(BASE + "/admin");
    await page.waitForURL(/\/dashboard|\/$/);
    const finalPath = new URL(page.url()).pathname;
    expect(finalPath).not.toBe("/admin");
    expect(finalPath).not.toMatch(/^\/admin\//);
  });

  test("patient is denied /provider (redirected away)", async ({ page }) => {
    await page.goto(BASE + "/provider");
    await page.waitForURL(/\/dashboard|\/$/);
    const finalPath = new URL(page.url()).pathname;
    expect(finalPath).not.toBe("/provider");
  });

  test("patient is denied /pharmacy (redirected away)", async ({ page }) => {
    await page.goto(BASE + "/pharmacy");
    await page.waitForURL(/\/dashboard|\/$/);
    const finalPath = new URL(page.url()).pathname;
    expect(finalPath).not.toBe("/pharmacy");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHARMACY ROLE — CAPABILITY ENFORCEMENT
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Pharmacy role access enforcement", () => {
  test.beforeEach(async ({ page }) => {
    await setSessionCookie(page, "pharmacy", "pharmacy@test.scriptsxo.com");
  });

  test("pharmacy can access /pharmacy", async ({ page }) => {
    await page.goto(BASE + "/pharmacy");
    await page.waitForLoadState("domcontentloaded");
    expect(new URL(page.url()).pathname).not.toBe("/access");
  });

  test("pharmacy is denied /admin (redirected away)", async ({ page }) => {
    await page.goto(BASE + "/admin");
    await page.waitForURL(/\/dashboard|\/$/);
    const finalPath = new URL(page.url()).pathname;
    expect(finalPath).not.toMatch(/^\/admin/);
  });

  test("pharmacy is denied /provider portal (redirected away)", async ({ page }) => {
    await page.goto(BASE + "/provider");
    await page.waitForURL(/\/dashboard|\/$/);
    const finalPath = new URL(page.url()).pathname;
    expect(finalPath).not.toMatch(/^\/provider/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-ROLE CONTENT ISOLATION
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Cross-role content isolation", () => {
  test("patient dashboard does not show admin controls", async ({ page }) => {
    await setSessionCookie(page, "patient", "patient@test.scriptsxo.com");
    await page.goto(BASE + "/dashboard");
    await page.waitForLoadState("domcontentloaded");
    const body = await page.evaluate(() => document.body.innerText ?? "");

    // Admin-only controls should not appear on patient dashboard
    const ADMIN_INDICATORS = ["Manage Users", "Admin Panel", "System Settings", "Audit Log"];
    for (const indicator of ADMIN_INDICATORS) {
      expect(body, `Admin-only content "${indicator}" visible to patient`).not.toContain(indicator);
    }
  });

  test("pharmacy portal does not expose provider prescription-writing tools", async ({ page }) => {
    await setSessionCookie(page, "pharmacy", "pharmacy@test.scriptsxo.com");
    await page.goto(BASE + "/pharmacy");
    await page.waitForLoadState("domcontentloaded");
    const body = await page.evaluate(() => document.body.innerText ?? "");

    const PROVIDER_ONLY = ["Write Prescription", "Sign Prescription", "Prescribe"];
    for (const indicator of PROVIDER_ONLY) {
      expect(body, `Provider-only content "${indicator}" visible to pharmacy`).not.toContain(indicator);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH ROUTE REDIRECT (already-authenticated users)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Auth route redirect for authenticated users", () => {
  test("authenticated patient visiting /access is redirected away", async ({ page }) => {
    await setSessionCookie(page, "patient", "patient@test.scriptsxo.com");
    await page.goto(BASE + "/access");
    await page.waitForURL(/\/portal|\/dashboard|\//);
    const finalPath = new URL(page.url()).pathname;
    expect(finalPath).not.toBe("/access");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY HEADERS (from within browser context)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Security headers via browser requests", () => {
  test("CSP frame-ancestors prevents iframe embedding", async ({ page }) => {
    const response = await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    const headers = response!.headers();
    const csp = headers["content-security-policy"] ?? "";
    expect(csp).toContain("frame-ancestors 'none'");
  });

  test("X-Frame-Options is set", async ({ page }) => {
    const response = await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    const headers = response!.headers();
    expect(headers["x-frame-options"]).toMatch(/DENY|SAMEORIGIN/i);
  });

  test("X-Content-Type-Options is nosniff", async ({ page }) => {
    const response = await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    const headers = response!.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
  });
});
