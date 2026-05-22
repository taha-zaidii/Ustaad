"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import JobCard from "@/components/JobCard";
import { Input } from "@/components/ui/input";
import { JobCardSkeleton } from "@/components/ui/skeleton-card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

const PAGE_SIZE = 12;

export default function BrowseJobsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("all");
  const [page, setPage] = useState(1);
  const [jobs, setJobs] = useState<any[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  // Debounce search input to avoid hammering the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [category, location, debouncedSearch]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setErrored(false);
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.append("category", category);
      if (location !== "all") params.append("location", location);
      if (debouncedSearch) params.append("search", debouncedSearch);
      // Fetch one extra row so we can tell if there's a next page without a count query.
      params.append("limit", String(PAGE_SIZE + 1));
      params.append("offset", String((page - 1) * PAGE_SIZE));

      const response = await fetch(`/api/jobs?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const rows: any[] = data.jobs || [];
      setHasNext(rows.length > PAGE_SIZE);
      setJobs(rows.slice(0, PAGE_SIZE));
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
      setErrored(true);
      setJobs([]);
      setHasNext(false);
      toast({
        title: "Could not load jobs",
        description:
          "Check your connection and try again. If the problem persists, refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [category, location, debouncedSearch, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const resultLabel = useMemo(() => {
    if (loading) return "Searching…";
    if (errored) return "Couldn't load jobs";
    if (jobs.length === 0) return "No jobs match these filters";
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = start + jobs.length - 1;
    return `Showing ${start}–${end}${hasNext ? "+" : ""}`;
  }, [loading, errored, jobs.length, page, hasNext]);

  return (
    <>
      <Navigation />

      <main className="min-h-screen pt-[88px] pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
          <div>
            <span
              className="inline-block text-[11px] uppercase tracking-[0.2em] font-semibold mb-3 font-mono"
              style={{ color: "var(--brand)" }}
            >
              — Live Jobs
            </span>
            <h1 className="text-section">Available Kaam</h1>
            <p
              className="mt-3 text-[16px] sm:text-[17px]"
              style={{ color: "var(--text-secondary)" }}
            >
              Naya kaam dhundo aur aaj hi start karo — verified clients only.
            </p>
          </div>

          {/* Search & Filters */}
          <div
            className="mt-8 rounded-2xl p-4 sm:p-5 ring-soft"
            style={{ background: "var(--bg-card)" }}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2 relative">
                <Search
                  aria-hidden="true"
                  className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--text-muted)" }}
                />
                <Input
                  type="search"
                  aria-label="Search jobs"
                  placeholder="Kaunsa kaam dhundh rahe ho? (e.g. Electrician, Plumber…)"
                  className="rounded-xl pl-10 h-11"
                  style={{
                    background: "var(--bg)",
                    color: "var(--text-primary)",
                    boxShadow: "inset 0 0 0 1px var(--border)",
                  }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger
                  aria-label="Filter by category"
                  className="rounded-xl h-11"
                  style={{
                    background: "var(--bg)",
                    color: "var(--text-primary)",
                    boxShadow: "inset 0 0 0 1px var(--border)",
                  }}
                >
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="plumbing">🔧 Plumbing</SelectItem>
                  <SelectItem value="carpentry">🪚 Carpentry</SelectItem>
                  <SelectItem value="electrician">⚡ Electrician</SelectItem>
                  <SelectItem value="painting">🎨 Painting</SelectItem>
                  <SelectItem value="ac-refrigeration">❄️ AC & Refrigeration</SelectItem>
                  <SelectItem value="construction">🏗️ Construction</SelectItem>
                  <SelectItem value="cleaning">🧹 Cleaning</SelectItem>
                  <SelectItem value="gardening">🌱 Gardening</SelectItem>
                  <SelectItem value="tailoring">✂️ Tailoring</SelectItem>
                  <SelectItem value="auto-mechanic">🔩 Auto Mechanic</SelectItem>
                  <SelectItem value="welding">🔥 Welding</SelectItem>
                  <SelectItem value="home-appliances">🔌 Home Appliances</SelectItem>
                </SelectContent>
              </Select>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger
                  aria-label="Filter by city"
                  className="rounded-xl h-11"
                  style={{
                    background: "var(--bg)",
                    color: "var(--text-primary)",
                    boxShadow: "inset 0 0 0 1px var(--border)",
                  }}
                >
                  <SelectValue placeholder="Apna shehar chunein" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="karachi">Karachi</SelectItem>
                  <SelectItem value="lahore">Lahore</SelectItem>
                  <SelectItem value="islamabad">Islamabad</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results header */}
          <div className="mt-12 flex items-center justify-between mb-6">
            <h2 className="text-card-title">
              {loading ? "Searching…" : "Results"}
            </h2>
            {!loading && (
              <span
                className="text-[13px] font-mono px-3 py-1.5 rounded-full"
                style={{
                  color: errored ? "var(--text-secondary)" : "var(--brand)",
                  background: "var(--brand-dim)",
                  boxShadow: "inset 0 0 0 1px rgba(249,115,22,0.25)",
                }}
                aria-live="polite"
              >
                {resultLabel}
              </span>
            )}
          </div>

          {/* Listings */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <JobCardSkeleton key={i} />
              ))}
            </div>
          ) : errored ? (
            <div
              className="text-center py-20 rounded-2xl ring-soft space-y-4"
              style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}
            >
              <p>Couldn&apos;t reach the jobs server.</p>
              <Button onClick={fetchJobs} variant="outline">
                Retry
              </Button>
            </div>
          ) : jobs.length === 0 ? (
            <div
              className="text-center py-20 rounded-2xl ring-soft"
              style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}
            >
              Koi kaam nahi mila — filters badal ke dobara try karo.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {jobs.map((job) => (
                <JobCard key={job.id} {...job} />
              ))}
            </div>
          )}

          {!loading && !errored && jobs.length > 0 && (page > 1 || hasNext) && (
            <nav
              className="mt-12 flex items-center justify-center gap-3"
              aria-label="Pagination"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <span
                className="text-[13px] font-mono px-3 py-1.5 rounded-full"
                style={{
                  color: "var(--brand)",
                  background: "var(--brand-dim)",
                  boxShadow: "inset 0 0 0 1px rgba(249,115,22,0.25)",
                }}
              >
                Page {page}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNext}
                aria-label="Next page"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </nav>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
