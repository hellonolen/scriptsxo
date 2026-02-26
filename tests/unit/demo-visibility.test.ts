/**
 * Demo Data Visibility Tests
 *
 * These tests prove:
 *  1. shouldShowDemoData() returns false for authenticated users (always).
 *  2. shouldShowDemoData() returns true for unauthenticated users in dev/demo-preview.
 *  3. shouldShowDemoData() returns false for unauthenticated users in production.
 */

import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";

// Mock the auth module so we can control isAuthenticatedClient() behavior
vi.mock("@/lib/auth", () => ({
  getSessionCookie: vi.fn(),
}));

import { getSessionCookie } from "@/lib/auth";
import { isAuthenticatedClient, shouldShowDemoData } from "@/lib/demo";

// Restore window between tests
const originalWindow = globalThis.window;

function mockWindow(hostname: string) {
  Object.defineProperty(globalThis, "window", {
    value: { location: { hostname } },
    writable: true,
    configurable: true,
  });
}

describe("isAuthenticatedClient", () => {
  afterEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(globalThis, "window", { value: originalWindow, writable: true, configurable: true });
  });

  it("returns false when window is undefined (SSR)", () => {
    const win = globalThis.window;
    // @ts-expect-error intentional
    delete globalThis.window;
    expect(isAuthenticatedClient()).toBe(false);
    Object.defineProperty(globalThis, "window", { value: win, writable: true, configurable: true });
  });

  it("returns false when no session cookie", () => {
    mockWindow("localhost");
    vi.mocked(getSessionCookie).mockReturnValue(null);
    expect(isAuthenticatedClient()).toBe(false);
  });

  it("returns false when session has no email", () => {
    mockWindow("localhost");
    vi.mocked(getSessionCookie).mockReturnValue({ email: "" } as any);
    expect(isAuthenticatedClient()).toBe(false);
  });

  it("returns true when session has an email", () => {
    mockWindow("localhost");
    vi.mocked(getSessionCookie).mockReturnValue({ email: "user@example.com" } as any);
    expect(isAuthenticatedClient()).toBe(true);
  });
});

describe("shouldShowDemoData", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    vi.resetAllMocks();
  });

  afterEach(() => {
    process.env = OLD_ENV;
    Object.defineProperty(globalThis, "window", { value: originalWindow, writable: true, configurable: true });
  });

  // -------------------------------------------------------------------------
  // Authenticated users NEVER see demo data
  // -------------------------------------------------------------------------

  it("returns false for authenticated user on localhost", () => {
    mockWindow("localhost");
    vi.mocked(getSessionCookie).mockReturnValue({ email: "provider@scriptsxo.com" } as any);
    expect(shouldShowDemoData()).toBe(false);
  });

  it("returns false for authenticated user in production", () => {
    mockWindow("scriptsxo.com");
    vi.mocked(getSessionCookie).mockReturnValue({ email: "admin@scriptsxo.com" } as any);
    expect(shouldShowDemoData()).toBe(false);
  });

  it("returns false for authenticated user even when DEMO_PREVIEW_MODE is set", () => {
    mockWindow("scriptsxo.com");
    process.env.NEXT_PUBLIC_DEMO_PREVIEW_MODE = "true";
    vi.mocked(getSessionCookie).mockReturnValue({ email: "user@example.com" } as any);
    expect(shouldShowDemoData()).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Unauthenticated users — dev mode
  // -------------------------------------------------------------------------

  it("returns true for unauthenticated user on localhost", () => {
    mockWindow("localhost");
    vi.mocked(getSessionCookie).mockReturnValue(null);
    process.env.NEXT_PUBLIC_DEMO_PREVIEW_MODE = "false";
    expect(shouldShowDemoData()).toBe(true);
  });

  it("returns true for unauthenticated user on 127.0.0.1", () => {
    mockWindow("127.0.0.1");
    vi.mocked(getSessionCookie).mockReturnValue(null);
    process.env.NEXT_PUBLIC_DEMO_PREVIEW_MODE = "false";
    expect(shouldShowDemoData()).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Unauthenticated users — demo preview flag
  // -------------------------------------------------------------------------

  it("returns true for unauthenticated user when DEMO_PREVIEW_MODE=true on production domain", () => {
    mockWindow("scriptsxo.com");
    vi.mocked(getSessionCookie).mockReturnValue(null);
    process.env.NEXT_PUBLIC_DEMO_PREVIEW_MODE = "true";
    expect(shouldShowDemoData()).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Unauthenticated users — production (no demo mode)
  // -------------------------------------------------------------------------

  it("returns false for unauthenticated user on production without demo flag", () => {
    mockWindow("scriptsxo.com");
    vi.mocked(getSessionCookie).mockReturnValue(null);
    process.env.NEXT_PUBLIC_DEMO_PREVIEW_MODE = "false";
    expect(shouldShowDemoData()).toBe(false);
  });

  it("returns false for unauthenticated user on custom domain without demo flag", () => {
    mockWindow("app.scriptsxo.com");
    vi.mocked(getSessionCookie).mockReturnValue(null);
    delete process.env.NEXT_PUBLIC_DEMO_PREVIEW_MODE;
    expect(shouldShowDemoData()).toBe(false);
  });
});
