/**
 * Shared OAuth2 client credentials token fetcher with in-memory caching.
 * Returns null when credentials are missing — never throws on missing config.
 */

import type { PayerConfig, TokenCache } from './types';

// In-memory token cache, keyed by payer key
const tokenCache = new Map<string, TokenCache>();

// Refresh tokens 60 seconds before they expire
const EXPIRY_BUFFER_MS = 60_000;

export async function getAccessToken(
  config: PayerConfig,
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  const cached = tokenCache.get(config.key);
  const now = Date.now();

  if (cached && cached.expiresAt - EXPIRY_BUFFER_MS > now) {
    return cached.accessToken;
  }

  try {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'system/*.read',
      }).toString(),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as Record<string, unknown>;
    const accessToken = data.access_token as string | undefined;
    const expiresIn = (data.expires_in as number | undefined) ?? 3600;

    if (!accessToken) {
      return null;
    }

    tokenCache.set(config.key, {
      accessToken,
      expiresAt: now + expiresIn * 1000,
    });

    return accessToken;
  } catch {
    return null;
  }
}
