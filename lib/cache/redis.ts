/**
 * Redis singleton with graceful degradation.
 *
 * When REDIS_URL is unset (e.g. local dev without a Redis container,
 * or a Vercel preview without the env attached) we return null and
 * every caching helper short-circuits to the underlying loader. This
 * keeps the app fully functional without a cache and means the same
 * code path runs in dev, staging, and prod.
 */
import Redis from "ioredis";

let client: Redis | null = null;
let configured = false;

export function getRedis(): Redis | null {
  if (configured) return client;
  configured = true;

  const url = process.env.REDIS_URL;
  if (!url) {
    client = null;
    return null;
  }

  try {
    client = new Redis(url, {
      // Don't block API routes if Redis is unreachable; fail open.
      maxRetriesPerRequest: 1,
      connectTimeout: 800,
      commandTimeout: 400,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    client.on("error", (err) => {
      // Single line; ioredis can emit per failed reconnect attempt.
      if ((err as NodeJS.ErrnoException).code !== "ECONNREFUSED") {
        console.warn("[cache] redis error:", err.message);
      }
    });
  } catch (err) {
    console.warn("[cache] redis init failed:", (err as Error).message);
    client = null;
  }
  return client;
}
