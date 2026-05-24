"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  MapPin,
  Star,
  BadgeCheck,
  Clock,
  Briefcase,
  ArrowUpRight,
} from "lucide-react";
import { freelancers as seedFreelancers, type Freelancer } from "./data";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function initials(name: string | null | undefined): string {
  if (!name) return "??";
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "??"
  );
}

function mapApiFreelancer(row: any): Freelancer {
  const reviews = Number(row.reviews) || 0;
  const rate = row.hourlyRate || "PKR —";
  return {
    initials: initials(row.name),
    name: row.name || "Mazdoor",
    role: row.title || "Verified professional",
    location: row.location || "Pakistan",
    rating: Number(row.rating) || 0,
    reviews,
    completedJobs: Number(row.completedJobs) || 0,
    responseTime: "Usually replies fast",
    skills: Array.isArray(row.skills) ? row.skills.slice(0, 3) : [],
    rate: typeof rate === "string" ? rate : "PKR —",
    verified: true,
    badge: reviews >= 100 ? "Top rated" : null,
    accent: "var(--brand)",
  };
}

export default function TopFreelancers() {
  const { t } = useLanguage();
  const [items, setItems] = useState<Freelancer[]>(seedFreelancers.slice(0, 6));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/freelancers", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const rows: any[] = Array.isArray(data?.freelancers) ? data.freelancers : [];
        if (cancelled) return;
        if (rows.length >= 1) setItems(rows.slice(0, 6).map(mapApiFreelancer));
      } catch {
        /* keep seed */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mx-auto max-w-[1240px] px-5 lg:px-8 py-20 lg:py-28">
      <div className="flex items-end justify-between flex-wrap gap-6 mb-10">
        <div className="max-w-2xl">
          <span className="eyebrow eyebrow-bilingual">{t("home.pros.eyebrow")}</span>
          <h2 className="mt-4 text-section">
            {t("home.pros.title_a")}{" "}
            <span className="text-grad-brand">{t("home.pros.title_b")}</span>{" "}
            {t("home.pros.title_c")}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--text-secondary)]">
            {t("home.pros.desc")}
          </p>
        </div>
        <Link
          href="/freelancers"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[color:var(--brand)] hover:underline underline-offset-4"
        >
          {t("home.pros.browse_all")}
          <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((f, i) => (
          <motion.article
            key={`${f.name}-${i}`}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className="glass-card glass-edge flex flex-col p-6"
          >
            <div className="flex items-start justify-between mb-4 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="relative w-12 h-12 rounded-full flex items-center justify-center text-[15px] font-semibold shrink-0 font-display"
                  style={{
                    background: "var(--grad-brand)",
                    color: "var(--text-inverse)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.3), 0 6px 14px -4px var(--brand-glow)",
                  }}
                  aria-hidden="true"
                >
                  {f.initials}
                  {f.verified && (
                    <span
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full grid place-items-center"
                      style={{
                        background: "var(--bg)",
                        border: "1px solid var(--border-bright)",
                      }}
                    >
                      <BadgeCheck className="w-4 h-4" style={{ color: "var(--accent)" }} aria-hidden="true" />
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold leading-tight text-[color:var(--text-primary)] truncate">
                    {f.name}
                  </div>
                  <div className="text-[13px] text-[color:var(--text-secondary)] truncate">
                    {f.role}
                  </div>
                  <div className="inline-flex items-center gap-1 mt-1 text-[12px] text-[color:var(--text-muted)]">
                    <MapPin className="w-3 h-3" aria-hidden="true" />
                    {f.location}
                  </div>
                </div>
              </div>
              {f.badge && <span className="chip chip-brand text-[10.5px]">{t("home.pros.top_rated")}</span>}
            </div>

            <div className="flex items-center gap-2 mb-4 star-row">
              <div className="flex">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star
                    key={i}
                    className="w-3.5 h-3.5"
                    style={{
                      color:
                        i < Math.round(f.rating)
                          ? "var(--brand)"
                          : "var(--border-bright)",
                    }}
                    fill="currentColor"
                    aria-hidden="true"
                  />
                ))}
              </div>
              <span className="text-[13px] font-mono tabular-nums font-semibold">
                {f.rating.toFixed(1)}
              </span>
              <span className="text-[12px] text-[color:var(--text-muted)]">
                ({f.reviews} {t("home.pros.reviews")})
              </span>
            </div>

            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <span className="chip">
                <Briefcase className="w-3 h-3" aria-hidden="true" />
                {f.completedJobs} {t("home.pros.jobs")}
              </span>
              <span className="chip">
                <Clock className="w-3 h-3" aria-hidden="true" />
                {f.responseTime}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-5">
              {f.skills.map((s) => (
                <span key={s} className="chip chip-brand">
                  {s}
                </span>
              ))}
            </div>

            <div className="hairline mb-4" />

            <div className="mt-auto flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] font-mono text-[color:var(--text-muted)]">
                  {t("home.pros.from")}
                </div>
                <div className="font-mono font-semibold text-[15px] tabular-nums">
                  {f.rate}
                </div>
              </div>
              <Link href="/freelancers" className="btn-brand">
                {t("home.pros.hire")}
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
