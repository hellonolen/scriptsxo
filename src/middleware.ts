import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * NEXT.JS MIDDLEWARE - ScriptsXO
 * - Security headers (CSP, HSTS, X-Frame-Options, etc.)
 * - Capability-based route guards (declarative RouteGuard config)
 * - Paywall enforcement for paid routes
 *
 * NOTE: CAP constants and ROLE_CAPS are intentionally duplicated here.
 * Middleware runs on the Next.js edge runtime and cannot import from
 * src/lib/capabilities.ts because that module requires bundling. This
 * mirrors the same pattern used in convex/lib/capabilities.ts.
 */

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------

const SECURITY_HEADERS = {
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
  const isDev = process.env.NODE_ENV === "development";
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "media-src 'self'",
    isDev
      ? "connect-src 'self' ws://localhost:* http://localhost:* https://*.convex.cloud wss://*.convex.cloud https://api.stripe.com https://npiregistry.cms.hhs.gov https://api.phaxio.com"
      : "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://api.stripe.com https://npiregistry.cms.hhs.gov https://api.phaxio.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Only upgrade insecure requests in production (breaks HTTP dev server)
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ];
  return directives.join("; ");
}

function applySecurityHeaders(response: NextResponse): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  response.headers.set("Content-Security-Policy", getCSP());

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
}

// ---------------------------------------------------------------------------
// Capability identifiers — mirror of src/lib/capabilities.ts (edge-safe copy)
// ---------------------------------------------------------------------------

const CAP = {
  VIEW_DASHBOARD: "view:dashboard",
  INTAKE_SELF: "intake:self",
  INTAKE_REVIEW: "intake:review",
  RX_VIEW: "rx:view",
  RX_WRITE: "rx:write",
  RX_SIGN: "rx:sign",
  RX_REFILL: "rx:refill",
  CONSULT_START: "consult:start",
  CONSULT_JOIN: "consult:join",
  CONSULT_HISTORY: "consult:history",
  WORKFLOW_VIEW: "workflow:view",
  WORKFLOW_MANAGE: "workflow:manage",
  MSG_VIEW: "msg:view",
  MSG_SEND: "msg:send",
  PHARMACY_QUEUE: "pharmacy:queue",
  PHARMACY_FILL: "pharmacy:fill",
  PHARMACY_VERIFY: "pharmacy:verify",
  PATIENT_VIEW: "patient:view",
  PATIENT_MANAGE: "patient:manage",
  PROVIDER_MANAGE: "provider:manage",
  REPORT_VIEW: "report:view",
  REPORT_EXPORT: "report:export",
  AUDIT_VIEW: "audit:view",
  USER_VIEW: "user:view",
  USER_MANAGE: "user:manage",
  SETTINGS_VIEW: "settings:view",
  SETTINGS_MANAGE: "settings:manage",
  AGENTS_VIEW: "agents:view",
  AGENTS_MANAGE: "agents:manage",
  INTEGRATIONS_VIEW: "integrations:view",
  INTEGRATIONS_MANAGE: "integrations:manage",
} as const;

type Capability = (typeof CAP)[keyof typeof CAP];
type Role = "patient" | "provider" | "nurse" | "pharmacy" | "admin" | "unverified";

// Role → capability bundles — mirror of src/lib/capabilities.ts
const ROLE_CAPS: Record<Role, Capability[]> = {
  unverified: [],

  patient: [
    CAP.VIEW_DASHBOARD,
    CAP.INTAKE_SELF,
    CAP.RX_VIEW,
    CAP.RX_REFILL,
    CAP.CONSULT_JOIN,
    CAP.CONSULT_HISTORY,
    CAP.MSG_VIEW,
    CAP.MSG_SEND,
  ],

  nurse: [
    CAP.VIEW_DASHBOARD,
    CAP.INTAKE_REVIEW,
    CAP.RX_VIEW,
    CAP.CONSULT_JOIN,
    CAP.CONSULT_HISTORY,
    CAP.WORKFLOW_VIEW,
    CAP.MSG_VIEW,
    CAP.MSG_SEND,
    CAP.PATIENT_VIEW,
    CAP.PATIENT_MANAGE,
  ],

  provider: [
    CAP.VIEW_DASHBOARD,
    CAP.INTAKE_REVIEW,
    CAP.RX_VIEW,
    CAP.RX_WRITE,
    CAP.RX_SIGN,
    CAP.RX_REFILL,
    CAP.CONSULT_START,
    CAP.CONSULT_JOIN,
    CAP.CONSULT_HISTORY,
    CAP.WORKFLOW_VIEW,
    CAP.WORKFLOW_MANAGE,
    CAP.MSG_VIEW,
    CAP.MSG_SEND,
    CAP.PATIENT_VIEW,
    CAP.PATIENT_MANAGE,
  ],

  pharmacy: [
    CAP.VIEW_DASHBOARD,
    CAP.RX_VIEW,
    CAP.MSG_VIEW,
    CAP.MSG_SEND,
    CAP.PHARMACY_QUEUE,
    CAP.PHARMACY_FILL,
    CAP.PHARMACY_VERIFY,
  ],

  // Admin receives every capability
  admin: Object.values(CAP) as Capability[],
};

