# Production latency benchmark

- **Target:** https://ustaad-pk.vercel.app
- **Captured:** 2026-05-24T16:00:37.214Z
- **Samples / endpoint:** 80 (after 10 warm-up)
- **Method:** node p95-benchmark.js (sequential, no concurrency)

## Preconditions

- **Redis cache:** attached & reachable (407ms PING)
- **AI matching service:** attached & reachable (8ms /health)

| Endpoint | n | p50 | p95 | p99 | min | max | errors |
|---|---:|---:|---:|---:|---:|---:|---:|
| GET / | 80 | 142ms | 219ms | 1091ms | 127ms | 1091ms | 0 |
| GET /browse-jobs | 80 | 148ms | 718ms | 1421ms | 126ms | 1421ms | 0 |
| GET /freelancers | 80 | 138ms | 808ms | 1961ms | 124ms | 1961ms | 0 |
| GET /api/jobs | 80 | 618ms | 839ms | 953ms | 570ms | 953ms | 0 |
| GET /api/freelancers | 80 | 618ms | 821ms | 921ms | 568ms | 921ms | 0 |
| GET /api/categories | 80 | 597ms | 765ms | 940ms | 555ms | 940ms | 0 |

## Resume claim — p95 < 200ms

| Surface | Worst p95 | Status |
|---|---:|:---:|
| HTML pages (`/`, `/browse-jobs`, `/freelancers`) | 808ms | **MISSED** |
| API routes (`/api/*`) | 839ms | **MISSED** |

Run again with: `npm run bench:p95` (override target: `node scripts/p95-benchmark.js <url>`).
