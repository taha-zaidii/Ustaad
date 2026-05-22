/**
 * Unit tests — Singleton pattern (lib/patterns/Singleton.ts).
 *
 * The real Supabase client constructor reaches for WebSocket which Node 20
 * does not provide natively, so we mock @supabase/supabase-js to a tiny
 * stub. This keeps the Singleton tests pure-unit (no network, no realtime
 * polyfills) while still exercising:
 *   - global cache: getPool() returns the same instance.
 *   - HMR survival: a module reset + re-import returns the SAME object.
 *   - REST fallback: missing DATABASE_URL → Supabase adapter is built.
 *   - Hard error: no env vars at all → clear error message.
 */

jest.mock("@supabase/supabase-js", () => ({
  __esModule: true,
  createClient: jest.fn(() => ({
    rpc: jest.fn(async () => ({ data: [], error: null })),
  })),
}));

// pg's Pool constructor opens a TCP connection lazily, but the tests below
// never set DATABASE_URL so PgPoolWrapper is never instantiated. We still
// stub it for safety.
jest.mock("pg", () => ({
  __esModule: true,
  Pool: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    query: jest.fn(),
    connect: jest.fn(),
  })),
}));

describe("Singleton — getPool()", () => {
  beforeEach(() => {
    jest.resetModules();
    delete (globalThis as unknown as { __ustaadPool__?: unknown })
      .__ustaadPool__;
    delete process.env.DATABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fake-anon-key";
  });

  test("returns the same instance across repeated calls", async () => {
    const { getPool } = await import("@/lib/patterns/Singleton");
    const a = getPool();
    const b = getPool();
    expect(a).toBe(b);
  });

  test("caches via globalThis (survives logical 'module reload')", async () => {
    const { getPool: first } = await import("@/lib/patterns/Singleton");
    const a = first();

    jest.resetModules();
    const { getPool: second } = await import("@/lib/patterns/Singleton");
    const b = second();

    expect(a).toBe(b);
  });

  test("falls back to Supabase REST adapter when DATABASE_URL is missing", async () => {
    const { getPool } = await import("@/lib/patterns/Singleton");
    const pool = getPool();
    expect(typeof pool.query).toBe("function");
    expect(typeof pool.connect).toBe("function");
  });

  test("throws a clear error when no DB env vars are set at all", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete (globalThis as unknown as { __ustaadPool__?: unknown })
      .__ustaadPool__;
    jest.resetModules();
    // Importing the module triggers the eager `const pool = getPool()` at
    // file scope, so the error surfaces on import, not on the test's
    // explicit getPool() call. Either way: we expect a thrown Error whose
    // message mentions the missing env vars.
    await expect(import("@/lib/patterns/Singleton")).rejects.toThrow(
      /Missing env vars/
    );
  });
});
