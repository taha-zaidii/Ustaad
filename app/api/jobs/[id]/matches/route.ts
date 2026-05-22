/**
 * /api/jobs/[id]/matches
 *
 * Returns a ranked list of freelancer candidates for a given job, using
 * the hybrid AI recommender (TF-IDF + cosine + collaborative-filtering
 * signal). Falls back to a SQL-driven ranking when the AI service is
 * unreachable so the page never breaks.
 *
 * Only the client who owns the job (or any authenticated user, since
 * this is read-only and contains no PII beyond public profile data)
 * can call this.
 *
 * SRS: REQ-3.2 (matching).
 * Pattern: Adapter (lib/ai/client) wrapping a remote scikit-learn
 * service so the route stays oblivious to the underlying ML model.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { matchHybrid, strategyFor } from "@/lib/ai/client";

interface CandidateRow {
  id: string;
  clerk_id: string;
  full_name: string | null;
  bio: string | null;
  location: string | null;
  hourly_rate: string | null;
  rating: string | null;
  review_count: string | null;
  skills: string[] | null;
}

interface JobRow {
  id: string;
  title: string;
  description: string | null;
  category_name: string | null;
  location: string | null;
  client_clerk_id: string | null;
  required_skills: string[] | null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    if (!id)
      return NextResponse.json({ error: "Missing job id" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const topK = Math.min(
      Math.max(Number(searchParams.get("limit") ?? 10), 1),
      50
    );

    const jobResult = await pool.query<JobRow>(
      `SELECT j.id, j.title, j.description,
              c.name AS category_name,
              j.location,
              cp.clerk_id AS client_clerk_id,
              COALESCE(
                ARRAY(
                  SELECT s.name
                    FROM job_skills js
                    JOIN skills s ON s.id = js.skill_id
                   WHERE js.job_id = j.id
                ),
                ARRAY[]::text[]
              ) AS required_skills
         FROM jobs j
    LEFT JOIN categories c  ON j.category_id = c.id
    LEFT JOIN profiles  cp ON cp.id = j.client_id
        WHERE j.id = $1`,
      [id]
    );
    if (jobResult.rows.length === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    const job = jobResult.rows[0];

    const candResult = await pool.query<CandidateRow>(
      `SELECT
         p.id,
         p.clerk_id,
         p.full_name,
         p.bio,
         p.location,
         p.hourly_rate,
         COALESCE(AVG(r.rating), 0)::text AS rating,
         COUNT(DISTINCT r.id)::text AS review_count,
         ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) AS skills
       FROM profiles p
       LEFT JOIN reviews r ON p.id = r.freelancer_id
       LEFT JOIN freelancer_skills fs ON p.id = fs.profile_id
       LEFT JOIN skills s ON fs.skill_id = s.id
       WHERE p.user_type = 'freelancer'
       GROUP BY p.id
       LIMIT 200`
    );

    if (candResult.rows.length === 0) {
      return NextResponse.json({ matches: [], engine: "none", strategy: "n/a" });
    }

    const candidates = candResult.rows.map((c) => ({
      id: String(c.clerk_id || c.id),
      full_name: c.full_name || undefined,
      bio: c.bio || undefined,
      skills: (c.skills || []).filter(Boolean),
      location: c.location || undefined,
      rating: c.rating ? Number(c.rating) : undefined,
    }));

    const ai = await matchHybrid(
      {
        id: String(job.id),
        title: job.title || job.category_name || "job",
        description: job.description || undefined,
        required_skills: (job.required_skills || []).filter(Boolean),
        location: job.location || undefined,
      },
      candidates,
      job.client_clerk_id || null,
      topK
    );

    const byClerkId = new Map(
      candResult.rows.map((c) => [String(c.clerk_id || c.id), c])
    );

    if (ai && ai.matches.length > 0) {
      const matches = ai.matches
        .map((m) => {
          const row = byClerkId.get(m.freelancer_id);
          if (!row) return null;
          return {
            freelancer: {
              id: row.id,
              name: row.full_name,
              location: row.location,
              hourly_rate: row.hourly_rate,
              rating: Number(row.rating).toFixed(1),
              review_count: Number(row.review_count) || 0,
              skills: (row.skills || []).filter(Boolean),
            },
            score: Math.round(m.score * 100),
            rank: m.rank,
            explanation: m.explanation,
          };
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);

      return NextResponse.json({
        matches,
        engine: "ai-service",
        strategy: ai.strategy,
      });
    }

    // Fallback: SQL ranking by skill overlap + location + rating.
    const requiredSkills = (job.required_skills || [])
      .map((s) => s.toLowerCase())
      .filter(Boolean);
    const jobLoc = (job.location || "").trim().toLowerCase();

    const scored = candResult.rows
      .map((c) => {
        const skills = (c.skills || []).map((s) => s.toLowerCase());
        const overlap =
          requiredSkills.length > 0
            ? requiredSkills.filter((s) => skills.includes(s)).length /
              requiredSkills.length
            : 0;
        const locHit =
          jobLoc && c.location && c.location.trim().toLowerCase() === jobLoc
            ? 1
            : 0;
        const rating = Math.min(5, Number(c.rating) || 0) / 5;
        const score = 0.5 * overlap + 0.25 * locHit + 0.25 * rating;
        return { row: c, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return NextResponse.json({
      matches: scored.map((s, i) => ({
        freelancer: {
          id: s.row.id,
          name: s.row.full_name,
          location: s.row.location,
          hourly_rate: s.row.hourly_rate,
          rating: Number(s.row.rating).toFixed(1),
          review_count: Number(s.row.review_count) || 0,
          skills: (s.row.skills || []).filter(Boolean),
        },
        score: Math.round(s.score * 100),
        rank: i + 1,
        explanation: {},
      })),
      engine: "local-heuristic",
      strategy: strategyFor(),
    });
  } catch (error) {
    console.error("[/api/jobs/[id]/matches] error:", error);
    return NextResponse.json(
      { error: "Failed to compute matches" },
      { status: 500 }
    );
  }
}
