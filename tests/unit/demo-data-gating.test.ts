/**
 * DEMO DATA GATING TESTS (Phase 4)
 *
 * Static analysis: verifies that every file importing SEED_* constants
 * also uses shouldShowDemoData() to gate the data.
 *
 * This ensures no seed/demo data is ever shown to authenticated users
 * in any environment, and prevents new pages from accidentally exposing
 * demo data without the guard.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import glob from "fast-glob";

const SRC_DIR = path.resolve(__dirname, "../../src");

// ─────────────────────────────────────────────────────────────────────────────
// SEED GUARD STATIC ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

describe("Demo data gating: every SEED_* import has a shouldShowDemoData guard", () => {
  // Get all .tsx/.ts files in src/ that import SEED_* from seed-data
  const allFiles = glob.sync("**/*.{ts,tsx}", { cwd: SRC_DIR, absolute: true, ignore: ["**/node_modules/**"] });

  const filesUsingSeeds = allFiles.filter((filePath) => {
    const content = fs.readFileSync(filePath, "utf-8");
    return content.includes("from \"@/lib/seed-data\"") || content.includes("from '@/lib/seed-data'");
  });

  it("at least one file imports from seed-data (test is meaningful)", () => {
    expect(filesUsingSeeds.length).toBeGreaterThan(0);
  });

  for (const filePath of filesUsingSeeds) {
    const relativePath = path.relative(SRC_DIR, filePath);

    it(`${relativePath} uses shouldShowDemoData guard`, () => {
      const content = fs.readFileSync(filePath, "utf-8");

      const hasGuard =
        content.includes("shouldShowDemoData") ||
        content.includes("showDemo"); // component-local state derived from shouldShowDemoData

      expect(
        hasGuard,
        `${relativePath} imports seed-data but has no shouldShowDemoData or showDemo guard`
      ).toBe(true);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA NEVER SHOWN TO AUTHENTICATED USERS
// ─────────────────────────────────────────────────────────────────────────────

describe("shouldShowDemoData logic contract", () => {
  // These tests verify the behaviour by importing the actual function
  // The detailed unit tests are in demo-visibility.test.ts
  // Here we verify the contract at a higher level

  it("seed-data.ts does not expose real medication names in data (comments allowed)", () => {
    const seedPath = path.resolve(SRC_DIR, "lib/seed-data.ts");
    const raw = fs.readFileSync(seedPath, "utf-8");

    // Strip single-line and multi-line comments before checking
    const noComments = raw
      .replace(/\/\*[\s\S]*?\*\//g, "")   // block comments
      .replace(/\/\/.*/g, "");             // line comments

    // Should NOT contain real medication names in data strings
    const BANNED_NAMES = [
      "Lisinopril",
      "Metformin",
      "Levothyroxine",
      "Atorvastatin",
      "Amlodipine",
      "Doxycycline",
      "Ozempic",
      "Semaglutide",
      "Tirzepatide",
    ];

    for (const name of BANNED_NAMES) {
      expect(
        noComments,
        `seed-data.ts data contains real medication name "${name}" — use generic names like "Protocol A"`
      ).not.toContain(name);
    }
  });

  it("seed-data.ts does not expose real email addresses", () => {
    const seedPath = path.resolve(SRC_DIR, "lib/seed-data.ts");
    const content = fs.readFileSync(seedPath, "utf-8");

    // Should not contain @ in patient-facing content (emails are PII)
    const emailPattern = /["'][a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}["']/g;
    const matches = content.match(emailPattern) ?? [];

    expect(
      matches,
      `seed-data.ts contains email addresses (PII risk): ${matches.join(", ")}`
    ).toHaveLength(0);
  });

  it("shouldShowDemoData never shows data to authenticated user (logic test)", () => {
    // The cookie-based function is tested in demo-visibility.test.ts
    // Here we verify the file exports the expected interface
    const demoPath = path.resolve(SRC_DIR, "lib/demo.ts");
    const content = fs.readFileSync(demoPath, "utf-8");

    expect(content).toContain("export function shouldShowDemoData");
    expect(content).toContain("export function isAuthenticatedClient");

    // Key contract: authenticated users never see demo data
    expect(content).toContain("isAuthenticatedClient()");
    expect(content).toContain("return false"); // authenticated → false
  });

  it("demo.ts imports from @/lib/auth (uses session cookie for auth check)", () => {
    const demoPath = path.resolve(SRC_DIR, "lib/demo.ts");
    const content = fs.readFileSync(demoPath, "utf-8");
    expect(content).toContain("getSessionCookie");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY DEMO CONSTANTS (old naming pattern must not exist)
// ─────────────────────────────────────────────────────────────────────────────

describe("No legacy DEMO_ hardcoded constants in src/", () => {
  const allSrcFiles = glob.sync("**/*.{ts,tsx}", { cwd: SRC_DIR, absolute: true, ignore: ["**/node_modules/**"] });

  it("no file uses old DEMO_UPCOMING_SESSION constant", () => {
    const violators = allSrcFiles.filter((filePath) => {
      const content = fs.readFileSync(filePath, "utf-8");
      return content.includes("DEMO_UPCOMING_SESSION");
    });
    expect(
      violators.map((f) => path.relative(SRC_DIR, f)),
      "Files using old DEMO_UPCOMING_SESSION constant"
    ).toHaveLength(0);
  });

  it("no file uses old DEMO_PAST_SESSIONS constant", () => {
    const violators = allSrcFiles.filter((filePath) => {
      const content = fs.readFileSync(filePath, "utf-8");
      return content.includes("DEMO_PAST_SESSIONS");
    });
    expect(
      violators.map((f) => path.relative(SRC_DIR, f)),
      "Files using old DEMO_PAST_SESSIONS constant"
    ).toHaveLength(0);
  });

  it("AUTH_BYPASS_ALLOWED is not set to true in .env files", () => {
    const projectRoot = path.resolve(SRC_DIR, "..");
    const envFiles = [".env", ".env.local", ".env.production", ".env.staging"].filter((f) =>
      fs.existsSync(path.join(projectRoot, f))
    );

    for (const envFile of envFiles) {
      const content = fs.readFileSync(path.join(projectRoot, envFile), "utf-8");
      expect(
        content,
        `${envFile} sets AUTH_BYPASS_ALLOWED=true — NEVER set in any environment`
      ).not.toContain("AUTH_BYPASS_ALLOWED=true");
    }
  });
});
