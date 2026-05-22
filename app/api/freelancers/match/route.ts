/**
 * /api/freelancers/match
 *
 * Computes an AI match score for the currently authenticated freelancer
 * against a specific job.
 *
 * Strategy
 *   1. Try the FastAPI matching service (TF-IDF + cosine, optionally
 *      blended with collaborative-filtering signal). See /ai-service.
 *   2. Fall back to the local WeightedScoreMatching strategy if the AI
 *      service is unreachable, returns an error, or isn't configured.
 *
 * Both paths return the same JSON shape so callers don't need to care
 * which engine produced the score.
 *
 * SRS reference: REQ-3.2 — matching scoring.
 * Design patterns: Strategy (MatchingContext), Adapter (lib/ai/client).
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import {
  MatchingContext,
  WeightedScoreMatching,
  type FreelancerProfile,
  type JobBrief,
} from "@/lib/patterns/MatchingStrategy";
import { matchContent } from "@/lib/ai/client";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    if (!jobId)
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });

    const jobResult = await pool.query(
      `SELECT j.id, j.title, j.description, j.budget_min, j.budget_max,
              c.slug AS category_slug, c.name AS category_name,
              j.location,
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
    LEFT JOIN categories c ON j.category_id = c.id
        WHERE j.id = $1`,
      [jobId]
    );
    if (jobResult.rows.length === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    const jobRow = jobResult.rows[0];

    const profileResult = await pool.query(
      `SELECT
         p.id, p.clerk_id, p.full_name, p.bio, p.location, p.hourly_rate,
         COALESCE(AVG(r.rating), 0) AS rating,
         p.success_rate,
         p.response_time,
         ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) AS skills
       FROM profiles p
       LEFT JOIN reviews r ON p.id = r.freelancer_id
       LEFT JOIN freelancer_skills fs ON p.id = fs.profile_id
       LEFT JOIN skills s ON fs.skill_id = s.id
       WHERE p.clerk_id = $1
       GROUP BY p.id`,
      [userId]
    );
    if (profileResult.rows.length === 0) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    const pr = profileResult.rows[0];
    const skills: string[] = (pr.skills || []).filter(Boolean);

    // 1) Try the AI service (content-based TF-IDF + cosine).
    const ai = await matchContent(
      {
        id: String(jobRow.id),
        title: jobRow.title || jobRow.category_name || "job",
        description: jobRow.description || undefined,
        required_skills: (jobRow.required_skills || []).filter(Boolean),
        location: jobRow.location || undefined,
      },
      [
        {
          id: String(pr.id),
          full_name: pr.full_name || undefined,
          bio: pr.bio || undefined,
          skills,
          location: pr.location || undefined,
          rating: Number(pr.rating) || undefined,
        },
      ],
      1
    );

    if (ai && ai.matches.length > 0) {
      const top = ai.matches[0];
      return NextResponse.json({
        match: {
          score: Math.round(top.score * 100),
          explanation:
            `cosine ${(top.explanation.cosine * 100).toFixed(0)}, ` +
            `skill_overlap ${(top.explanation.skill_overlap * 100).toFixed(0)}, ` +
            `location ${(top.explanation.location_match * 100).toFixed(0)}`,
          strategy: ai.strategy,
          engine: "ai-service",
        },
      });
    }

    // 2) Fallback: local weighted heuristic.
    const job: JobBrief = {
      id: jobRow.id,
      category: jobRow.category_slug || jobRow.category_name || "",
      location: jobRow.location || "",
      budgetMin: parseFloat(jobRow.budget_min) || 0,
      budgetMax: parseFloat(jobRow.budget_max) || 0,
      urgent: false,
    };
    const candidate: FreelancerProfile = {
      id: pr.id,
      skills,
      location: pr.location || "",
      rating: parseFloat(pr.rating) || 0,
      responseMins: 30,
      acceptanceRate: parseFloat(pr.success_rate) / 100 || 0,
      hourlyRate: parseFloat(pr.hourly_rate) || 0,
    };

    const context = new MatchingContext(new WeightedScoreMatching());
    const [result] = context.rank(job, [candidate]);
    return NextResponse.json({
      match: {
        score: result.score,
        explanation: result.explanation,
        strategy: context.currentStrategy,
        engine: "local-heuristic",
      },
    });
  } catch (error) {
    console.error("[/api/freelancers/match] error:", error);
    return NextResponse.json(
      { error: "Failed to compute match score" },
      { status: 500 }
    );
  }
}
