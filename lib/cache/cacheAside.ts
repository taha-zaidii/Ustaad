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
 */
import { getRedis } from "./redis";

const DEFAULT_TTL_SECONDS = 60;

async function getNamespaceVersion(ns: string): Promise<string> {
  const r = getRedis();
  if (!r) return "0";
  try {
    const key = `nsver:${ns}`;
    const cur = await r.get(key);
    if (cur) return cur;
    // Initialize with current timestamp so a brand-new namespace has a
    // stable, monotonically increasing baseline.
    const init = String(Date.now());
    await r.set(key, init);
    return init;
  } catch {
    return "0";
  }
}

export async function bumpNamespace(ns: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(`nsver:${ns}`, String(Date.now()));
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
    const hit = await r.get(fullKey);
    if (hit) {
      return JSON.parse(hit) as T;
    }
  } catch {
    /* fall through to loader */
  }

  const value = await opts.loader();
  try {
    await r.set(
      fullKey,
      JSON.stringify(value),
      "EX",
      opts.ttlSeconds ?? DEFAULT_TTL_SECONDS
    );
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
