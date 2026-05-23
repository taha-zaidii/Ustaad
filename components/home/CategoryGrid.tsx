"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { categories as seedCategories, type Category } from "./data";

/**
 * CategoryGrid — restrained version of the old 3D-tilt card wall.
 *
 * The previous design tilted every card with cursor parallax, painted
 * a radial glow behind it, and rendered six categories per row at small
 * font sizes. This rewrite swaps for a clean 2x6 (or 3x4 on lg) grid of
 * flat-surface cards with subtle hover state. The Lucide icon is kept,
 * the colour is reduced to the brand accent (so the page doesn't read
 * like a paint store), and the job count is pulled live from the API
 * with the seed file as fallback.
 */
export default function CategoryGrid() {
  const [items, setItems] = useState<Category[]>(seedCategories);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/categories", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const rows: any[] = Array.isArray(data?.categories) ? data.categories : [];
        if (cancelled || rows.length === 0) return;
        const byName: Record<string, number> = {};
        for (const r of rows) {
          const name = String(r.title || "").trim().toLowerCase();
          const n = parseInt(String(r.count || "").replace(/[^\d]/g, ""), 10);
          if (name) byName[name] = isNaN(n) ? 0 : n;
        }
        setItems((prev) =>
          prev.map((c) => {
            const n = byName[c.nameEn.toLowerCase()];
            return n !== undefined ? { ...c, jobs: n } : c;
          })
        );
      } catch {
        /* keep seed counts */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mx-auto max-w-[1200px] px-5 lg:px-8 py-20 lg:py-28">
      <div className="flex items-end justify-between flex-wrap gap-6 mb-10">
        <div className="max-w-2xl">
          <span className="eyebrow">Categories</span>
          <h2 className="mt-3 text-section">
            Twelve trades.{" "}
            <span className="text-editorial-italic" style={{ color: "var(--brand)" }}>
              One marketplace.
            </span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--text-secondary)]">
            From electrical work to gardening — verified pros in every Pakistani city, a click away.
          </p>
        </div>

        <Link
          href="/browse-jobs"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[color:var(--brand)] hover:underline underline-offset-4"
        >
          Browse all categories
          <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {items.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.li
              key={c.nameEn}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.03, duration: 0.4 }}
            >
              <Link
                href={`/browse-jobs?category=${encodeURIComponent(c.nameEn)}`}
                className="group flex items-center gap-4 p-4 rounded-lg ring-soft transition-colors hover:ring-soft-bright"
                style={{ background: "var(--bg-card)" }}
              >
                <span
                  className="w-10 h-10 rounded-md grid place-items-center transition-colors"
                  style={{
                    background: "var(--brand-soft)",
                    color: "var(--brand)",
                  }}
                  aria-hidden="true"
                >
                  <Icon className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14.5px] font-semibold text-[color:var(--text-primary)] truncate">
                    {c.nameEn}
                  </span>
                  <span className="block text-[12.5px] font-mono text-[color:var(--text-muted)] tabular-nums">
                    {c.jobs.toLocaleString()} jobs
                  </span>
                </span>
                <ArrowUpRight
                  className="w-4 h-4 shrink-0 text-[color:var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-hidden="true"
                />
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
