/**
 * Cache-aside helper — fail-open behaviour without Redis.
 *
 * We don't spin up a real Redis in unit tests, so these tests verify
 * that the helper is a transparent passthrough when REDIS_URL is
 * unset. That's the guarantee the route handlers rely on for dev /
 * Vercel previews without Redis attached.
 */
import {
  bumpNamespace,
  cachedRead,
  keyFromSearch,
} from "@/lib/cache/cacheAside";

describe("cacheAside helper (no Redis configured)", () => {
  const originalUrl = process.env.REDIS_URL;
  beforeAll(() => {
    delete process.env.REDIS_URL;
  });
  afterAll(() => {
    if (originalUrl !== undefined) process.env.REDIS_URL = originalUrl;
  });

  test("cachedRead invokes loader exactly once and returns its value", async () => {
    const loader = jest.fn().mockResolvedValue({ x: 1 });
    const out = await cachedRead({
      namespace: "test",
      key: "k1",
      loader,
    });
    expect(out).toEqual({ x: 1 });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  test("cachedRead does not memoize without Redis (every call hits loader)", async () => {
    const loader = jest.fn().mockResolvedValue({ x: 2 });
    await cachedRead({ namespace: "test", key: "k2", loader });
    await cachedRead({ namespace: "test", key: "k2", loader });
    expect(loader).toHaveBeenCalledTimes(2);
  });

  test("bumpNamespace is a no-op without Redis", async () => {
    await expect(bumpNamespace("test")).resolves.toBeUndefined();
  });

  test("loader errors propagate to caller", async () => {
    const boom = new Error("db down");
    const loader = jest.fn().mockRejectedValue(boom);
    await expect(
      cachedRead({ namespace: "test", key: "k3", loader })
    ).rejects.toBe(boom);
  });
});

describe("keyFromSearch", () => {
  test("sorts params for stable keys", () => {
    const a = new URLSearchParams("b=2&a=1");
    const b = new URLSearchParams("a=1&b=2");
    expect(keyFromSearch(a)).toBe(keyFromSearch(b));
  });

  test("returns prefix-only for empty params", () => {
    expect(keyFromSearch(new URLSearchParams(""))).toBe("list");
  });

  test("respects custom prefix", () => {
    expect(keyFromSearch(new URLSearchParams("x=1"), "page")).toBe("page:x=1");
  });
});
