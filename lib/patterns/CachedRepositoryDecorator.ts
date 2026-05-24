/**
 * DECORATOR PATTERN — Cache-aside layer over a repository
 *
 * Intent
 *   Add cache-aside behaviour to any repository's read methods at the
 *   boundary, without modifying the repository itself or the consumers
 *   that call it. The decorator forwards writes straight through and
 *   invalidates the namespace so the next read repopulates the cache.
 *
 * Why a Decorator here
 *   Repositories must stay focused on persistence; baking cache logic
 *   into every read method couples two concerns and breaks the unit-
 *   test isolation of the repository. The Decorator preserves the
 *   underlying repository's interface so consumers cannot tell they're
 *   talking to a cached version — which means the cache can be turned
 *   on/off per environment with one constructor swap.
 *
 *   This composes with Cache-Aside (lib/cache/cacheAside.ts), which is
 *   the algorithm; this file is the *binding* between that algorithm
 *   and the Repository pattern (lib/repositories/*).
 *
 * SRS reference: DC-2 — pattern #11.
 */
import { cachedRead, bumpNamespace } from "@/lib/cache/cacheAside";
import { JobRepository, type JobFilter, type JobRow } from "@/lib/repositories/JobRepository";

const NAMESPACE = "jobs";
const READ_TTL_SECONDS = 60;

function filterKey(filter: JobFilter): string {
  const parts: string[] = [];
  if (filter.category) parts.push(`cat=${filter.category}`);
  if (filter.location) parts.push(`loc=${filter.location}`);
  if (filter.search)   parts.push(`q=${filter.search}`);
  if (typeof filter.limit  === "number") parts.push(`lim=${filter.limit}`);
  if (typeof filter.offset === "number") parts.push(`off=${filter.offset}`);
  return parts.length ? `list:${parts.join("&")}` : "list";
}

/**
 * Wraps a JobRepository so reads pass through cache-aside and writes
 * bump the namespace version (invalidating every cached read in O(1)).
 */
export class CachedJobRepository {
  constructor(private readonly inner: JobRepository = new JobRepository()) {}

  async findOpen(filter: JobFilter = {}): Promise<JobRow[]> {
    return cachedRead({
      namespace: NAMESPACE,
      key:       filterKey(filter),
      ttlSeconds: READ_TTL_SECONDS,
      loader:    () => this.inner.findOpen(filter),
    });
  }

  async findById(id: string): Promise<JobRow | null> {
    return cachedRead({
      namespace: NAMESPACE,
      key:       `id:${id}`,
      ttlSeconds: READ_TTL_SECONDS,
      loader:    () => this.inner.findById(id),
    });
  }

  /** Forwarded write path; invalidates the cache by bumping the version. */
  async create(input: Parameters<JobRepository["create"]>[0]) {
    const result = await this.inner.create(input);
    await bumpNamespace(NAMESPACE);
    return result;
  }
}
