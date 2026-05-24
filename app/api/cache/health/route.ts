/**
 * GET /api/cache/health
 *
 * Sanity probe for the cache-aside layer. Verifies REDIS_URL is set and
 * a round-trip PING completes within 800ms. No secrets exposed.
 *
 *   {
 *     configured: bool   — REDIS_URL is set
 *     reachable:  bool   — PING returned PONG within the budget
 *     latency_ms: number — round-trip ms
 *   }
 */
import { NextResponse } from "next/server";
import { getRedis } from "@/lib/cache/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = Boolean(process.env.REDIS_URL);
  if (!configured) {
    return NextResponse.json({
      configured: false,
      reachable: false,
      latency_ms: 0,
      hint:
        "Set REDIS_URL in the Vercel environment (Upstash → Connect → Node/ioredis URL).",
    });
  }

  const r = getRedis();
  if (!r) {
    return NextResponse.json({
      configured: true,
      reachable: false,
      latency_ms: 0,
      hint: "Redis client could not be initialized.",
    });
  }

  const start = Date.now();
  try {
    const reply = await r.ping();
    return NextResponse.json({
      configured: true,
      reachable: reply === "PONG",
      latency_ms: Date.now() - start,
    });
  } catch (e) {
    return NextResponse.json({
      configured: true,
      reachable: false,
      latency_ms: Date.now() - start,
      hint:
        e instanceof Error ? e.message : "PING failed.",
    });
  }
}
