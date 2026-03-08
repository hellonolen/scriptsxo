import { Env } from '../types';

export async function checkRateLimit(
  env: Env,
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const windowKey = `rl:${key}:${Math.floor(now / windowMs)}`;
  const current = parseInt(await env.CACHE.get(windowKey) ?? '0');

  if (current >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  await env.CACHE.put(windowKey, String(current + 1), {
    expirationTtl: Math.ceil(windowMs / 1000) + 1,
  });

  return { allowed: true, remaining: maxRequests - current - 1 };
}
