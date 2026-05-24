/**
 * GET /api/ai/health
 *
 * Lightweight sanity probe for the FastAPI matching service. Used to
 * verify the AI_MATCHING_URL + AI_SERVICE_TOKEN wiring after deploying
 * the ai-service/ Space. Returns:
 *
 *   {
 *     configured: bool   — env vars are set
 *     reachable:  bool   — health endpoint replied 200 within 1500ms
 *     service:    { status, cf_model_trained } | null  — body from /health
 *     latency_ms: number — round-trip from Vercel to the AI service
 *   }
 *
 * Public on purpose — exposes no secrets, just a readiness signal.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const base = process.env.AI_MATCHING_URL?.replace(/\/$/, "");
  const token = process.env.AI_SERVICE_TOKEN;
  const configured = Boolean(base && token);

  if (!configured) {
    return NextResponse.json({
      configured: false,
      reachable: false,
      service: null,
      latency_ms: 0,
      hint:
        "Set AI_MATCHING_URL and AI_SERVICE_TOKEN in the Vercel environment.",
    });
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 1500);
  const start = Date.now();
  try {
    const res = await fetch(`${base}/health`, {
      signal: controller.signal,
      cache: "no-store",
    });
    const latency_ms = Date.now() - start;
    if (!res.ok) {
      return NextResponse.json({
        configured: true,
        reachable: false,
        service: null,
        latency_ms,
        hint: `Service replied ${res.status}.`,
      });
    }
    const body = (await res.json()) as {
      status: string;
      cf_model_trained: boolean;
      db_connected?: boolean;
      version?: string;
    };
    return NextResponse.json({
      configured: true,
      reachable: true,
      service: body,
      latency_ms,
    });
  } catch (e) {
    return NextResponse.json({
      configured: true,
      reachable: false,
      service: null,
      latency_ms: Date.now() - start,
      hint:
        e instanceof Error && e.name === "AbortError"
          ? "Timed out at 1500ms — the Space is likely cold-starting. Hit it once to warm it, then retry."
          : "Network error reaching the AI service.",
    });
  } finally {
    clearTimeout(t);
  }
}
