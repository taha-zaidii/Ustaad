"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import Link from "next/link";
import { MapPin, Star, BadgeCheck, Clock, Briefcase, ArrowUpRight } from "lucide-react";
import { freelancers as seedFreelancers, type Freelancer } from "./data";

const ACCENTS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#06b6d4", "#a16207", "#10b981"];

function initials(name: string | null | undefined): string {
  if (!name) return "??";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "??";
}

function mapApiFreelancer(row: any, idx: number): Freelancer {
  const reviews = Number(row.reviews) || 0;
  const rate = row.hourlyRate || "PKR —";
  return {
    initials: initials(row.name),
    name: row.name || "Mazdoor",
    role: row.title || "Verified Professional",
    location: row.location || "Pakistan",
    rating: Number(row.rating) || 0,
    reviews,
    completedJobs: Number(row.completedJobs) || 0,
    responseTime: "Usually replies fast",
    skills: Array.isArray(row.skills) ? row.skills.slice(0, 3) : [],
    rate: typeof rate === "string" ? rate : "PKR —",
    verified: true,
    badge: reviews >= 100 ? "Top Rated" : null,
    accent: ACCENTS[idx % ACCENTS.length],
  };
}

const containerV: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07 } },
};

export default function TopFreelancers() {
  const root = useRef<HTMLDivElement>(null);
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
        if (rows.length >= 1) {
          setItems(rows.slice(0, 6).map(mapApiFreelancer));
        }
      } catch {
        /* keep seed */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Parallax: as you scroll, the freelancer track shifts horizontally
  const { scrollYProgress } = useScroll({
    target: root,
    offset: ["start end", "end start"],
  });
  const trackX = useTransform(scrollYProgress, [0, 1], ["6%", "-6%"]);

  return (
    <section ref={root} className="py-28 lg:py-36 relative overflow-hidden">
      {/* Big watermark */}
      <motion.div
        aria-hidden
        style={{ x: useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]) }}
        className="absolute inset-0 -z-10 flex items-start pt-24 justify-center pointer-events-none select-none"
      >
        <span
          className="text-stroke font-extrabold tracking-[-0.05em] whitespace-nowrap opacity-[0.05]"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(180px, 22vw, 380px)",
            lineHeight: 0.8,
          }}
        >
          THE PROS
        </span>
      </motion.div>

      <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span
            className="inline-block text-[11px] uppercase tracking-[0.24em] font-mono mb-4"
            style={{ color: "var(--brand)" }}
          >
            ✦ §06 — Trusted Pros
          </span>
          <h2 className="text-section">
            Pakistan's most-{" "}
            <span className="text-editorial-italic" style={{ color: "var(--brand)" }}>
              reviewed
            </span>
            <br />
            workers.
          </h2>
          <p className="mt-5 text-[16px]" style={{ color: "var(--text-secondary)" }}>
            Har ek verified, har ek rated, har ek aap ki taraf ek tap door.
          </p>
        </motion.div>

        <motion.div
          variants={containerV}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          style={{ x: trackX }}
          className="md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-5 flex md:overflow-visible overflow-x-auto no-scrollbar gap-4 -mx-5 px-5 lg:mx-0 lg:px-0 snap-x snap-mandatory"
        >
          {items.map((f, idx) => (
            <motion.article
              key={`${f.name}-${idx}`}
              variants={{
                hidden: { opacity: 0, y: 50 },
                show:   { opacity: 1, y: 0,  transition: { type: "spring", stiffness: 180, damping: 22 } },
              }}
              whileHover={{ y: -8, rotate: idx % 2 ? 0.6 : -0.6 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              data-cursor="link"
              className="pro-card group relative rounded-2xl p-6 cursor-pointer min-w-[300px] md:min-w-0 snap-start flex flex-col"
              style={{
                background: "var(--bg-card)",
                boxShadow: "inset 0 0 0 1px var(--border)",
              }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  boxShadow: "inset 0 0 0 1px var(--brand), 0 30px 60px -20px var(--brand-glow)",
                }}
              />

              {/* Top: avatar + verified badge */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ rotate: 12, scale: 1.06 }}
                    transition={{ type: "spring", stiffness: 380, damping: 16 }}
                    className="relative w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-[16px] tracking-wide"
                    style={{
                      background: `linear-gradient(135deg, ${f.accent}, var(--brand))`,
                      boxShadow: `0 10px 28px -10px ${f.accent}80`,
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {f.initials}
                    {f.verified && (
                      <span
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "var(--bg)" }}
                      >
                        <BadgeCheck className="w-5 h-5" style={{ color: "var(--brand)" }} />
                      </span>
                    )}
                  </motion.div>
                  <div>
                    <div
                      className="text-[16px] font-semibold leading-tight"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {f.name}
                    </div>
                    <div className="text-editorial-italic text-[14px]"
                         style={{ color: "var(--text-secondary)" }}>
                      {f.role}
                    </div>
                    <div className="text-[12px] inline-flex items-center gap-1 mt-1"
                         style={{ color: "var(--text-muted)" }}>
                      <MapPin className="w-3 h-3" />
                      {f.location}
                    </div>
                  </div>
                </div>
                {f.badge && (
                  <span
                    className="px-2.5 py-1 rounded-md text-[10.5px] font-bold uppercase tracking-[0.1em] whitespace-nowrap"
                    style={{ background: "var(--brand-dim)", color: "var(--brand)" }}
                  >
                    {f.badge}
                  </span>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-4 star-row">
                <div className="flex">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star
                      key={i}
                      className="w-3.5 h-3.5"
                      style={{ color: i < Math.round(f.rating) ? "var(--brand)" : "var(--border-bright)" }}
                      fill="currentColor"
                    />
                  ))}
                </div>
                <span className="text-[13px] font-mono font-semibold">{f.rating}</span>
                <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                  ({f.reviews} reviews)
                </span>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-2 mb-5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-md font-mono"
                      style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                  <Briefcase className="w-3 h-3" />
                  {f.completedJobs} jobs
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-md font-mono"
                      style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                  <Clock className="w-3 h-3" />
                  {f.responseTime}
                </span>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5 mb-6">
                {f.skills.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-md text-[11px] font-mono"
                        style={{ background: `${f.accent}18`, color: f.accent }}>
                    {s}
                  </span>
                ))}
              </div>

              <div className="h-px mb-4" style={{ background: "var(--border)" }} />

              <div className="mt-auto flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-[10.5px] uppercase tracking-[0.16em]"
                        style={{ color: "var(--text-muted)" }}>
                    Starting from
                  </span>
                  <span className="font-mono font-bold text-[16px]">{f.rate}</span>
                </div>
                <Link
                  href="/freelancers"
                  data-cursor="link"
                  className="btn-shine inline-flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-full text-white transition"
                  style={{ background: "var(--grad-brand)", boxShadow: "0 8px 24px -8px var(--brand-glow)" }}
                >
                  Hire Now
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
