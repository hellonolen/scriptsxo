import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @simplewebauthn/browser before importing the module under test
vi.mock("@simplewebauthn/browser", () => ({
  startRegistration: vi.fn().mockResolvedValue({ id: "reg-123", type: "public-key" }),
  startAuthentication: vi.fn().mockResolvedValue({ id: "auth-456", type: "public-key" }),
}));

import * as webauthnModule from "@/lib/webauthn";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

const { isWebAuthnSupported, isPlatformAuthenticatorAvailable, registerPasskey, authenticatePasskey } = webauthnModule;

describe("isWebAuthnSupported", () => {
  it("returns true when window and PublicKeyCredential are available", () => {
    // setup.ts defines window.PublicKeyCredential, so this should be true
    expect(isWebAuthnSupported()).toBe(true);
  });

  it("checks for window.PublicKeyCredential existence", () => {
    // Verify the function returns a boolean
    const result = isWebAuthnSupported();
    expect(typeof result).toBe("boolean");
  });
});

describe("isPlatformAuthenticatorAvailable", () => {
  it("returns true when platform authenticator is available", async () => {
    // setup.ts mocks isUserVerifyingPlatformAuthenticatorAvailable to resolve true
    const result = await isPlatformAuthenticatorAvailable();
    expect(result).toBe(true);
  });

  it("calls PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable", async () => {
    const mockFn = window.PublicKeyCredential
      .isUserVerifyingPlatformAuthenticatorAvailable as ReturnType<typeof vi.fn>;
    mockFn.mockResolvedValueOnce(true);

    await isPlatformAuthenticatorAvailable();

    expect(mockFn).toHaveBeenCalled();
  });

  it("returns false when platform authenticator check throws", async () => {
    const mockFn = window.PublicKeyCredential
      .isUserVerifyingPlatformAuthenticatorAvailable as ReturnType<typeof vi.fn>;
    mockFn.mockRejectedValueOnce(new Error("Not available"));

    const result = await isPlatformAuthenticatorAvailable();
    expect(result).toBe(false);
  });

  it("returns false when platform authenticator returns false", async () => {
    const mockFn = window.PublicKeyCredential
      .isUserVerifyingPlatformAuthenticatorAvailable as ReturnType<typeof vi.fn>;
    mockFn.mockResolvedValueOnce(false);

    const result = await isPlatformAuthenticatorAvailable();
    expect(result).toBe(false);
  });

  it("handles sequential calls correctly", async () => {
    // First call returns true (default mock), second returns false
    const mockFn = window.PublicKeyCredential
      .isUserVerifyingPlatformAuthenticatorAvailable as ReturnType<typeof vi.fn>;
    mockFn.mockResolvedValueOnce(true);
    mockFn.mockResolvedValueOnce(false);

    const first = await isPlatformAuthenticatorAvailable();
    const second = await isPlatformAuthenticatorAvailable();

    expect(first).toBe(true);
    expect(second).toBe(false);
  });
});

describe("registerPasskey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls startRegistration with optionsJSON wrapper", async () => {
    const mockOptions = { challenge: "abc123", rp: { name: "ScriptsXO" } };

    await registerPasskey(mockOptions);

    expect(startRegistration).toHaveBeenCalledWith({
      optionsJSON: mockOptions,
    });
  });

  it("returns the registration response", async () => {
    const result = await registerPasskey({ challenge: "test" });

    expect(result).toEqual({ id: "reg-123", type: "public-key" });
  });

  it("propagates errors from startRegistration", async () => {
    vi.mocked(startRegistration).mockRejectedValueOnce(
      new Error("User cancelled")
    );

    await expect(registerPasskey({})).rejects.toThrow("User cancelled");
  });
});

describe("authenticatePasskey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls startAuthentication with optionsJSON wrapper", async () => {
    const mockOptions = { challenge: "xyz789" };

    await authenticatePasskey(mockOptions);

    expect(startAuthentication).toHaveBeenCalledWith({
      optionsJSON: mockOptions,
    });
  });

  it("returns the authentication response", async () => {
    const result = await authenticatePasskey({ challenge: "test" });

    expect(result).toEqual({ id: "auth-456", type: "public-key" });
  });

  it("propagates errors from startAuthentication", async () => {
    vi.mocked(startAuthentication).mockRejectedValueOnce(
      new Error("Authentication failed")
    );

    await expect(authenticatePasskey({})).rejects.toThrow(
      "Authentication failed"
    );
  });
});
