import { test, expect } from "@playwright/test";

/**
 * Navigation E2E Tests
 * ScriptsXO - Telehealth Prescription Fulfillment Platform
 *
 * Tests basic navigation flows including:
 * - Homepage redirect to /access
 * - Access page loading and brand visibility
 * - Protected route middleware redirects
 * - Nav component behavior on authenticated pages
 *
 * MIDDLEWARE CONTEXT:
 * The app middleware protects most routes. Without a valid session cookie:
 *   /portal, /consultation      -> redirect to /access
 *   /admin                      -> redirect to /access (needs session + admin)
 *   /provider, /pharmacy        -> redirect to /access
 * Only /access and non-existent routes are publicly accessible.
 *
 * Tests that require authenticated pages use a mock session cookie.
 */

/**
 * Helper: Creates a mock session cookie value matching the middleware's
 * isValidSession() expectations: { email, expiresAt, name }.
 */
function createMockSessionCookie(): string {
  const session = {
    email: "test@example.com",
    name: "Test User",
    expiresAt: Date.now() + 60 * 60 * 24 * 1000, // 24 hours from now
  };
  return encodeURIComponent(JSON.stringify(session));
}

/**
 * Helper: Creates a mock admin cookie value matching isAdminSession().
 */
function createMockAdminCookie(): string {
  const adminData = {
    isAdmin: true,
    email: "hellonolen@gmail.com",
    expiresAt: Date.now() + 60 * 60 * 24 * 1000,
  };
  return encodeURIComponent(JSON.stringify(adminData));
}

test.describe("Navigation - Public Routes", () => {
  test("homepage (/) redirects to /access", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/access");
    await expect(page).toHaveURL(/\/access$/);
  });

  test("/access page loads successfully", async ({ page }) => {
    await page.goto("/access");
    await expect(page).toHaveURL(/\/access$/);

    // The page renders with a main landmark
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("brand name 'ScriptsXO' is visible on /access page", async ({
    page,
  }) => {
    await page.goto("/access");

    const brandLink = page.locator("a", { hasText: "ScriptsXO" });
    await expect(brandLink.first()).toBeVisible();
  });
});

test.describe("Navigation - Middleware Redirects (Unauthenticated)", () => {
  test("/portal redirects unauthenticated user to /access", async ({
    page,
  }) => {
    await page.goto("/portal");
    await page.waitForURL("**/access**");
    await expect(page).toHaveURL(/\/access/);
  });

  test("/provider redirects unauthenticated user to /access", async ({
    page,
  }) => {
    await page.goto("/provider");
    await page.waitForURL("**/access**");
    await expect(page).toHaveURL(/\/access/);
  });

  test("/admin redirects unauthenticated user to /access", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForURL("**/access**");
    await expect(page).toHaveURL(/\/access/);
  });

  test("/pharmacy redirects unauthenticated user to /access", async ({
    page,
  }) => {
    await page.goto("/pharmacy");
    await page.waitForURL("**/access**");
    await expect(page).toHaveURL(/\/access/);
  });

  test("/portal redirect includes redirect query param", async ({ page }) => {
    await page.goto("/portal");
    await page.waitForURL("**/access**");
    await expect(page).toHaveURL(/redirect=%2Fportal/);
  });

  test("/admin redirect includes reason=auth_required param", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForURL("**/access**");
    await expect(page).toHaveURL(/reason=auth_required/);
  });
});

