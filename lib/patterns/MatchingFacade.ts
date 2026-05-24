/**
 * FACADE PATTERN — Unified worker-matching entrypoint
 *
 * Intent
 *   Hide the multi-engine matching flow behind a single high-level call.
 *   Route handlers do not have to know whether the rank came from the
 *   remote scikit-learn service, the local Strategy-pattern WeightedScore
 *   ranker, or a heuristic SQL fallback — they ask the facade for the
 *   top-K and get back a uniform `RankedMatch[]`.
 *
 * Subsystems coordinated:
 *   - lib/ai/client.ts            — remote FastAPI recommender
 *   - lib/patterns/MatchingStrategy.ts — in-process WeightedScoreMatching
 *   - inline SQL heuristic        — last-resort cold-cache ranking
 *
 * Why a Facade here
 *   The "try AI → fallback → fallback" logic was originally inlined in
 *   /app/api/jobs/[id]/matches/route.ts. Extracting it means:
 *     1. The route shrinks to data fetch + facade call + response shape.
 *     2. The fallback chain is unit-testable in isolation.
 *     3. Swapping in a different recommender (e.g. a separate ranking
 *        API) only requires editing this one file.
 *
 * SRS reference: DC-2 — pattern #10.
 */
import {
  matchHybrid,
  matchContent,
  strategyFor,
  type AiJob,
  type AiFreelancer,
  type AiMatchResponse,
} from "@/lib/ai/client";
import {
  WeightedScoreMatching,
  type JobBrief,
  type FreelancerProfile,
} from "@/lib/patterns/MatchingStrategy";

export type MatchEngine = "ai-service" | "local-strategy" | "sql-heuristic";

export interface RankedMatch {
  freelancerId: string;
  rank:         number;
  score:        number;          // 0..100
  explanation:  Record<string, number | string>;
}

export interface MatchingFacadeInput {
  job: {
    id:              string;
    title:           string;
    description?:    string;
    category?:       string;
    location?:       string;
    requiredSkills?: string[];
    clientClerkId?:  string | null;
  };
  candidates: {
    id:              string;
    clerkId?:        string | null;
    fullName?:       string | null;
    bio?:            string | null;
    skills?:         string[];
    location?:       string | null;
    rating?:         number;
    hourlyRate?:     number | string | null;
    acceptanceRate?: number;
    responseMins?:   number;
  }[];
  topK?: number;
}

export interface MatchingFacadeResult {
  engine:   MatchEngine;
  strategy: string;
  matches:  RankedMatch[];
}

export class MatchingFacade {
  /**
   * Rank candidates for a job. Tries each backend in order and returns
   * the first one that yields a non-empty ranking.
   */
  async rank(input: MatchingFacadeInput): Promise<MatchingFacadeResult> {
    const topK = Math.min(Math.max(input.topK ?? 10, 1), 50);

    const ai = await this.tryAiService(input, topK);
    if (ai) return ai;

    const local = this.tryLocalStrategy(input, topK);
    if (local.matches.length > 0) return local;

    return this.sqlHeuristic(input, topK);
  }

  // ── AI service (preferred) ────────────────────────────────────────────
  private async tryAiService(
    input: MatchingFacadeInput,
    topK: number
  ): Promise<MatchingFacadeResult | null> {
    const aiJob: AiJob = {
      id:              input.job.id,
      title:           input.job.title || input.job.category || "job",
      description:     input.job.description,
      required_skills: input.job.requiredSkills,
      location:        input.job.location,
    };
    const aiCandidates: AiFreelancer[] = input.candidates.map((c) => ({
      id:        c.clerkId || c.id,
      full_name: c.fullName ?? undefined,
      bio:       c.bio ?? undefined,
      skills:    (c.skills || []).filter(Boolean),
      location:  c.location ?? undefined,
      rating:    c.rating,
    }));

    const resp: AiMatchResponse | null =
      strategyFor() === "content"
        ? await matchContent(aiJob, aiCandidates, topK)
        : await matchHybrid(aiJob, aiCandidates, input.job.clientClerkId ?? null, topK);

    if (!resp || resp.matches.length === 0) return null;

    return {
      engine:   "ai-service",
      strategy: resp.strategy,
      matches:  resp.matches.map((m) => ({
        freelancerId: m.freelancer_id,
        rank:         m.rank,
        score:        Math.round(m.score * 100),
        explanation:  m.explanation,
      })),
    };
  }

  // ── Local Strategy (in-process) ───────────────────────────────────────
  private tryLocalStrategy(
    input: MatchingFacadeInput,
    topK: number
  ): MatchingFacadeResult {
    const strategy = new WeightedScoreMatching();
    const job: JobBrief = {
      id:        input.job.id,
      category:  input.job.category || "",
      location:  input.job.location || "",
      budgetMin: 0,
      budgetMax: 0,
      urgent:    false,
    };
    const candidates: FreelancerProfile[] = input.candidates.map((c) => ({
      id:             c.clerkId || c.id,
      skills:         c.skills || [],
      location:       c.location || "",
      rating:         c.rating ?? 0,
      responseMins:   c.responseMins ?? 30,
      acceptanceRate: c.acceptanceRate ?? 0.5,
      hourlyRate:     Number(c.hourlyRate) || 0,
    }));

    const ranked = strategy.rank(job, candidates).slice(0, topK);
    return {
      engine:   "local-strategy",
      strategy: strategy.name,
      matches:  ranked.map((r, idx) => ({
        freelancerId: r.freelancerId,
        rank:         idx + 1,
        score:        r.score,
        explanation:  { detail: r.explanation },
      })),
    };
  }

  // ── SQL-style heuristic (last resort) ─────────────────────────────────
  private sqlHeuristic(
    input: MatchingFacadeInput,
    topK: number
  ): MatchingFacadeResult {
    const required = (input.job.requiredSkills || [])
      .map((s) => s.toLowerCase())
      .filter(Boolean);
    const jobLoc = (input.job.location || "").trim().toLowerCase();

    const ranked = input.candidates
      .map((c) => {
        const skills = (c.skills || []).map((s) => s.toLowerCase());
        const overlap =
          required.length > 0
            ? required.filter((s) => skills.includes(s)).length / required.length
            : 0;
        const locHit =
          jobLoc && c.location && c.location.trim().toLowerCase() === jobLoc ? 1 : 0;
        const rating = Math.min(5, c.rating ?? 0) / 5;
        const score = 0.5 * overlap + 0.25 * locHit + 0.25 * rating;
        return { c, score, overlap, locHit, rating };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return {
      engine:   "sql-heuristic",
      strategy: strategyFor(),
      matches:  ranked.map((r, idx) => ({
        freelancerId: r.c.clerkId || r.c.id,
        rank:         idx + 1,
        score:        Math.round(r.score * 100),
        explanation:  {
          skill_overlap:  Number(r.overlap.toFixed(3)),
          location_match: r.locHit,
          rating_norm:    Number(r.rating.toFixed(3)),
        },
      })),
    };
  }
}
