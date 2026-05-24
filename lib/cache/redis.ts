/**
 * Upstash Redis (REST) singleton with graceful degradation.
 *
 * Uses @upstash/redis — HTTPS REST client, no persistent TCP connection,
 * which is the right choice for Vercel serverless functions. It also
 * works on the Edge runtime if we ever move endpoints there.
 *
 * When UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN are unset
 * (e.g. local dev with no cache, preview branches) we return null and
 * every helper short-circuits to the underlying loader. This keeps the
 * app fully functional without a cache.
 *
 * Why REST not ioredis: serverless functions cannot reliably reuse a
 * TCP connection across cold starts; ioredis ends up reopening sockets
 * on every invocation which actually makes things slower than the
 * Upstash REST roundtrip (single HTTPS request to a regional edge).
 */
import { Redis } from "@upstash/redis";

let client: Redis | null = null;
let configured = false;

export function getRedis(): Redis | null {
  if (configured) return client;
  configured = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    client = null;
    return null;
  }

  try {
    client = new Redis({ url, token });
  } catch (err) {
    console.warn("[cache] upstash init failed:", (err as Error).message);
    client = null;
  }
  return client;
}
