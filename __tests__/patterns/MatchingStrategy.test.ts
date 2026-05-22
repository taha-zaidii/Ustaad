/**
 * Unit tests — Strategy pattern (lib/patterns/MatchingStrategy.ts).
 *
 * Proves:
 *   1. Both concrete strategies (RuleBased + WeightedScore) implement the
 *      MatchingStrategy interface and return ranked, ordered results.
 *   2. The MatchingContext can swap strategies at runtime — the rubric
 *      requirement for an A/B comparison.
 *   3. Each scorer's explanation string is non-empty and informative.
 */
import {
  RuleBasedMatching,
  WeightedScoreMatching,
  MatchingContext,
  type JobBrief,
  type FreelancerProfile,
} from "@/lib/patterns/MatchingStrategy";

const job: JobBrief = {
  id: "job-1",
  category: "plumbing",
  location: "Karachi",
  budgetMin: 1500,
  budgetMax: 5000,
  urgent: false,
};

const candidates: FreelancerProfile[] = [
  // Perfect match
  {
    id: "fl-perfect",
    skills: ["plumbing", "electrician"],
    location: "Karachi",
    rating: 4.8,
    responseMins: 10,
    acceptanceRate: 0.9,
    hourlyRate: 800,
  },
  // Skill-only match (wrong location)
  {
    id: "fl-skill-only",
    skills: ["plumbing"],
    location: "Lahore",
    rating: 4.0,
    responseMins: 60,
    acceptanceRate: 0.5,
    hourlyRate: 600,
  },
  // Location-only match (wrong skill)
  {
    id: "fl-loc-only",
    skills: ["painting"],
    location: "Karachi",
    rating: 3.5,
    responseMins: 30,
    acceptanceRate: 0.7,
    hourlyRate: 500,
  },
  // No match at all
  {
    id: "fl-no-match",
    skills: ["welding"],
    location: "Multan",
    rating: 2.0,
    responseMins: 120,
    acceptanceRate: 0.2,
    hourlyRate: 400,
  },
];

describe("MatchingStrategy — RuleBasedMatching", () => {
  const s = new RuleBasedMatching();

  test("returns one MatchScore per candidate", () => {
    const out = s.rank(job, candidates);
    expect(out).toHaveLength(candidates.length);
  });

  test("ranks the perfect match first", () => {
    const out = s.rank(job, candidates);
    expect(out[0].freelancerId).toBe("fl-perfect");
  });

  test("each score has a non-empty explanation string", () => {
    const out = s.rank(job, candidates);
    for (const r of out) expect(r.explanation.length).toBeGreaterThan(0);
  });

  test("scores are monotonically non-increasing (sorted)", () => {
    const out = s.rank(job, candidates);
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].score).toBeGreaterThanOrEqual(out[i].score);
    }
  });
});

describe("MatchingStrategy — WeightedScoreMatching", () => {
  const s = new WeightedScoreMatching();

  test("perfect match scores higher than no-match", () => {
    const out = s.rank(job, candidates);
    const perfect = out.find((r) => r.freelancerId === "fl-perfect")!;
    const noMatch = out.find((r) => r.freelancerId === "fl-no-match")!;
    expect(perfect.score).toBeGreaterThan(noMatch.score);
  });

  test("explanation surfaces every weighted dimension (skill, loc, rating, accept, resp)", () => {
    const out = s.rank(job, candidates);
    const e = out[0].explanation;
    expect(e).toMatch(/skill/);
    expect(e).toMatch(/loc/);
    expect(e).toMatch(/rating/);
    expect(e).toMatch(/accept/);
    expect(e).toMatch(/resp/);
  });

  test("scores live in 0..100", () => {
    const out = s.rank(job, candidates);
    for (const r of out) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });
});

describe("MatchingContext — runtime strategy swap", () => {
  test("default strategy is rule-based", () => {
    const ctx = new MatchingContext();
    expect(ctx.currentStrategy).toBe("rule-based");
  });

  test("setStrategy swaps the algorithm without changing the consumer call site", () => {
    const ctx = new MatchingContext(new RuleBasedMatching());
    const ruleResult = ctx.rank(job, candidates);

    ctx.setStrategy(new WeightedScoreMatching());
    expect(ctx.currentStrategy).toBe("weighted-score");
    const weightedResult = ctx.rank(job, candidates);

    // Same input → both strategies still rank the perfect match first
    expect(ruleResult[0].freelancerId).toBe("fl-perfect");
    expect(weightedResult[0].freelancerId).toBe("fl-perfect");

    // …but the score scales differ (rule-based isn't normalised to 100)
    expect(ruleResult[0].score).not.toBe(weightedResult[0].score);
  });
});
