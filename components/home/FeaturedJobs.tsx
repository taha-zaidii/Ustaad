"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { MapPin, Clock, Users, ArrowUpRight } from "lucide-react";
import { jobs as seedJobs, type Job } from "./data";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function mapApiJob(row: any): Job {
  return {
    title: row.title ?? "Untitled job",
    category: row.category ?? "General",
    categoryColor: row.categoryColor ?? "#FFA94D",
    location: row.location ?? "Pakistan",
    posted: row.postedTime ?? "recently",
    budget: row.budget ?? "PKR —",
    budgetType:
      typeof row.budget === "string" && row.budget.includes("/hr")
        ? "hourly"
        : "fixed",
    description: row.description ?? "",
    tags: Array.isArray(row.skills) ? row.skills.slice(0, 3) : [],
    urgent: false,
    applicants: Number(row.proposals) || 0,
  };
}

function JobCard({ j, idx }: { j: Job; idx: number }) {
  const { t } = useLanguage();
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: idx * 0.05, duration: 0.4 }}
      className="glass-card glass-edge group flex flex-col p-6"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <span
          className="chip"
          style={{
            background: j.categoryColor + "22",
            color: j.categoryColor,
            borderColor: j.categoryColor + "55",
          }}
        >
          {j.category}
        </span>
        {j.urgent && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.1em] font-semibold" style={{ color: "var(--brand)" }}>
            <span className="live-pulse" aria-hidden="true" />
            {t("home.jobs.urgent")}
          </span>
        )}
      </div>

      <h3 className="text-card-title mb-2 clamp-2">{j.title}</h3>
      <p className="text-[14px] leading-relaxed clamp-2 mb-4 text-[color:var(--text-secondary)]">
        {j.description}
      </p>

      <div className="flex items-center gap-4 text-[12.5px] mb-5 text-[color:var(--text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
          {j.location}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          {j.posted}
        </span>
      </div>

      <div className="hairline mb-4" />

      <div className="mt-auto flex items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11.5px] mb-1 text-[color:var(--text-muted)]">
            <Users className="w-3.5 h-3.5" aria-hidden="true" />
            {j.applicants} {t("home.jobs.applied")}
          </div>
          <div className="font-mono font-semibold text-[18px] tabular-nums text-[color:var(--text-primary)]">
            {j.budget}
            <span className="text-[11px] font-medium ml-1 text-[color:var(--text-muted)]">
              {j.budgetType === "fixed" ? t("home.jobs.fixed") : t("home.jobs.hourly")}
            </span>
          </div>
        </div>
        <Link href="/sign-in" className="btn-glass">
          {t("home.jobs.apply")}
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </motion.article>
  );
}

export default function FeaturedJobs() {
  const { t } = useLanguage();
  const [items, setItems] = useState<Job[]>(seedJobs.slice(0, 6));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/jobs?limit=6", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const rows: any[] = Array.isArray(data?.jobs) ? data.jobs : [];
        if (cancelled) return;
        if (rows.length >= 1) setItems(rows.slice(0, 6).map(mapApiJob));
      } catch {
        /* keep seed */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="relative">
      <div className="mx-auto max-w-[1240px] px-5 lg:px-8 py-20 lg:py-28">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-10">
          <div className="max-w-2xl">
            <span className="eyebrow eyebrow-bilingual">{t("home.jobs.eyebrow")}</span>
            <h2 className="mt-4 text-section">
              {t("home.jobs.title_a")}{" "}
              <span className="text-grad-brand">{t("home.jobs.title_b")}</span>
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--text-secondary)]">
              {t("home.jobs.desc")}
            </p>
          </div>
          <Link
            href="/browse-jobs"
            className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[color:var(--brand)] hover:underline underline-offset-4"
          >
            {t("home.jobs.see_all")}
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((j, i) => (
            <JobCard key={`${j.title}-${i}`} j={j} idx={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
