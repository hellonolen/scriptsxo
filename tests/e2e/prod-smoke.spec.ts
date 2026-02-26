/**
 * PRODUCTION SMOKE TESTS
 * Targets live Cloudflare Pages deploy.
 * Run: PLAYWRIGHT_TEST_BASE_URL=https://7c88b427.scriptsxo.pages.dev \
 *       npx playwright test tests/e2e/prod-smoke.spec.ts --project=chromium
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://localhost:3001";
const ENV_SLUG = BASE.replace(/https?:\/\//, "").replace(/\./g, "-").replace(/\//g, "");
const ARTIFACT_DIR = path.resolve("artifacts/smoke");
const CONSOLE_DIR = path.resolve("artifacts/console");
const NETWORK_DIR = path.resolve("artifacts/network");

[ARTIFACT_DIR, CONSOLE_DIR, NETWORK_DIR].forEach((d) =>
  fs.mkdirSync(path.join(d, ENV_SLUG), { recursive: true })
);

const ROUTES = [
  { path: "/", protected: false },
  { path: "/start", protected: false },
  { path: "/onboard", protected: false },
  { path: "/intake", protected: false },
  { path: "/admin", protected: true },
  { path: "/admin/users", protected: true },
  { path: "/admin/analytics", protected: true },
  { path: "/dashboard", protected: true },
  { path: "/provider", protected: true },
  { path: "/pharmacy", protected: true },
];

for (const route of ROUTES) {
  test(`smoke: GET ${route.path}`, async ({ page }) => {
    const consoleLogs: string[] = [];
    const jsErrors: string[] = [];
    const serverErrors: { url: string; status: number }[] = [];

    page.on("console", (msg) => {
      const line = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(line);
      if (msg.type() === "error") jsErrors.push(msg.text());
    });
    page.on("response", (res) => {
      if (res.status() >= 500) {
        serverErrors.push({ url: res.url(), status: res.status() });
      }
    });

    await page.goto(BASE + route.path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    const slug = route.path.replace(/\//g, "-").replace(/^-/, "") || "root";
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, ENV_SLUG, `${slug}.png`),
      fullPage: true,
    });

    // Append console log
    fs.appendFileSync(
      path.join(CONSOLE_DIR, ENV_SLUG, "console.log"),
      `\n=== ${route.path} ===\n${consoleLogs.join("\n")}\n`
    );

    // ASSERT: no 5xx
    expect(
      serverErrors,
      `5xx on ${route.path}: ${JSON.stringify(serverErrors)}`
    ).toHaveLength(0);

    // ASSERT: no JS errors (filter Convex connection noise on static pages)
    const realErrors = jsErrors.filter(
      (e) =>
        !e.includes("ConvexReactClient") &&
        !e.includes("WebSocket") &&
        !e.includes("NEXT_REDIRECT")
    );
    expect(
      realErrors,
      `JS errors on ${route.path}: ${realErrors.join(" | ")}`
    ).toHaveLength(0);

    if (route.protected) {
      // Protected route must redirect away or return auth wall
      const finalUrl = page.url();
      const landed = new URL(finalUrl).pathname;

      // Acceptable destinations: /start, /access, /login, / (root)
      const isAtProtected = landed === route.path || landed.startsWith(route.path + "/");
      if (isAtProtected) {
        // Still at protected route — check that privileged content is NOT visible
        const bodyText = await page.evaluate(() => document.body.innerText ?? "");
        const LEAKED_PATTERNS = [
          "Admin Panel",
          "Manage Users",
          "Provider Dashboard",
          "Pharmacy Queue",
          "All Prescriptions",
          "Analytics",
        ];
        const leaked = LEAKED_PATTERNS.filter((kw) => bodyText.includes(kw));
        expect(
          leaked,
          `Protected content leaked at ${route.path}: ${leaked.join(", ")}`
        ).toHaveLength(0);
      }
    }
  });
}

test("security headers: X-Frame-Options, CSP, X-Content-Type-Options", async ({ page }) => {
  const response = await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  expect(response, "no response from /").not.toBeNull();
  const headers = response!.headers();

  const xfo = headers["x-frame-options"];
  expect(xfo, "X-Frame-Options missing or wrong").toMatch(/DENY|SAMEORIGIN/i);

  const xcto = headers["x-content-type-options"];
  expect(xcto, "X-Content-Type-Options missing").toBe("nosniff");

  const csp = headers["content-security-policy"];
  expect(csp, "CSP header missing").toBeTruthy();
  expect(csp, "CSP must block frame-ancestors").toContain("frame-ancestors 'none'");
});

test("secrets: no raw API keys in rendered page source", async ({ page }) => {
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });

  const html = await page.content();
  const inlineScripts = await page.evaluate(() =>
    Array.from(document.querySelectorAll("script:not([src])"))
      .map((s) => s.textContent ?? "")
      .join("\n")
  );
  const combined = html + inlineScripts;

  const DANGER = [
    { pattern: /sk-[A-Za-z0-9]{20,}/, label: "OpenAI key" },
    { pattern: /CONVEX_DEPLOY_KEY/, label: "Convex deploy key" },
    { pattern: /AIzaSy[A-Za-z0-9_-]{33}/, label: "Google API key" },
    { pattern: /whsec_[A-Za-z0-9]{40,}/, label: "Stripe webhook secret" },
    { pattern: /sk_live_[A-Za-z0-9]{20,}/, label: "Stripe live secret" },
    { pattern: /rk_live_[A-Za-z0-9]{20,}/, label: "Stripe restricted key" },
    { pattern: /phaxio.*secret/i, label: "Phaxio secret" },
    { pattern: /GEMINI_API_KEY/, label: "Gemini key (server-only)" },
  ];

  for (const { pattern, label } of DANGER) {
    expect(combined, `${label} found in page source`).not.toMatch(pattern);
  }
});

test("no internal stacktraces exposed in HTML", async ({ page }) => {
  await page.goto(BASE + "/admin", { waitUntil: "domcontentloaded" });
  const body = await page.evaluate(() => document.body.innerText ?? "");
  expect(body, "Internal stacktrace exposed").not.toContain("at Object.<anonymous>");
  expect(body, "Convex internals exposed").not.toContain("convex/server");
  expect(body, "Node path exposed").not.toContain("/Users/");
  expect(body, "FORBIDDEN error detail exposed to anon").not.toMatch(
    /ConvexError|"code":"FORBIDDEN"/
  );
});