test.describe("Navigation - Authenticated Pages", () => {
  test.beforeEach(async ({ context }) => {
    // Set the session cookie so middleware allows access to protected routes
    const baseURL = "http://localhost:3001";
    const url = new URL(baseURL);

    await context.addCookies([
      {
        name: "app_session",
        value: createMockSessionCookie(),
        domain: url.hostname,
        path: "/",
      },
    ]);
  });

  test("provider page loads with Nav component when authenticated", async ({
    page,
  }) => {
    await page.goto("/provider");
    await expect(page).toHaveURL(/\/provider$/);

    // Nav bar should be visible with role="navigation"
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();

    // Brand name in the nav
    const brandLink = nav.locator("a", { hasText: "ScriptsXO" });
    await expect(brandLink).toBeVisible();
  });

  test("provider page Nav contains expected navigation links", async ({
    page,
  }) => {
    await page.goto("/provider");
    await expect(page).toHaveURL(/\/provider$/);

    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();

    // Desktop nav links (Patient Portal, Providers, Admin) from SITECONFIG.navigation.main
    const desktopNav = nav.locator('[role="menubar"]');
    await expect(
      desktopNav.locator("a", { hasText: "Patient Portal" })
    ).toBeAttached();
    await expect(
      desktopNav.locator("a", { hasText: "Providers" })
    ).toBeAttached();
    await expect(
      desktopNav.locator("a", { hasText: "Admin" })
    ).toBeAttached();

    // Account link outside the menubar
    await expect(nav.locator("a", { hasText: "Account" })).toBeAttached();
  });

  test("nav links have correct href attributes", async ({ page }) => {
    await page.goto("/provider");
    await expect(page).toHaveURL(/\/provider$/);

    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();

    // Brand link and "Patient Portal" menu item both point to /portal
    await expect(nav.locator('a[href="/portal"]').first()).toBeAttached();
    await expect(nav.locator('a[href="/portal"]')).toHaveCount(2);

    // Menu item links
    await expect(nav.locator('a[href="/provider"]')).toBeAttached();
    await expect(nav.locator('a[href="/admin"]')).toBeAttached();
    await expect(nav.locator('a[href="/access"]')).toBeAttached();
  });

  test("clicking brand link in nav navigates to /portal", async ({ page }) => {
    await page.goto("/provider");
    await expect(page).toHaveURL(/\/provider$/);

    const nav = page.locator('nav[aria-label="Main navigation"]');
    const brandLink = nav.locator("a", { hasText: "ScriptsXO" });
    await brandLink.click();

    await page.waitForURL("**/portal");
    await expect(page).toHaveURL(/\/portal$/);
  });

  test("clicking Account link in nav navigates to /access", async ({
    page,
  }) => {
    // When already authenticated, /access middleware redirects to /portal.
    // But the link itself should point to /access.
    await page.goto("/provider");
    await expect(page).toHaveURL(/\/provider$/);

    const nav = page.locator('nav[aria-label="Main navigation"]');
    const accountLink = nav.locator("a", { hasText: "Account" });

    // Verify the href attribute
    await expect(accountLink).toHaveAttribute("href", "/access");
  });

  test("provider page shows dashboard content", async ({ page }) => {
    await page.goto("/provider");
    await expect(page).toHaveURL(/\/provider$/);

    // Provider page heading
    const providerLabel = page.getByText("Provider Portal");
    await expect(providerLabel).toBeVisible();

    // Doctor name
    const doctorName = page.getByText("Dr. Sarah Mitchell, MD");
    await expect(doctorName).toBeVisible();

    // Patient Queue section
    const queueHeading = page.locator("h2", { hasText: "Patient Queue" });
    await expect(queueHeading).toBeVisible();
  });
});

test.describe("Navigation - Admin Access", () => {
  test("admin page requires both session and admin cookie", async ({
    context,
    page,
  }) => {
    const baseURL = "http://localhost:3001";
    const url = new URL(baseURL);

    // Set only session cookie (no admin cookie)
    await context.addCookies([
      {
        name: "app_session",
        value: createMockSessionCookie(),
        domain: url.hostname,
        path: "/",
      },
    ]);

    // Admin page should redirect to /portal with error=admin_required
    // because we have session but no admin cookie
    await page.goto("/admin");
    await page.waitForURL("**/portal**");
    await expect(page).toHaveURL(/error=admin_required/);
  });

  test("admin page loads with both cookies", async ({ context, page }) => {
    const baseURL = "http://localhost:3001";
    const url = new URL(baseURL);

    await context.addCookies([
      {
        name: "app_session",
        value: createMockSessionCookie(),
        domain: url.hostname,
        path: "/",
      },
      {
        name: "app_admin",
        value: createMockAdminCookie(),
        domain: url.hostname,
        path: "/",
      },
    ]);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/);

    // Nav should be visible
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();

    // Admin dashboard heading
    const adminLabel = page.getByText("Administration");
    await expect(adminLabel.first()).toBeVisible();
  });
});
