/**
 * Client for the FastAPI matching service (see /ai-service).
 *
 * Behaviour
 *   - Talks to AI_MATCHING_URL with a Bearer AI_SERVICE_TOKEN.
 *   - Times out fast (default 800ms) so a slow ML service never stalls
 *     a user-facing request.
 *   - Returns null on any failure — the caller falls back to the local
 *     WeightedScoreMatching strategy so behaviour stays correct end-to-end
 *     even when the Python service is down.
 *
 * This is the integration point referenced in the resume description:
 * "Hybrid AI matching engine — TF-IDF + cosine similarity (content-based)
 *  and matrix factorization (collaborative filtering)".
 */

export interface AiFreelancer {
  id: string;
  full_name?: string;
  bio?: string;
  skills?: string[];
  location?: string;
  rating?: number;
}

export interface AiJob {
  id: string;
  title: string;
  description?: string;
  required_skills?: string[];
  location?: string;
}

export interface AiMatchScore {
  freelancer_id: string;
  score: number;
  rank: number;
  explanation: Record<string, number>;
}

export interface AiMatchResponse {
  job_id: string;
  strategy: "content" | "collaborative" | "hybrid";
  matches: AiMatchScore[];
}

type Strategy = "content" | "collaborative" | "hybrid";

const DEFAULT_TIMEOUT_MS = 800;

function aiConfig() {
  const base = process.env.AI_MATCHING_URL?.replace(/\/$/, "");
  const token = process.env.AI_SERVICE_TOKEN;
  if (!base || !token) return null;
  return { base, token };
}

async function postJson<T>(
  path: string,
  body: unknown,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<T | null> {
  const cfg = aiConfig();
  if (!cfg) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${cfg.base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function matchContent(
  job: AiJob,
  candidates: AiFreelancer[],
  topK = 10
): Promise<AiMatchResponse | null> {
  return postJson<AiMatchResponse>("/match/content", {
    job,
    candidates,
    top_k: topK,
  });
}

export async function matchHybrid(
  job: AiJob,
  candidates: AiFreelancer[],
  clientId: string | null,
  topK = 10
): Promise<AiMatchResponse | null> {
  return postJson<AiMatchResponse>("/match/hybrid", {
    job,
    candidates,
    client_id: clientId,
    top_k: topK,
  });
}

export async function matchCollaborative(
  clientId: string,
  candidates: string[] | null = null,
  topK = 10
): Promise<AiMatchResponse | null> {
  return postJson<AiMatchResponse>("/match/collaborative", {
    client_id: clientId,
    candidates,
    top_k: topK,
  });
}

export async function aiHealth(): Promise<{
  status: string;
  cf_model_trained: boolean;
} | null> {
  const cfg = aiConfig();
  if (!cfg) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 400);
  try {
    const res = await fetch(`${cfg.base}/health`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as { status: string; cf_model_trained: boolean };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function strategyFor(env = process.env): Strategy {
  const v = (env.AI_MATCH_STRATEGY || "hybrid").toLowerCase();
  if (v === "content" || v === "collaborative" || v === "hybrid") return v;
  return "hybrid";
}
