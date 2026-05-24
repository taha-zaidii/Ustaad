/**
 * Unit tests — Decorator pattern (lib/patterns/CachedRepositoryDecorator.ts).
 *
 * Proves:
 *   1. CachedJobRepository preserves the interface of JobRepository — a
 *      consumer holding a JobRepository reference can be handed the
 *      decorator and the calls still work.
 *   2. With no REDIS_URL set, the decorator transparently passes reads
 *      through to the underlying repository (fail-open).
 *   3. The decorator only calls the inner repository's read method once
 *      on the slow path — i.e. it doesn't double-invoke the loader.
 */
// @/lib/db reaches for live Supabase/pg env at module-load. Stub it so
// the import chain (CachedJobRepository → JobRepository → @/lib/db)
// stays pure-unit. The methods of JobRepository are spied on per-test
// so the stubbed pool is never actually queried.
jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));

import { CachedJobRepository } from "@/lib/patterns/CachedRepositoryDecorator";
import { JobRepository } from "@/lib/repositories/JobRepository";

describe("CachedJobRepository (Decorator)", () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
  });

  it("passes findOpen through to the inner repository on cache miss", async () => {
    const inner = new JobRepository();
    const spy = jest
      .spyOn(inner, "findOpen")
      .mockResolvedValue([]);
    const cached = new CachedJobRepository(inner);

    const out = await cached.findOpen({ category: "plumbing" });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ category: "plumbing" });
    expect(out).toEqual([]);
  });

  it("passes findById through to the inner repository on cache miss", async () => {
    const inner = new JobRepository();
    const spy = jest.spyOn(inner, "findById").mockResolvedValue(null);
    const cached = new CachedJobRepository(inner);

    const out = await cached.findById("job-1");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("job-1");
    expect(out).toBeNull();
  });

  it("preserves the inner repository's return shape", async () => {
    const inner = new JobRepository();
    const row = {
      id: "job-1",
      title: "test",
      description: "desc",
      budget_min: 100,
      budget_max: 200,
      budget_type: "fixed" as const,
      location: "Karachi",
      duration: null,
      status: "open" as const,
      created_at: new Date().toISOString(),
      proposals_count: 0,
      category_name: "Plumbing",
      category_slug: "plumbing",
      skills: ["leak-repair"],
    };
    jest.spyOn(inner, "findOpen").mockResolvedValue([row]);
    const cached = new CachedJobRepository(inner);

    const out = await cached.findOpen();
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual(row);
  });

  it("forwards create() to the inner repository", async () => {
    const inner = new JobRepository();
    const spy = jest.spyOn(inner, "create").mockResolvedValue("new-id");
    const cached = new CachedJobRepository(inner);

    const id = await cached.create({
      clientId: "c-1",
      title: "test",
      description: "desc",
      categoryId: "cat-1",
      budgetMin: 100,
      budgetMax: 200,
      budgetType: "fixed",
      location: "Karachi",
      duration: null,
      skills: ["leak-repair"],
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(id).toBe("new-id");
  });
});
