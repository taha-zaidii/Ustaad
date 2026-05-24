/**
 * Cache-aside (lazy loading) helper.
 *
 *   GET path: read from Redis → on miss, call loader, write back, return.
 *   PUT path: just bump a namespace version so old keys become unreachable.
 *
 * Why version-bump instead of explicit DEL:
 *   - list endpoints have many parameter combinations (search, location,
 *     pagination); enumerating their keys is fragile and racy. Storing
 *     the version in the key lets a single SET invalidate the entire
 *     namespace in O(1).
 *
 * All operations are fail-open: any Redis error returns the loader's
 * result so the user-facing path never breaks because of cache trouble.
 *
 * Implementation note: @upstash/redis auto-serializes JS values to JSON
 * on `set` and parses on `get`, so we pass objects directly instead of
 * round-tripping through JSON.stringify.
 */
import { getRedis } from "./redis";

const DEFAULT_TTL_SECONDS = 60;

// In-process version memoization. The cache key includes a namespace
// version so writes can invalidate the whole namespace in O(1) — but
// fetching that version on every read doubles the Upstash round-trips.
// Memoizing it per-Lambda-instance for a short TTL cuts the cache-hit
// path back down to one Upstash request. The trade-off is up to
// VERSION_MEMO_MS of staleness across Lambdas after a write; for a
// jobs marketplace this is invisible to users.
const VERSION_MEMO_MS = 3_000;
const versionMemo = new Map<string, { v: string; expiresAt: number }>();

async function getNamespaceVersion(ns: string): Promise<string> {
  const now = Date.now();
  const memo = versionMemo.get(ns);
  if (memo && memo.expiresAt > now) return memo.v;

  const r = getRedis();
  if (!r) {
    versionMemo.set(ns, { v: "0", expiresAt: now + VERSION_MEMO_MS });
    return "0";
  }

  try {
    const key = `nsver:${ns}`;
    const cur = await r.get<string | number>(key);
    if (cur !== null && cur !== undefined) {
      const v = String(cur);
      versionMemo.set(ns, { v, expiresAt: now + VERSION_MEMO_MS });
      return v;
    }
    // Initialize with current timestamp so a brand-new namespace has a
    // stable, monotonically increasing baseline.
    const init = String(now);
    await r.set(key, init);
    versionMemo.set(ns, { v: init, expiresAt: now + VERSION_MEMO_MS });
    return init;
  } catch {
    return "0";
  }
}

export async function bumpNamespace(ns: string): Promise<void> {
  const newVer = String(Date.now());
  // Update the local memo immediately so the writing instance sees the
  // invalidation on its very next read. Other instances will catch up
  // within VERSION_MEMO_MS.
  versionMemo.set(ns, { v: newVer, expiresAt: Date.now() + VERSION_MEMO_MS });
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(`nsver:${ns}`, newVer);
  } catch {
    /* fail open */
  }
}

export interface CachedReadOptions<T> {
  namespace: string;        // logical group, e.g. "jobs", "freelancers"
  key: string;              // hash of the route/query, e.g. "list:cat=plumbing"
  ttlSeconds?: number;      // default 60s
  loader: () => Promise<T>; // called on miss
}

export async function cachedRead<T>(opts: CachedReadOptions<T>): Promise<T> {
  const r = getRedis();
  if (!r) return opts.loader();

  const ver = await getNamespaceVersion(opts.namespace);
  const fullKey = `cache:${opts.namespace}:${ver}:${opts.key}`;

  try {
    const hit = await r.get<T>(fullKey);
    if (hit !== null && hit !== undefined) {
      return hit;
    }
  } catch {
    /* fall through to loader */
  }

  const value = await opts.loader();
  try {
    await r.set(fullKey, value as unknown as string, {
      ex: opts.ttlSeconds ?? DEFAULT_TTL_SECONDS,
    });
  } catch {
    /* fail open */
  }
  return value;
}

/** Build a stable key from a URL's search params. */
export function keyFromSearch(
  params: URLSearchParams,
  prefix = "list"
): string {
  const entries: [string, string][] = [];
  params.forEach((v, k) => entries.push([k, v]));
  entries.sort(([a], [b]) => a.localeCompare(b));
  const flat = entries.map(([k, v]) => `${k}=${v}`).join("&");
  return flat ? `${prefix}:${flat}` : prefix;
}
