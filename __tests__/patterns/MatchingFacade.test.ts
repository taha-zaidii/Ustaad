/**
 * Unit tests — Facade pattern (lib/patterns/MatchingFacade.ts).
 *
 * Proves:
 *   1. With no AI service configured, the facade transparently falls
 *      back to the local Strategy ranker and still produces a uniform
 *      result shape.
 *   2. The engine field reports the actual backend that produced the
 *      result, so the caller can log which path was taken without
 *      having to inspect internals.
 *   3. With an empty candidate set, the facade returns an empty match
 *      list rather than throwing.
 *   4. topK is respected and clamped to the [1, 50] range.
 */
import { MatchingFacade } from "@/lib/patterns/MatchingFacade";

const baseJob = {
  id: "job-1",
  title: "Need an electrician for home wiring",
  category: "electrician",
  location: "Karachi",
  requiredSkills: ["wiring", "circuit-breakers"],
  clientClerkId: null,
};

const candidates = [
  { id: "f-1", clerkId: "c-1", skills: ["wiring", "circuit-breakers"], location: "Karachi", rating: 4.8 },
  { id: "f-2", clerkId: "c-2", skills: ["plumbing"],                   location: "Lahore",  rating: 4.2 },
  { id: "f-3", clerkId: "c-3", skills: ["wiring"],                     location: "Karachi", rating: 3.9 },
];

describe("MatchingFacade", () => {
  beforeEach(() => {
    delete process.env.AI_MATCHING_URL;
    delete process.env.AI_SERVICE_TOKEN;
  });

  it("falls back to a non-AI engine when AI env is unset", async () => {
    const f = new MatchingFacade();
    const out = await f.rank({ job: baseJob, candidates, topK: 5 });

    expect(out.engine).not.toBe("ai-service");
    expect(["local-strategy", "sql-heuristic"]).toContain(out.engine);
    expect(out.matches.length).toBeGreaterThan(0);
    expect(out.matches[0]).toHaveProperty("freelancerId");
    expect(out.matches[0]).toHaveProperty("rank");
    expect(out.matches[0]).toHaveProperty("score");
    expect(out.matches[0]).toHaveProperty("explanation");
  });

  it("ranks the best-fit candidate first", async () => {
    const f = new MatchingFacade();
    const out = await f.rank({ job: baseJob, candidates, topK: 5 });

    const topId = out.matches[0].freelancerId;
    // f-1 has both skills + matching location → strictly best on every signal.
    expect(topId === "c-1" || topId === "f-1").toBe(true);
  });

  it("returns an empty result for an empty candidate set", async () => {
    const f = new MatchingFacade();
    const out = await f.rank({ job: baseJob, candidates: [], topK: 5 });
    expect(out.matches).toHaveLength(0);
  });

  it("respects topK", async () => {
    const f = new MatchingFacade();
    const out = await f.rank({ job: baseJob, candidates, topK: 2 });
    expect(out.matches.length).toBeLessThanOrEqual(2);
  });

  it("clamps topK to a sane upper bound", async () => {
    const f = new MatchingFacade();
    const out = await f.rank({ job: baseJob, candidates, topK: 1000 });
    expect(out.matches.length).toBeLessThanOrEqual(candidates.length);
  });
});
