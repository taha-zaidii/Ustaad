# Production latency benchmark

- **Target:** https://ustaad-pk.vercel.app
- **Captured:** 2026-05-24T00:56:54.207Z
- **Samples / endpoint:** 80 (after 10 warm-up)
- **Method:** node p95-benchmark.js (sequential, no concurrency)

## Preconditions

- **Redis cache:** **not attached** (REDIS_URL unset)
- **AI matching service:** **not attached** (AI_MATCHING_URL unset)

| Endpoint | n | p50 | p95 | p99 | min | max | errors |
|---|---:|---:|---:|---:|---:|---:|---:|
| GET / | 80 | 118ms | 154ms | 181ms | 111ms | 181ms | 0 |
| GET /browse-jobs | 80 | 114ms | 126ms | 163ms | 106ms | 163ms | 0 |
| GET /freelancers | 80 | 117ms | 155ms | 317ms | 108ms | 317ms | 0 |
| GET /api/jobs | 80 | 574ms | 671ms | 919ms | 541ms | 919ms | 0 |
| GET /api/freelancers | 80 | 582ms | 638ms | 657ms | 539ms | 657ms | 0 |
| GET /api/categories | 80 | 583ms | 716ms | 920ms | 537ms | 920ms | 0 |

## Resume claim — p95 < 200ms

| Surface | Worst p95 | Status |
|---|---:|:---:|
| HTML pages (`/`, `/browse-jobs`, `/freelancers`) | 155ms | **MET** |
| API routes (`/api/*`) | 716ms | **MISSED** |

### Why the API routes miss the claim

The cache-aside layer (`lib/cache/cacheAside.ts`) is implemented but `REDIS_URL` is not set in the Vercel environment, so every API request makes a Vercel→Supabase round-trip (≈550ms baseline). Attaching Upstash Redis (free tier) and re-running this script should drop API p95 below 50ms for cached endpoints. The cache key includes the search params and is invalidated by namespace-version bump on writes.

Run again with: `npm run bench:p95` (override target: `node scripts/p95-benchmark.js <url>`).
