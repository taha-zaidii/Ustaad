"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import FreelancerCard from "@/components/FreelancerCard";
import { Input } from "@/components/ui/input";
import { FreelancerCardSkeleton } from "@/components/ui/skeleton-card";
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

type SortKey = "rating" | "reviews" | "rate-low" | "rate-high";

const PAGE_SIZE = 12;

function parseHourly(s: string | undefined): number {
  if (!s) return 0;
  const digits = s.replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export default function FreelancersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("rating");
  const [page, setPage] = useState(1);
  const [freelancers, setFreelancers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [category, location, debouncedSearch, sortBy]);

  const fetchFreelancers = useCallback(async () => {
    setLoading(true);
    setErrored(false);
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.append("category", category);
      if (location !== "all") params.append("location", location);
      if (debouncedSearch) params.append("search", debouncedSearch);

      const response = await fetch(`/api/freelancers?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setFreelancers(data.freelancers || []);
    } catch (error) {
      console.error("Failed to fetch freelancers:", error);
      setErrored(true);
      setFreelancers([]);
      toast({
        title: "Could not load freelancers",
        description:
          "Check your connection and try again. If the problem persists, refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [category, location, debouncedSearch]);

  useEffect(() => {
    fetchFreelancers();
  }, [fetchFreelancers]);

  const sorted = useMemo(() => {
    const arr = [...freelancers];
    switch (sortBy) {
      case "rating":
        arr.sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
        break;
      case "reviews":
        arr.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
        break;
      case "rate-low":
        arr.sort((a, b) => parseHourly(a.hourlyRate) - parseHourly(b.hourlyRate));
        break;
      case "rate-high":
        arr.sort((a, b) => parseHourly(b.hourlyRate) - parseHourly(a.hourlyRate));
        break;
    }
    return arr;
  }, [freelancers, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const visible = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const showing = sorted.length === 0
    ? "No freelancers match these filters"
    : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, sorted.length)} of ${sorted.length}`;

  const inputStyle = {
    background: "var(--bg)",
    color: "var(--text-primary)",
    boxShadow: "inset 0 0 0 1px var(--border)",
  } as const;

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
              — Trusted Pros
            </span>
            <h1 className="text-section">Hunar Wale Log</h1>
            <p
              className="mt-3 text-[16px] sm:text-[17px]"
              style={{ color: "var(--text-secondary)" }}
            >
              Verified professionals — seedha hire karo, transparent rates.
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
                  aria-label="Search freelancers"
                  placeholder="Search by name or skill…"
                  className="rounded-xl pl-10 h-11"
                  style={inputStyle}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger
                  aria-label="Filter by category"
                  className="rounded-xl h-11"
                  style={inputStyle}
                >
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="electrician">⚡ Electrician</SelectItem>
                  <SelectItem value="plumbing">🔧 Plumbing</SelectItem>
                  <SelectItem value="painting">🎨 Painting</SelectItem>
                  <SelectItem value="ac-refrigeration">❄️ AC &amp; Refrigeration</SelectItem>
                  <SelectItem value="carpentry">🪚 Carpentry</SelectItem>
                  <SelectItem value="cleaning">🧹 Cleaning</SelectItem>
                </SelectContent>
              </Select>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger
                  aria-label="Filter by city"
                  className="rounded-xl h-11"
                  style={inputStyle}
                >
                  <SelectValue placeholder="Location" />
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

          {/* Sort + Results meta */}
          <div className="mt-12 flex items-center justify-between gap-4 flex-wrap mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-card-title">
                {loading ? "Searching…" : "Results"}
              </h2>
              {!loading && (
                <span
                  className="text-[13px] font-mono px-3 py-1.5 rounded-full"
                  style={{
                    color: "var(--brand)",
                    background: "var(--brand-dim)",
                    boxShadow: "inset 0 0 0 1px rgba(249,115,22,0.25)",
                  }}
                  aria-live="polite"
                >
                  {showing}
                </span>
              )}
            </div>
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortKey)}
            >
              <SelectTrigger
                aria-label="Sort freelancers"
                className="w-48 rounded-xl h-11"
                style={inputStyle}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="reviews">Most Reviews</SelectItem>
                <SelectItem value="rate-low">Lowest Rate</SelectItem>
                <SelectItem value="rate-high">Highest Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Listings */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <FreelancerCardSkeleton key={i} />
              ))}
            </div>
          ) : errored ? (
            <div
              className="text-center py-20 rounded-2xl ring-soft space-y-4"
              style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}
            >
              <p>Couldn&apos;t reach the freelancers server.</p>
              <Button onClick={fetchFreelancers} variant="outline">
                Retry
              </Button>
            </div>
          ) : visible.length === 0 ? (
            <div
              className="text-center py-20 rounded-2xl ring-soft"
              style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}
            >
              Koi freelancer nahi mila — filters change karo.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visible.map((freelancer) => (
                <FreelancerCard key={freelancer.id} {...freelancer} />
              ))}
            </div>
          )}

          {!loading && !errored && totalPages > 1 && (
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
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
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
