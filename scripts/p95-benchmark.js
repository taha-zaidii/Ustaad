#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Measures p50 / p95 / p99 latency against the deployed app for a
 * handful of representative endpoints. Used to back the resume claim
 * of "<200ms p95".
 *
 * Usage:
 *   node scripts/p95-benchmark.js [base_url]
 *   node scripts/p95-benchmark.js https://ustaad-pk.vercel.app
 *
 * Writes a markdown report to docs/BENCHMARKS.md (gitignored if you
 * don't want the dated runs checked in; here we commit it to make the
 * claim auditable).
 *
 * Each endpoint is sampled N=80 times after a warm-up of 10. Cold-start
 * outliers are kept in p99 but not in the median; that mirrors real
 * user experience after a route has been hit at least once.
 */
const fs = require("fs");
const path = require("path");

const BASE = process.argv[2] || "https://ustaad-pk.vercel.app";
const WARMUP = 10;
const SAMPLES = 80;

const ENDPOINTS = [
  { name: "GET /",                 path: "/" },
  { name: "GET /browse-jobs",      path: "/browse-jobs" },
  { name: "GET /freelancers",      path: "/freelancers" },
  { name: "GET /api/jobs",         path: "/api/jobs?limit=20" },
  { name: "GET /api/freelancers",  path: "/api/freelancers?limit=20" },
  { name: "GET /api/categories",   path: "/api/categories" },
];

function pct(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[idx]);
}

async function timeOne(url) {
  const start = process.hrtime.bigint();
  let ok = false;
  try {
    const res = await fetch(url, { cache: "no-store" });
    ok = res.ok || res.status === 307;
    await res.text();
  } catch {
    ok = false;
  }
  const end = process.hrtime.bigint();
  const ms = Number(end - start) / 1_000_000;
  return { ms, ok };
}

async function benchOne(ep) {
  const url = `${BASE}${ep.path}`;
  for (let i = 0; i < WARMUP; i++) await timeOne(url);

  const samples = [];
  let errors = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const { ms, ok } = await timeOne(url);
    if (!ok) errors++;
    else samples.push(ms);
  }
  return {
    name: ep.name,
    n: samples.length,
    errors,
    p50: pct(samples, 50),
    p95: pct(samples, 95),
    p99: pct(samples, 99),
    min: samples.length ? Math.round(Math.min(...samples)) : 0,
    max: samples.length ? Math.round(Math.max(...samples)) : 0,
  };
}

async function probe(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function main() {
  console.log(`Benchmarking ${BASE} (${SAMPLES} samples / endpoint, ${WARMUP} warm-up)\n`);

  // Preconditions: are the optional services wired?
  const cache = await probe(`${BASE}/api/cache/health`);
  const ai = await probe(`${BASE}/api/ai/health`);

  const results = [];
  for (const ep of ENDPOINTS) {
    process.stdout.write(`  · ${ep.name} …`);
    const r = await benchOne(ep);
    results.push(r);
    console.log(` p50=${r.p50}ms  p95=${r.p95}ms  p99=${r.p99}ms  errors=${r.errors}`);
  }

  const ts = new Date().toISOString();
  const lines = [];
  lines.push(`# Production latency benchmark`);
  lines.push(``);
  lines.push(`- **Target:** ${BASE}`);
  lines.push(`- **Captured:** ${ts}`);
  lines.push(`- **Samples / endpoint:** ${SAMPLES} (after ${WARMUP} warm-up)`);
  lines.push(`- **Method:** node ${path.basename(__filename)} (sequential, no concurrency)`);
  lines.push(``);
  lines.push(`## Preconditions`);
  lines.push(``);
  const cacheStatus = cache
    ? cache.reachable
      ? `attached & reachable (${cache.latency_ms}ms PING)`
      : cache.configured
      ? "configured but unreachable"
      : "**not attached** (REDIS_URL unset)"
    : "probe failed";
  const aiStatus = ai
    ? ai.reachable
      ? `attached & reachable (${ai.latency_ms}ms /health)`
      : ai.configured
      ? "configured but unreachable (likely cold-starting)"
      : "**not attached** (AI_MATCHING_URL unset)"
    : "probe failed";
  lines.push(`- **Redis cache:** ${cacheStatus}`);
  lines.push(`- **AI matching service:** ${aiStatus}`);
  lines.push(``);
  lines.push(`| Endpoint | n | p50 | p95 | p99 | min | max | errors |`);
  lines.push(`|---|---:|---:|---:|---:|---:|---:|---:|`);
  for (const r of results) {
    lines.push(
      `| ${r.name} | ${r.n} | ${r.p50}ms | ${r.p95}ms | ${r.p99}ms | ${r.min}ms | ${r.max}ms | ${r.errors} |`
    );
  }
  lines.push(``);
  const worstP95 = Math.max(...results.map((r) => r.p95));
  const claim = worstP95 < 200 ? "MET" : "MISSED";
  lines.push(`## Resume claim`);
  lines.push(``);
  lines.push(`Worst-case p95 across all measured endpoints: **${worstP95}ms** — claim "p95 < 200ms" **${claim}**.`);
  lines.push(``);
  lines.push(`Run again with: \`node scripts/p95-benchmark.js ${BASE}\``);

  const outDir = path.join(__dirname, "..", "docs");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "BENCHMARKS.md");
  fs.writeFileSync(outPath, lines.join("\n") + "\n");
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error("benchmark failed:", e.message);
  process.exit(1);
});