// ---------------------------------------------------------------------------
// Route guard configuration
// ---------------------------------------------------------------------------

type RouteGuard = {
  pattern: string;
  requireAnyCap: Capability[];
  unauthorizedRedirect: string;
  requireAuth: boolean;
};

const ROUTE_GUARDS: RouteGuard[] = [
  {
    pattern: "/admin",
    requireAnyCap: [
      CAP.REPORT_VIEW,
      CAP.AUDIT_VIEW,
      CAP.USER_MANAGE,
      CAP.PROVIDER_MANAGE,
      CAP.AGENTS_VIEW,
      CAP.SETTINGS_VIEW,
    ],
    unauthorizedRedirect: "/dashboard",
    requireAuth: true,
  },
  {
    pattern: "/provider",
    requireAnyCap: [
      CAP.PATIENT_VIEW,
      CAP.RX_WRITE,
      CAP.CONSULT_START,
      CAP.WORKFLOW_VIEW,
    ],
    unauthorizedRedirect: "/dashboard",
    requireAuth: true,
  },
  {
    pattern: "/pharmacy",
    requireAnyCap: [CAP.PHARMACY_QUEUE, CAP.PHARMACY_FILL],
    unauthorizedRedirect: "/dashboard",
    requireAuth: true,
  },
  {
    pattern: "/consultation",
    requireAnyCap: [CAP.CONSULT_JOIN, CAP.CONSULT_START],
    unauthorizedRedirect: "/dashboard",
    requireAuth: true,
  },
  {
    pattern: "/dashboard",
    requireAnyCap: [CAP.VIEW_DASHBOARD],
    unauthorizedRedirect: "/",
    requireAuth: true,
  },
  {
    pattern: "/intake",
    requireAnyCap: [CAP.INTAKE_SELF, CAP.INTAKE_REVIEW],
    unauthorizedRedirect: "/",
    requireAuth: true,
  },
  {
    pattern: "/start",
    requireAnyCap: [CAP.VIEW_DASHBOARD],
    unauthorizedRedirect: "/",
    requireAuth: true,
  },
  {
    pattern: "/workflows",
    requireAnyCap: [CAP.WORKFLOW_VIEW],
    unauthorizedRedirect: "/dashboard",
    requireAuth: true,
  },
  {
    pattern: "/messages",
    requireAnyCap: [CAP.MSG_VIEW],
    unauthorizedRedirect: "/",
    requireAuth: true,
  },
];

// Routes that also require active payment for patients (providers/admins exempt)
const PAID_PATTERNS = ["/dashboard", "/start"];

// Auth routes: redirect authenticated users away
const AUTH_ROUTES = ["/access", "/login", "/register"];

// Onboarding routes: the only paths unverified users may access
const ONBOARD_ROUTES = ["/onboard"];

