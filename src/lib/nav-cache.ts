/**
 * Server-only in-memory cache for the sidenav tree built from
 * GET /api/authorization?isMobile=false.
 *
 * Angular keeps modules/pages on the login user (localStorage) so refresh is
 * instant. Iron Session cannot hold that payload (cookie ~4KB), so we cache
 * the built NavItem[] here keyed by userId + session issuedAt.
 *
 * - Populated once at login (and on cache miss in the protected layout)
 * - Cleared on logout
 * - TTL matches the iron-session lifetime (6h)
 */
import type { NavItem } from "@/types/navigation";

type CacheEntry = {
  navItems: NavItem[];
  storedAt: number;
};

const TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

const NAV_TREE_VERSION = 2;

function key(userId: number, issuedAt: number): string {
  return `${NAV_TREE_VERSION}:${userId}:${issuedAt}`;
}

export function getCachedNav(
  userId: number,
  issuedAt: number,
): NavItem[] | null {
  const entry = cache.get(key(userId, issuedAt));
  if (!entry) return null;
  if (Date.now() - entry.storedAt > TTL_MS) {
    cache.delete(key(userId, issuedAt));
    return null;
  }
  return entry.navItems;
}

export function setCachedNav(
  userId: number,
  issuedAt: number,
  navItems: NavItem[],
): void {
  cache.set(key(userId, issuedAt), {
    navItems,
    storedAt: Date.now(),
  });
}

export function clearCachedNav(userId: number, issuedAt?: number): void {
  if (issuedAt != null) {
    cache.delete(key(userId, issuedAt));
    return;
  }
  const needle = `:${userId}:`;
  for (const k of cache.keys()) {
    if (k.includes(needle) || k.startsWith(`${userId}:`)) cache.delete(k);
  }
}
