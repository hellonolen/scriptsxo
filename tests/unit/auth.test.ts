import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  setSessionCookie,
  getSessionCookie,
  clearSessionCookie,
  setAdminCookie,
  getAdminCookie,
  clearAdminCookie,
  clearAllAuthCookies,
  isAuthenticated,
  isAdminEmail,
  isAdmin,
  getCurrentUserEmail,
  refreshSession,
  createSession,
  createAdminSession,
  type Session,
  type AdminSession,
} from "@/lib/auth";

/**
 * Helper to create a valid session object with sensible defaults.
 * expiresAt defaults to 1 hour from now (in the future).
 */
function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    email: "test@example.com",
    name: "Test User",
    authenticatedAt: Date.now(),
    expiresAt: Date.now() + 3600 * 1000, // 1 hour from now
    ...overrides,
  };
}

/**
 * Helper to create a valid admin session object.
 */
function makeAdminSession(overrides: Partial<AdminSession> = {}): AdminSession {
  return {
    isAdmin: true,
    email: "hellonolen@gmail.com",
    expiresAt: Date.now() + 3600 * 1000,
    ...overrides,
  };
}

describe("Session Cookie Operations", () => {
  describe("setSessionCookie", () => {
    it("sets a session cookie that can be retrieved", () => {
      const session = makeSession();
      setSessionCookie(session);

      const retrieved = getSessionCookie();
      expect(retrieved).not.toBeNull();
      expect(retrieved?.email).toBe("test@example.com");
      expect(retrieved?.name).toBe("Test User");
    });

    it("encodes session data as JSON in the cookie", () => {
      const session = makeSession({ email: "user@site.com" });
      setSessionCookie(session);

      const retrieved = getSessionCookie();
      expect(retrieved?.email).toBe("user@site.com");
    });
  });

  describe("getSessionCookie", () => {
    it("returns null when no session cookie exists", () => {
      expect(getSessionCookie()).toBeNull();
    });

    it("returns the session when a valid cookie is set", () => {
      const session = makeSession();
      setSessionCookie(session);

      const result = getSessionCookie();
      expect(result).not.toBeNull();
      expect(result?.email).toBe(session.email);
      expect(result?.authenticatedAt).toBe(session.authenticatedAt);
    });

    it("returns null and clears cookie when session is expired", () => {
      const expiredSession = makeSession({
        expiresAt: Date.now() - 1000, // expired 1 second ago
      });
      setSessionCookie(expiredSession);

      const result = getSessionCookie();
      expect(result).toBeNull();
    });

    it("returns null for malformed cookie data", () => {
      // Directly set a malformed cookie value via document.cookie
      document.cookie = "app_session=not-valid-json; path=/";

      const result = getSessionCookie();
      expect(result).toBeNull();
    });

    it("returns null when session is missing email", () => {
      const sessionWithoutEmail = { expiresAt: Date.now() + 3600000 };
      const encoded = encodeURIComponent(JSON.stringify(sessionWithoutEmail));
      document.cookie = `app_session=${encoded}; path=/`;

      const result = getSessionCookie();
      expect(result).toBeNull();
    });

    it("returns null when session is missing expiresAt", () => {
      const sessionWithoutExpiry = { email: "test@example.com" };
      const encoded = encodeURIComponent(JSON.stringify(sessionWithoutExpiry));
      document.cookie = `app_session=${encoded}; path=/`;

      const result = getSessionCookie();
      expect(result).toBeNull();
    });
  });

  describe("clearSessionCookie", () => {
    it("removes the session cookie", () => {
      setSessionCookie(makeSession());
      expect(getSessionCookie()).not.toBeNull();

      clearSessionCookie();
      expect(getSessionCookie()).toBeNull();
    });

    it("does nothing when no session cookie exists", () => {
      // Should not throw
      clearSessionCookie();
      expect(getSessionCookie()).toBeNull();
    });
  });
});

describe("Admin Cookie Operations", () => {
  describe("setAdminCookie", () => {
    it("sets an admin cookie that can be retrieved", () => {
      const adminSession = makeAdminSession();
      setAdminCookie(adminSession);

      const retrieved = getAdminCookie();
      expect(retrieved).not.toBeNull();
      expect(retrieved?.isAdmin).toBe(true);
      expect(retrieved?.email).toBe("hellonolen@gmail.com");
    });
  });

  describe("getAdminCookie", () => {
    it("returns null when no admin cookie exists", () => {
      expect(getAdminCookie()).toBeNull();
    });

    it("returns the admin session when a valid cookie is set", () => {
      const adminSession = makeAdminSession();
      setAdminCookie(adminSession);

      const result = getAdminCookie();
      expect(result).not.toBeNull();
      expect(result?.isAdmin).toBe(true);
    });

    it("returns null and clears cookie when admin session is expired", () => {
      const expiredAdmin = makeAdminSession({
        expiresAt: Date.now() - 1000,
      });
      setAdminCookie(expiredAdmin);

      const result = getAdminCookie();
      expect(result).toBeNull();
    });

    it("returns null for malformed admin cookie data", () => {
      document.cookie = "app_admin=invalid-json; path=/";

      const result = getAdminCookie();
      expect(result).toBeNull();
    });
  });

  describe("clearAdminCookie", () => {
    it("removes the admin cookie", () => {
      setAdminCookie(makeAdminSession());
      expect(getAdminCookie()).not.toBeNull();

      clearAdminCookie();
      expect(getAdminCookie()).toBeNull();
    });
  });
});

