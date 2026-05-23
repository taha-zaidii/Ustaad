"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import Link from "next/link";
import { MapPin, Clock, Users, ArrowUpRight } from "lucide-react";
import { jobs as seedJobs, type Job } from "./data";

// Map a row returned by /api/jobs into the shape this component renders.
// Defaults plug holes where the API doesn't (yet) provide a value.
function mapApiJob(row: any): Job {
  return {
    title: row.title ?? "Untitled job",
    category: row.category ?? "General",
    categoryColor: row.categoryColor ?? "#f97316",
    location: row.location ?? "Pakistan",
    posted: row.postedTime ?? "recently",
    budget: row.budget ?? "PKR —",
    budgetType: typeof row.budget === "string" && row.budget.includes("/hr") ? "hourly" : "fixed",
    description: row.description ?? "",
    tags: Array.isArray(row.skills) ? row.skills.slice(0, 3) : [],
    urgent: false,
    applicants: Number(row.proposals) || 0,
  };
}

function JobCard({ j, idx }: { j: Job; idx: number }) {
  const ref = useRef<HTMLElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 200, damping: 18 });
  const sy = useSpring(my, { stiffness: 200, damping: 18 });
  const rX = useTransform(sy, [-0.5, 0.5], ["3.5deg", "-3.5deg"]);
  const rY = useTransform(sx, [-0.5, 0.5], ["-4deg", "4deg"]);
  const glowX = useTransform(sx, [-0.5, 0.5], ["0%", "100%"]);
  const glowY = useTransform(sy, [-0.5, 0.5], ["0%", "100%"]);

  const onMove = (e: MouseEvent<HTMLElement>) => {
    if (!ref.current) return;
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1024px)").matches) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top)  / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  return (
    <motion.article
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      data-cursor="link"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        delay: idx * 0.07,
        type: "spring",
        stiffness: 180,
        damping: 22,
      }}
      whileHover={{ y: -8 }}
      className="job-card group relative rounded-2xl p-6 flex flex-col cursor-pointer overflow-hidden preserve-3d"
      style={{
        rotateX: rX,
        rotateY: rY,
        transformPerspective: 900,
        background: "var(--bg-card)",
        boxShadow: "inset 0 0 0 1px var(--border)",
      }}
    >
      {/* Spotlight gradient following cursor */}
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background: useTransform(
            [glowX, glowY] as any,
            ([gx, gy]: any) =>
              `radial-gradient(280px 220px at ${gx} ${gy}, ${j.categoryColor}26, transparent 70%)`
          ),
          boxShadow: "inset 0 0 0 1px var(--brand), 0 30px 60px -20px var(--brand-glow)",
        }}
      />

      {/* Top row */}
      <div className="flex items-center justify-between gap-2 mb-4 relative">
        <span
          className="px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide"
          style={{ background: `${j.categoryColor}20`, color: j.categoryColor }}
        >
          {j.category}
        </span>
        <div className="flex items-center gap-2">
          <span
            className="text-[10.5px] font-mono tabular-nums uppercase tracking-[0.16em]"
            style={{ color: "var(--text-muted)" }}
          >
            #{String(idx + 1).padStart(2, "0")}
          </span>
          {j.urgent && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-bold uppercase tracking-[0.12em] font-mono"
              style={{ background: "var(--brand-dim)", color: "var(--brand)" }}
            >
              <span className="pulse-dot" />
              Urgent
            </span>
          )}
        </div>
      </div>

      <h3
        className="text-[19px] font-semibold leading-snug mb-2.5 relative"
        style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.025em" }}
      >
        {j.title}
      </h3>

      <p className="text-[14px] leading-relaxed clamp-2 mb-4 relative"
         style={{ color: "var(--text-secondary)" }}>
        {j.description}
      </p>

      <div className="flex items-center gap-4 text-[12.5px] mb-5 relative"
           style={{ color: "var(--text-muted)" }}>
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          {j.location}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {j.posted}
        </span>
      </div>

      <div className="h-px mb-4 relative" style={{ background: "var(--border)" }} />

      <div className="flex flex-wrap gap-1.5 mb-5 relative">
        {j.tags.map(t => (
          <span key={t} className="px-2.5 py-1 rounded-md text-[11px] font-mono"
                style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
            {t}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 relative">
        <div className="flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-1.5 text-[11.5px]"
                style={{ color: "var(--text-muted)" }}>
            <Users className="w-3.5 h-3.5" />
            {j.applicants} log apply kar chuke
          </span>
          <span
            className="font-mono font-bold text-[20px] tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {j.budget}
            <span className="text-[11px] font-medium ml-1"
                  style={{ color: "var(--text-muted)" }}>
              {j.budgetType === "fixed" ? "fixed" : "/hr"}
            </span>
          </span>
        </div>
        <Link
          href="/sign-in"
          data-cursor="link"
          className="inline-flex items-center gap-1 text-[13px] font-semibold px-4 py-2 rounded-full transition group/btn"
          style={{
            color: "var(--brand)",
            boxShadow: "inset 0 0 0 1px var(--brand)",
          }}
        >
          Apply
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
        </Link>
      </div>
    </motion.article>
  );
}

const containerV: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.06 } },
};

export default function FeaturedJobs() {
  const root = useRef<HTMLDivElement>(null);
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
        // Only swap to live data if the DB actually has jobs — otherwise the
        // seed data keeps the homepage looking populated for visitors.
        if (rows.length >= 1) {
          setItems(rows.slice(0, 6).map(mapApiJob));
        }
      } catch {
        /* keep seed */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section ref={root} className="py-28 lg:py-36 relative">
      {/* Soft band */}
      <div className="absolute inset-0 -z-10 pointer-events-none"
           style={{ background: "linear-gradient(180deg, transparent 0%, rgba(23,27,38,0.6) 50%, transparent 100%)" }} />

      <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="flex items-end justify-between flex-wrap gap-8 mb-16"
        >
          <div className="max-w-3xl">
            <span
              className="inline-block text-[11px] uppercase tracking-[0.24em] font-mono mb-4"
              style={{ color: "var(--brand)" }}
            >
              ✦ §05 — Live Briefs
            </span>
            <h2 className="text-section">
              Today's open jobs.{" "}
              <span className="text-editorial-italic" style={{ color: "var(--brand)" }}>
                Right now.
              </span>
            </h2>
            <p className="mt-5 text-[16px] max-w-xl" style={{ color: "var(--text-secondary)" }}>
              Households and businesses looking for the right pro — apply jaldi,
              competition tezi se barhti hai.
            </p>
          </div>
          <motion.a
            href="/browse-jobs"
            data-cursor="link"
            whileHover={{ x: 6 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="inline-flex items-center gap-2 text-[14px] font-semibold"
            style={{ color: "var(--brand)" }}
          >
            See every open job
            <ArrowUpRight className="w-4 h-4" />
          </motion.a>
        </motion.div>

        <motion.div
          variants={containerV}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 perspective-1000"
        >
          {items.map((j, i) => (
            <JobCard key={`${j.title}-${i}`} j={j} idx={i} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
