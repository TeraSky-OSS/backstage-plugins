/**
 * Shared in-memory cache for HS256 session tokens.
 * This is a workaround since backend plugins can't directly import from each other.
 * Both auth-backend and spectrocloud-backend will use this shared cache.
 */

// Use a global variable to share the cache across plugins
const GLOBAL_CACHE_KEY = '__SPECTROCLOUD_TOKEN_CACHE__';

interface TokenCacheEntry {
  token: string;
  expiresAt: number;
}

function getGlobalCache(): Map<string, TokenCacheEntry> {
  if (!(global as any)[GLOBAL_CACHE_KEY]) {
    (global as any)[GLOBAL_CACHE_KEY] = new Map<string, TokenCacheEntry>();
  }
  return (global as any)[GLOBAL_CACHE_KEY];
}

/**
 * Store the HS256 session token for a user
 */
export function storeSessionToken(email: string, token: string, expiresAt: number): void {
  const cache = getGlobalCache();
  cache.set(email, { token, expiresAt });
}

/**
 * Get the HS256 session token for a user by email
 */
export function getSessionTokenByEmail(email: string): string | undefined {
  const cache = getGlobalCache();
  const entry = cache.get(email);
  
  if (!entry) {
    return undefined;
  }
  
  // Check if expired
  const now = Math.floor(Date.now() / 1000);
  if (now > entry.expiresAt) {
    cache.delete(email);
    return undefined;
  }
  
  return entry.token;
}