describe("clearAllAuthCookies", () => {
  it("clears both session and admin cookies", () => {
    setSessionCookie(makeSession());
    setAdminCookie(makeAdminSession());

    expect(getSessionCookie()).not.toBeNull();
    expect(getAdminCookie()).not.toBeNull();

    clearAllAuthCookies();

    expect(getSessionCookie()).toBeNull();
    expect(getAdminCookie()).toBeNull();
  });

  it("does nothing when no cookies exist", () => {
    // Should not throw
    clearAllAuthCookies();
    expect(getSessionCookie()).toBeNull();
    expect(getAdminCookie()).toBeNull();
  });
});

describe("isAuthenticated", () => {
  it("returns false when no session exists", () => {
    expect(isAuthenticated()).toBe(false);
  });

  it("returns true when a valid session exists", () => {
    setSessionCookie(makeSession());
    expect(isAuthenticated()).toBe(true);
  });

  it("returns false when session is expired", () => {
    setSessionCookie(makeSession({ expiresAt: Date.now() - 1000 }));
    expect(isAuthenticated()).toBe(false);
  });
});

describe("isAdminEmail", () => {
  it("returns true for whitelisted admin email", () => {
    expect(isAdminEmail("hellonolen@gmail.com")).toBe(true);
  });

  it("returns true for second admin email", () => {
    expect(isAdminEmail("nolen@doclish.com")).toBe(true);
  });

  it("returns false for non-admin email", () => {
    expect(isAdminEmail("random@example.com")).toBe(false);
  });

  it("is case-insensitive (lowercases input)", () => {
    expect(isAdminEmail("HELLONOLEN@GMAIL.COM")).toBe(true);
    expect(isAdminEmail("Nolen@Doclish.Com")).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(isAdminEmail("")).toBe(false);
  });

  it("returns false for partial match", () => {
    expect(isAdminEmail("hellonolen@gmail")).toBe(false);
    expect(isAdminEmail("hellonolen")).toBe(false);
  });
});

describe("isAdmin", () => {
  it("returns false when no admin cookie exists", () => {
    expect(isAdmin()).toBe(false);
  });

  it("returns true when valid admin cookie exists", () => {
    setAdminCookie(makeAdminSession());
    expect(isAdmin()).toBe(true);
  });

  it("returns false when admin cookie is expired", () => {
    setAdminCookie(makeAdminSession({ expiresAt: Date.now() - 1000 }));
    expect(isAdmin()).toBe(false);
  });

  it("returns false when isAdmin flag is false in cookie", () => {
    setAdminCookie(makeAdminSession({ isAdmin: false }));
    expect(isAdmin()).toBe(false);
  });
});

describe("getCurrentUserEmail", () => {
  it("returns null when no session exists", () => {
    expect(getCurrentUserEmail()).toBeNull();
  });

  it("returns the email from the current session", () => {
    setSessionCookie(makeSession({ email: "patient@example.com" }));
    expect(getCurrentUserEmail()).toBe("patient@example.com");
  });
});

describe("refreshSession", () => {
  it("extends session expiration", () => {
    const originalExpiry = Date.now() + 1000; // 1 second from now
    setSessionCookie(makeSession({ expiresAt: originalExpiry }));

    refreshSession();

    const refreshed = getSessionCookie();
    expect(refreshed).not.toBeNull();
    // New expiry should be much further in the future (60 days)
    expect(refreshed!.expiresAt).toBeGreaterThan(originalExpiry);
  });

  it("does nothing when no session exists", () => {
    // Should not throw
    refreshSession();
    expect(getSessionCookie()).toBeNull();
  });
});

describe("createSession", () => {
  it("creates a session with the given email", () => {
    const session = createSession("user@test.com");
    expect(session.email).toBe("user@test.com");
  });

  it("uses email prefix as name when name is not provided", () => {
    const session = createSession("john@example.com");
    expect(session.name).toBe("john");
  });

  it("uses provided name when given", () => {
    const session = createSession("john@example.com", "John Doe");
    expect(session.name).toBe("John Doe");
  });

  it("sets authenticatedAt to approximately now", () => {
    const before = Date.now();
    const session = createSession("user@test.com");
    const after = Date.now();

    expect(session.authenticatedAt).toBeGreaterThanOrEqual(before);
    expect(session.authenticatedAt).toBeLessThanOrEqual(after);
  });

  it("sets expiresAt to 60 days from now", () => {
    const before = Date.now();
    const session = createSession("user@test.com");

    const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
    const expectedExpiry = before + sixtyDaysMs;

    // Allow 1 second tolerance
    expect(session.expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 1000);
    expect(session.expiresAt).toBeLessThanOrEqual(expectedExpiry + 1000);
  });

  it("auto-sets admin cookie when email is an admin email", () => {
    createSession("hellonolen@gmail.com");

    const adminCookie = getAdminCookie();
    expect(adminCookie).not.toBeNull();
    expect(adminCookie?.isAdmin).toBe(true);
    expect(adminCookie?.email).toBe("hellonolen@gmail.com");
  });

  it("does not set admin cookie for non-admin emails", () => {
    createSession("regular@example.com");

    const adminCookie = getAdminCookie();
    expect(adminCookie).toBeNull();
  });
});

describe("createAdminSession", () => {
  it("creates an admin session with isAdmin true", () => {
    const adminSession = createAdminSession("admin@test.com");
    expect(adminSession.isAdmin).toBe(true);
    expect(adminSession.email).toBe("admin@test.com");
  });

  it("sets expiresAt to 60 days from now", () => {
    const before = Date.now();
    const adminSession = createAdminSession("admin@test.com");

    const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
    const expectedExpiry = before + sixtyDaysMs;

    expect(adminSession.expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 1000);
    expect(adminSession.expiresAt).toBeLessThanOrEqual(expectedExpiry + 1000);
  });
});
