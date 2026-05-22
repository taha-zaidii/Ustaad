/**
 * /api/jobs — list open jobs with filters.
 *
 * Architecture
 *   This handler is the "Controller" in our MVC arrangement (cf. README §
 *   "Design Patterns"). It delegates persistence to JobRepository
 *   (Repository pattern), so this file knows nothing about pg, SQL, joins,
 *   or pooling. Swapping the persistence engine touches the repository
 *   only — never the route.
 *
 * SRS references
 *   REQ-2.1, REQ-2.5 (job discovery & filtering)
 *   REQ-NF-Sec-1   (parameterized queries — enforced inside repository)
 *   REQ-NF-Perf-1  (pagination — limit/offset enforced)
 */
import { NextResponse } from "next/server";
import { jobRepository } from "@/lib/repositories/JobRepository";
import { cachedRead, keyFromSearch } from "@/lib/cache/cacheAside";

function getRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(hours / 24);
  if (hours < 1)   return "Just now";
  if (hours < 24)  return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (days === 1)  return "1 day ago";
  return `${days} days ago`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams } = url;
  const filter = {
    category: searchParams.get("category")  ?? undefined,
    location: searchParams.get("location")  ?? undefined,
    search:   searchParams.get("search")    ?? undefined,
    limit:    Number(searchParams.get("limit")  ?? 20),
    offset:   Number(searchParams.get("offset") ?? 0),
  };

  try {
    const payload = await cachedRead({
      namespace: "jobs",
      key: keyFromSearch(searchParams),
      ttlSeconds: 60,
      loader: async () => {
        const rows = await jobRepository.findOpen(filter);
        const jobs = rows.map((row) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          budget:
            row.budget_type === "fixed"
              ? `PKR ${Number(row.budget_min).toLocaleString()} - ${Number(row.budget_max).toLocaleString()}`
              : `PKR ${Number(row.budget_min).toLocaleString()}/hr`,
          location: row.location,
          duration: row.duration,
          postedTime: getRelativeTime(row.created_at),
          category: row.category_name,
          proposals: Number(row.proposals_count) || 0,
          skills: (row.skills || []).filter(Boolean),
        }));
        return { jobs, count: jobs.length };
      },
    });
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[/api/jobs] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
