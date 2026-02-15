import { defineConfig, devices } from "@playwright/test";

/**
 * PLAYWRIGHT E2E TEST CONFIGURATION
 * ScriptsXO - Telehealth Prescription Fulfillment Platform
 *
 * Run E2E tests with: npm run test:e2e
 * Run in UI mode: npm run test:e2e:ui
 */

const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3001";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,

  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "on-failure" }]],

  timeout: 60000,

  expect: {
    timeout: 5000,
  },

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 12"] },
    },
  ],

  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev -- -p 3001",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: "pipe",
    stderr: "pipe",
  },

  outputDir: "tests/e2e/test-results",
});
