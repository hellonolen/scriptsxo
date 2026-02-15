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

function getCSP(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "media-src 'self'",
    "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://api.stripe.com https://npiregistry.cms.hhs.gov https://api.phaxio.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];
  return directives.join("; ");
}

function applySecurityHeaders(response: NextResponse): void {
  Object.entries(SECURITYHEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set("Content-Security-Policy", getCSP());

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
}

// Patient-facing protected routes
const PROTECTEDROUTES = ["/portal", "/consultation"];

// Routes that require both auth AND active payment
const PAIDROUTES = ["/dashboard", "/start"];

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

function hasActivePayment(sessionCookie: string | undefined): boolean {
  if (!sessionCookie) return false;
  try {
    const session = JSON.parse(decodeURIComponent(sessionCookie));
    return session.paymentStatus === "active";
  } catch {
    return false;
  }
}

function hasProviderRole(sessionCookie: string | undefined): boolean {
  if (!sessionCookie) return false;
  try {
    const session = JSON.parse(decodeURIComponent(sessionCookie));
    return session.role === "provider" || session.role === "admin";
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Skip middleware for static files and webhook endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") ||
    pathname.startsWith("/api/webhooks")
  ) {
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  }

  // Skip auth checks on localhost for development
  if (process.env.NODE_ENV === "development") {
    const response = NextResponse.next();
    applySecurityHeaders(response);
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
      applySecurityHeaders(response);
      return response;
    }
    if (!hasAdminAccess) {
      const portalUrl = new URL("/portal", request.url);
      portalUrl.searchParams.set("error", "admin_required");
      const response = NextResponse.redirect(portalUrl);
      applySecurityHeaders(response);
      return response;
    }
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  }

  // Provider routes
  if (matchesRoute(pathname, PROVIDERROUTES)) {
    if (!hasValidSession) {
      const loginUrl = new URL("/access", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const response = NextResponse.redirect(loginUrl);
      applySecurityHeaders(response);
      return response;
    }
    const response = NextResponse.next();
    applySecurityHeaders(response);
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
      applySecurityHeaders(response);
      return response;
    }
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  }

  // Paid routes — require valid session AND active payment (admins/providers exempt)
  if (matchesRoute(pathname, PAIDROUTES)) {
    if (!hasValidSession) {
      const loginUrl = new URL("/access", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const response = NextResponse.redirect(loginUrl);
      applySecurityHeaders(response);
      return response;
    }
    // Admins and providers bypass the paywall
    const isExempt = hasAdminAccess || hasProviderRole(sessionCookie);
    if (!isExempt && !hasActivePayment(sessionCookie)) {
      const payUrl = new URL("/pay", request.url);
      const response = NextResponse.redirect(payUrl);
      applySecurityHeaders(response);
      return response;
    }
    const response = NextResponse.next();
    applySecurityHeaders(response);
    const email = getSessionEmail(sessionCookie);
    if (email) response.headers.set("x-user-email", email);
    return response;
  }

  // Patient protected routes
  if (matchesRoute(pathname, PROTECTEDROUTES)) {
    if (!hasValidSession) {
      const loginUrl = new URL("/access", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const response = NextResponse.redirect(loginUrl);
      applySecurityHeaders(response);
      return response;
    }
    const response = NextResponse.next();
    applySecurityHeaders(response);
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
      applySecurityHeaders(response);
      return response;
    }
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  }

  // Public routes
  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
