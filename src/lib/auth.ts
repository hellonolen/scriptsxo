/**
 * AUTH UTILITIES
 * Cookie management for middleware-compatible authentication.
 *
 * This module bridges client-side passkey auth with server-side middleware.
 * When a user authenticates, we store the session in both:
 * - localStorage (for client-side state)
 * - Cookies (for middleware route protection)
 */

// Cookie names (must match middleware.ts)
const SESSIONCOOKIE = "app_session";
const ADMINCOOKIE = "app_admin";

// Cookie options
const COOKIEMAXAGE = 60 * 24 * 60 * 60; // 60 days in seconds
const COOKIEPATH = "/";

export interface Session {
  email: string;
  name?: string;
  memberId?: string;
  userId?: string;
  authenticatedAt: number;
  expiresAt: number;
}

export interface AdminSession {
  isAdmin: boolean;
  email: string;
  expiresAt: number;
}

/**
 * Set the session cookie (called after successful authentication)
 */
export function setSessionCookie(session: Session): void {
  if (typeof document === "undefined") return;

  const cookieValue = encodeURIComponent(JSON.stringify(session));
  const expires = new Date(session.expiresAt).toUTCString();

  document.cookie = `${SESSIONCOOKIE}=${cookieValue}; path=${COOKIEPATH}; expires=${expires}; SameSite=Lax; Secure`;
}

/**
 * Set the admin cookie (called after admin verification)
 */
export function setAdminCookie(adminSession: AdminSession): void {
  if (typeof document === "undefined") return;

  const cookieValue = encodeURIComponent(JSON.stringify(adminSession));
  const expires = new Date(adminSession.expiresAt).toUTCString();

  document.cookie = `${ADMINCOOKIE}=${cookieValue}; path=${COOKIEPATH}; expires=${expires}; SameSite=Lax; Secure`;
}

/**
 * Get the current session from cookie
 */
export function getSessionCookie(): Session | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  const sessionCookie = cookies.find((c) =>
    c.trim().startsWith(`${SESSIONCOOKIE}=`)
  );

  if (!sessionCookie) return null;

  try {
    const value = sessionCookie.split("=")[1];
    const session = JSON.parse(decodeURIComponent(value));

    if (!session.email || !session.expiresAt) {
      return null;
    }

    if (session.expiresAt < Date.now()) {
      clearSessionCookie();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Get the admin session from cookie
 */
export function getAdminCookie(): AdminSession | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  const adminCookie = cookies.find((c) =>
    c.trim().startsWith(`${ADMINCOOKIE}=`)
  );

  if (!adminCookie) return null;

  try {
    const value = adminCookie.split("=")[1];
    const adminSession = JSON.parse(decodeURIComponent(value));

    if (adminSession.expiresAt < Date.now()) {
      clearAdminCookie();
      return null;
    }

    return adminSession;
  } catch {
    return null;
  }
}

/**
 * Clear the session cookie (called on sign out)
 */
export function clearSessionCookie(): void {
  if (typeof document === "undefined") return;

  document.cookie = `${SESSIONCOOKIE}=; path=${COOKIEPATH}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Clear the admin cookie
 */
export function clearAdminCookie(): void {
  if (typeof document === "undefined") return;

  document.cookie = `${ADMINCOOKIE}=; path=${COOKIEPATH}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Clear all auth cookies (full sign out)
 */
export function clearAllAuthCookies(): void {
  clearSessionCookie();
  clearAdminCookie();
}

/**
 * Check if user is authenticated (client-side)
 */
export function isAuthenticated(): boolean {
  return getSessionCookie() !== null;
}

/**
 * Check if user has admin privileges (client-side)
 */
export function isAdmin(): boolean {
  const adminCookie = getAdminCookie();
  return adminCookie?.isAdmin === true;
}

/**
 * Get current user email (client-side)
 */
export function getCurrentUserEmail(): string | null {
  const session = getSessionCookie();
  return session?.email || null;
}

/**
 * Refresh session expiration (extend session)
 */
export function refreshSession(): void {
  const session = getSessionCookie();
  if (!session) return;

  const newExpiresAt = Date.now() + COOKIEMAXAGE * 1000;
  setSessionCookie({
    ...session,
    expiresAt: newExpiresAt,
  });
}

/**
 * Create a session object from auth data
 */
export function createSession(email: string, name?: string): Session {
  const now = Date.now();
  return {
    email,
    name: name || email.split("@")[0],
    authenticatedAt: now,
    expiresAt: now + COOKIEMAXAGE * 1000,
  };
}

/**
 * Create an admin session object
 */
export function createAdminSession(email: string): AdminSession {
  const now = Date.now();
  return {
    isAdmin: true,
    email,
    expiresAt: now + COOKIEMAXAGE * 1000,
  };
}