const SESSION_COOKIE = "app_session";
const ADMIN_COOKIE = "app_admin";

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some((route) => {
    if (route.endsWith("*")) {
      return pathname.startsWith(route.slice(0, -1));
    }
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

function matchesGuard(pathname: string, guard: RouteGuard): boolean {
  return (
    pathname === guard.pattern ||
    pathname.startsWith(`${guard.pattern}/`)
  );
}

/**
 * Parse the session cookie and return the user's capability set.
 * Returns an empty set for missing, expired, or malformed cookies.
 */
function getSessionCaps(sessionCookie: string | undefined): Set<Capability> {
  if (!sessionCookie) return new Set();
  try {
    const session = JSON.parse(decodeURIComponent(sessionCookie));
    if (!session.email || !session.expiresAt || session.expiresAt < Date.now()) {
      return new Set();
    }
    const role = (session.role ?? "unverified") as Role;
    const caps = new Set<Capability>();
    for (const cap of ROLE_CAPS[role] ?? []) {
      caps.add(cap);
    }
    return caps;
  } catch {
    return new Set();
  }
}

function isValidSession(sessionCookie: string | undefined): boolean {
  if (!sessionCookie) return false;
  try {
    const session = JSON.parse(decodeURIComponent(sessionCookie));
    if (!session.email || !session.expiresAt) return false;
    return session.expiresAt >= Date.now();
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

function getSessionRole(sessionCookie: string | undefined): string | null {
  if (!sessionCookie) return null;
  try {
    const session = JSON.parse(decodeURIComponent(sessionCookie));
    return session.role ?? null;
  } catch {
    return null;
  }
}

function getSessionEmail(sessionCookie: string | undefined): string | null {
  if (!sessionCookie) return null;
  try {
    const session = JSON.parse(decodeURIComponent(sessionCookie));
    return session.email ?? null;
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

function isPaywallExempt(sessionCookie: string | undefined, hasAdminAccess: boolean): boolean {
  if (hasAdminAccess) return true;
  const role = getSessionRole(sessionCookie);
  return role === "provider" || role === "admin" || role === "nurse";
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

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

  // Auth bypass is allowed ONLY if explicitly enabled via AUTH_BYPASS_ALLOWED=true.
  // This flag must NEVER be set in production. The deploy script validates this.
  // NODE_ENV alone is NOT sufficient to bypass auth — protects staging environments.
  if (process.env.AUTH_BYPASS_ALLOWED === "true") {
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  const adminCookie = request.cookies.get(ADMIN_COOKIE)?.value;
  const hasValidSession = isValidSession(sessionCookie);
  const hasAdminAccess = isAdminSession(adminCookie);
  const role = getSessionRole(sessionCookie);
  const isUnverified = !hasValidSession || role === "unverified" || role === null;

  // --- Unverified users ---
  // A user with a valid session but no assigned role can ONLY access /onboard/*,
  // the home page, and auth routes. All other paths redirect to /onboard.
  if (hasValidSession && isUnverified && !hasAdminAccess) {
    if (
      matchesRoute(pathname, ONBOARD_ROUTES) ||
      pathname === "/" ||
      matchesRoute(pathname, AUTH_ROUTES)
    ) {
      const response = NextResponse.next();
      applySecurityHeaders(response);
      return response;
    }
    const onboardUrl = new URL("/onboard", request.url);
    const response = NextResponse.redirect(onboardUrl);
    applySecurityHeaders(response);
    return response;
  }

  // --- Auth routes ---
  // If the user is already authenticated, redirect them away.
  if (matchesRoute(pathname, AUTH_ROUTES)) {
    if (hasValidSession) {
      const redirectTo =
        request.nextUrl.searchParams.get("redirect") || "/portal";
      const response = NextResponse.redirect(new URL(redirectTo, request.url));
      applySecurityHeaders(response);
      return response;
    }
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  }

  // --- Capability-based route guards ---
  const matchedGuard = ROUTE_GUARDS.find((guard) =>
    matchesGuard(pathname, guard)
  );

  if (matchedGuard) {
    // Unauthenticated on a requireAuth route → send to /access
    if (matchedGuard.requireAuth && !hasValidSession) {
      const loginUrl = new URL("/access", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const response = NextResponse.redirect(loginUrl);
      applySecurityHeaders(response);
      return response;
    }

    // Check capabilities — admin cookie bypasses cap checks
    const userCaps = getSessionCaps(sessionCookie);
    const capsSatisfied =
      hasAdminAccess ||
      matchedGuard.requireAnyCap.some((cap) => userCaps.has(cap));

    if (!capsSatisfied) {
      const redirectUrl = new URL(matchedGuard.unauthorizedRedirect, request.url);
      const response = NextResponse.redirect(redirectUrl);
      applySecurityHeaders(response);
      return response;
    }

    // --- Paywall enforcement (patients only, on paid patterns) ---
    if (
      PAID_PATTERNS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) &&
      !isPaywallExempt(sessionCookie, hasAdminAccess) &&
      !hasActivePayment(sessionCookie)
    ) {
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

  // --- Public routes ---
  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
