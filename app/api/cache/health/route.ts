/**
 * GET /api/cache/health
 *
 * Sanity probe for the cache-aside layer (Upstash REST). Verifies the
 * env vars are set and a round-trip completes within budget. No
 * secrets exposed.
 *
 *   {
 *     configured: bool   — UPSTASH_REDIS_REST_URL + _TOKEN are set
 *     reachable:  bool   — round-trip SET+GET succeeded
 *     latency_ms: number — round-trip ms
 *   }
 */
import { NextResponse } from "next/server";
import { getRedis } from "@/lib/cache/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
  if (!configured) {
    return NextResponse.json({
      configured: false,
      reachable: false,
      latency_ms: 0,
      hint:
        "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in the Vercel environment (Upstash → REST API tab).",
    });
  }

  const r = getRedis();
  if (!r) {
    return NextResponse.json({
      configured: true,
      reachable: false,
      latency_ms: 0,
      hint: "Upstash client could not be initialized.",
    });
  }

  const start = Date.now();
  try {
    // @upstash/redis exposes ping; we use a SET+GET round-trip as a
    // stronger signal that the connection is fully functional.
    const probeKey = "health:probe";
    const probeVal = `t${start}`;
    await r.set(probeKey, probeVal, { ex: 30 });
    const back = await r.get<string>(probeKey);
    return NextResponse.json({
      configured: true,
      reachable: back === probeVal,
      latency_ms: Date.now() - start,
    });
  } catch (e) {
    return NextResponse.json({
      configured: true,
      reachable: false,
      latency_ms: Date.now() - start,
      hint: e instanceof Error ? e.message : "round-trip failed",
    });
  }
}
