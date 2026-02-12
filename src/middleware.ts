import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * NEXT.JS MIDDLEWARE - ScriptsXO
 * - Security headers (CSP, HSTS, X-Frame-Options, etc.)
 * - Route protection for patients, providers, admins, pharmacies
 * - Rate limiting headers
 */

const SECURITYHEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(self), microphone=(self), geolocation=(), interest-cohort=()",
  "X-DNS-Prefetch-Control": "on",
  "X-Download-Options": "noopen",
  "X-Permitted-Cross-Domain-Policies": "none",
};

function getCSP(nonce: string): string {
  const isProd = process.env.NODE_ENV === "production";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "media-src 'self'",
    "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://api.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];
  return directives.join("; ");
}

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString("base64");
}

function applySecurityHeaders(response: NextResponse, nonce: string): void {
  Object.entries(SECURITYHEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set("Content-Security-Policy", getCSP(nonce));
  response.headers.set("x-nonce", nonce);

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
}

// Patient-facing protected routes
const PROTECTEDROUTES = ["/portal", "/consultation"];

// Admin routes
const ADMINROUTES = ["/admin"];

// Provider routes (also require auth)
const PROVIDERROUTES = ["/provider"];

// Pharmacy routes (also require auth)
const PHARMACYROUTES = ["/pharmacy"];

// Auth routes (redirect if already authenticated)
const AUTHROUTES = ["/access", "/login", "/register"];

const SESSIONCOOKIE = "app_session";
const ADMINCOOKIE = "app_admin";

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some((route) => {
    if (route.endsWith("*")) {
      return pathname.startsWith(route.slice(0, -1));
    }
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

function isValidSession(sessionCookie: string | undefined): boolean {
  if (!sessionCookie) return false;
  try {
    const session = JSON.parse(decodeURIComponent(sessionCookie));
    if (!session.email || !session.expiresAt) return false;
    if (session.expiresAt < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

function isAdminSession(adminCookie: string | undefined): boolean {
  if (!adminCookie) return false;
  try {
    const adminData = JSON.parse(decodeURIComponent(adminCookie));
    return adminData.isAdmin === true && adminData.expiresAt > Date.now();
  } catch {
    return false;
  }
}

function getSessionEmail(sessionCookie: string | undefined): string | null {
  if (!sessionCookie) return null;
  try {
    const session = JSON.parse(decodeURIComponent(sessionCookie));
    return session.email || null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = generateNonce();

  // Skip middleware for static files and webhook endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") ||
    pathname.startsWith("/api/webhooks")
  ) {
    const response = NextResponse.next();
    applySecurityHeaders(response, nonce);
    return response;
  }

  const sessionCookie = request.cookies.get(SESSIONCOOKIE)?.value;
  const adminCookie = request.cookies.get(ADMINCOOKIE)?.value;
  const hasValidSession = isValidSession(sessionCookie);
  const hasAdminAccess = isAdminSession(adminCookie);

  // Admin routes
  if (matchesRoute(pathname, ADMINROUTES)) {
    if (!hasValidSession) {
      const loginUrl = new URL("/access", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      loginUrl.searchParams.set("reason", "auth_required");
      const response = NextResponse.redirect(loginUrl);
      applySecurityHeaders(response, nonce);
      return response;
    }
    if (!hasAdminAccess) {
      const portalUrl = new URL("/portal", request.url);
      portalUrl.searchParams.set("error", "admin_required");
      const response = NextResponse.redirect(portalUrl);
      applySecurityHeaders(response, nonce);
      return response;
    }
    const response = NextResponse.next();
    applySecurityHeaders(response, nonce);
    return response;
  }

  // Provider routes
  if (matchesRoute(pathname, PROVIDERROUTES)) {
    if (!hasValidSession) {
      const loginUrl = new URL("/access", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const response = NextResponse.redirect(loginUrl);
      applySecurityHeaders(response, nonce);
      return response;
    }
    const response = NextResponse.next();
    applySecurityHeaders(response, nonce);
    const email = getSessionEmail(sessionCookie);
    if (email) response.headers.set("x-user-email", email);
    return response;
  }

  // Pharmacy routes
  if (matchesRoute(pathname, PHARMACYROUTES)) {
    if (!hasValidSession) {
      const loginUrl = new URL("/access", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const response = NextResponse.redirect(loginUrl);
      applySecurityHeaders(response, nonce);
      return response;
    }
    const response = NextResponse.next();
    applySecurityHeaders(response, nonce);
    return response;
  }

  // Patient protected routes
  if (matchesRoute(pathname, PROTECTEDROUTES)) {
    if (!hasValidSession) {
      const loginUrl = new URL("/access", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const response = NextResponse.redirect(loginUrl);
      applySecurityHeaders(response, nonce);
      return response;
    }
    const response = NextResponse.next();
    applySecurityHeaders(response, nonce);
    const email = getSessionEmail(sessionCookie);
    if (email) response.headers.set("x-user-email", email);
    return response;
  }

  // Auth routes - redirect if already logged in
  if (matchesRoute(pathname, AUTHROUTES)) {
    if (hasValidSession) {
      const redirectTo =
        request.nextUrl.searchParams.get("redirect") || "/portal";
      const response = NextResponse.redirect(
        new URL(redirectTo, request.url)
      );
      applySecurityHeaders(response, nonce);
      return response;
    }
    const response = NextResponse.next();
    applySecurityHeaders(response, nonce);
    return response;
  }

  // Public routes
  const response = NextResponse.next();
  applySecurityHeaders(response, nonce);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
