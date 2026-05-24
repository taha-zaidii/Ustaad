/**
 * /api/jobs/[id]/matches
 *
 * Returns a ranked list of freelancer candidates for a given job. The
 * route is intentionally thin: it loads the job + candidate set from
 * Postgres and hands them to the MatchingFacade, which picks the best
 * available engine (remote scikit-learn → local Strategy → SQL
 * heuristic) and returns a uniform result shape.
 *
 * Only authenticated users can call this. Profile data returned is
 * already public (name, location, rating, skills) — no PII leaks.
 *
 * SRS: REQ-3.2 (matching).
 * Patterns:
 *   - Facade   (lib/patterns/MatchingFacade) — multi-engine orchestration
 *   - Adapter  (lib/ai/client)               — wraps remote FastAPI
 *   - Strategy (lib/patterns/MatchingStrategy) — in-process ranking
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { MatchingFacade } from "@/lib/patterns/MatchingFacade";

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
      id: String(c.id),
      clerkId: c.clerk_id,
      fullName: c.full_name,
      bio: c.bio,
      skills: (c.skills || []).filter(Boolean),
      location: c.location,
      rating: c.rating ? Number(c.rating) : 0,
    }));

    const facade = new MatchingFacade();
    const result = await facade.rank({
      job: {
        id: String(job.id),
        title: job.title || job.category_name || "job",
        description: job.description || undefined,
        category: job.category_name || undefined,
        location: job.location || undefined,
        requiredSkills: (job.required_skills || []).filter(Boolean),
        clientClerkId: job.client_clerk_id,
      },
      candidates,
      topK,
    });

    const byKey = new Map(
      candResult.rows.map((c) => [String(c.clerk_id || c.id), c])
    );

    const matches = result.matches
      .map((m) => {
        const row = byKey.get(m.freelancerId);
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
          score: m.score,
          rank: m.rank,
          explanation: m.explanation,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    return NextResponse.json({
      matches,
      engine: result.engine,
      strategy: result.strategy,
    });
  } catch (error) {
    console.error("[/api/jobs/[id]/matches] error:", error);
    return NextResponse.json(
      { error: "Failed to compute matches" },
      { status: 500 }
    );
  }
}
