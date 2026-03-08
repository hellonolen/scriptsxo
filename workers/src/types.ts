export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  CACHE: KVNamespace;
  ENVIRONMENT: string;
  WEBAUTHN_RP_ID: string;
  WEBAUTHN_ORIGIN: string;
  SESSION_TTL_MS: string;
  MAX_PASSKEYS_PER_USER: string;
  GEMINI_API_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_IDENTITY_WEBHOOK_SECRET: string;
  EMAILIT_API_KEY: string;
  ADMIN_EMAILS?: string;
}

export interface Session {
  id: string;
  sessionToken: string;
  memberId: string;
  email: string;
  createdAt: number;
  expiresAt: number;
  lastUsedAt?: number;
  userAgent?: string;
  ipAddress?: string;
}

export interface Member {
  id: string;
  email: string;
  role: string;
  orgRole?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  orgId?: string;
  isPlatformOwner?: number;
  capAllow?: string;
  capDeny?: string;
  status: string;
  permissions: string;
}

export interface RequestContext {
  session: Session | null;
  member: Member | null;
}

export interface ApiError {
  error: string;
  code?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: PaginationMeta;
}
