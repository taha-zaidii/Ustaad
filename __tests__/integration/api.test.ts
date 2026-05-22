/**
 * Integration tests — hit a running dev server.
 *
 * Run with:
 *   npm run dev          # in one terminal
 *   npm run test:integration  # in another
 *
 * These tests deliberately do NOT mock the network. They prove every
 * public route returns the right status code, the right shape, and
 * that auth-protected routes refuse anonymous traffic.
 */

const BASE = process.env.USTAAD_BASE_URL ?? "http://localhost:3000";

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`);
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, body };
}

async function post(path: string, payload: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* empty */
  }
  return { status: res.status, body };
}

beforeAll(async () => {
  // Ping once to make sure the server is reachable. Fail fast & clearly
  // if the user forgot to start `npm run dev`.
  try {
    const res = await fetch(BASE, { method: "GET" });
    if (!res.ok && res.status !== 307 && res.status !== 308) {
      throw new Error(`Dev server returned ${res.status} on GET /`);
    }
  } catch (e) {
    throw new Error(
      `Cannot reach dev server at ${BASE}. ` +
        `Run \`npm run dev\` in another terminal first.\nUnderlying error: ${
          (e as Error).message
        }`
    );
  }
}, 15_000);

describe("/api/categories", () => {
  test("returns the list of seeded categories", async () => {
    const { status, body } = await get("/api/categories");
    expect(status).toBe(200);
    expect(body).toHaveProperty("categories");
    const cats = (body as { categories: unknown[] }).categories;
    expect(Array.isArray(cats)).toBe(true);
    expect(cats.length).toBeGreaterThanOrEqual(1);
    // Each category has the expected projection shape
    const first = cats[0] as Record<string, unknown>;
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("title");
    expect(first).toHaveProperty("slug");
  });
});

describe("/api/jobs", () => {
  test("returns { jobs, count } for the public job board", async () => {
    const { status, body } = await get("/api/jobs");
    expect(status).toBe(200);
    expect(body).toHaveProperty("jobs");
    expect(body).toHaveProperty("count");
    expect(Array.isArray((body as { jobs: unknown[] }).jobs)).toBe(true);
  });

  test("filter parameters are accepted (category / location / search)", async () => {
    for (const q of [
      "?category=plumbing",
      "?location=karachi",
      "?search=pani",
      "?limit=5&offset=0",
    ]) {
      const { status } = await get(`/api/jobs${q}`);
      expect(status).toBe(200);
    }
  });
});

describe("/api/freelancers", () => {
  test("returns the public freelancer directory", async () => {
    const { status, body } = await get("/api/freelancers");
    expect(status).toBe(200);
    expect(body).toHaveProperty("freelancers");
    expect(
      Array.isArray((body as { freelancers: unknown[] }).freelancers)
    ).toBe(true);
  });
});

describe("Auth-protected routes refuse anonymous traffic", () => {
  test.each([
    ["GET", "/api/profile"],
    ["GET", "/api/my-jobs"],
    ["GET", "/api/freelancers/match?jobId=00000000-0000-0000-0000-000000000000"],
    ["GET", "/api/proposals?jobId=00000000-0000-0000-0000-000000000000"],
  ])("%s %s returns 401", async (_m, path) => {
    const { status } = await get(path);
    expect(status).toBe(401);
  });

  test("POST /api/jobs/create with no session returns 401", async () => {
    const { status } = await post("/api/jobs/create", { title: "x" });
    expect(status).toBe(401);
  });

  test("POST /api/proposals with no session returns 401", async () => {
    const { status } = await post("/api/proposals", {
      jobId: "x",
      coverLetter: "y",
      proposedBudget: 1,
    });
    expect(status).toBe(401);
  });

  test("POST /api/profile/switch-role with no session returns 401", async () => {
    const { status } = await post("/api/profile/switch-role", {
      role: "client",
    });
    expect(status).toBe(401);
  });
});
