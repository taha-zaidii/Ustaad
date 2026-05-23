"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Briefcase, Search } from "lucide-react";

export default function FinalCTA() {
  const [openJobs, setOpenJobs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/jobs?limit=200", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const n = Array.isArray(data?.jobs) ? data.jobs.length : 0;
        if (!cancelled && n > 0) setOpenJobs(n);
      } catch {
        /* leave null */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mx-auto max-w-[1100px] px-5 lg:px-8 py-24 lg:py-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="relative rounded-2xl p-10 sm:p-14 lg:p-16 ring-soft text-center"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, var(--brand-soft) 0%, transparent 70%), var(--bg-card)",
          boxShadow: "var(--shadow-3)",
        }}
      >
        <span className="eyebrow inline-flex items-center gap-2">
          <span className="live-pulse" aria-hidden="true" />
          {openJobs !== null
            ? `${openJobs} open jobs right now`
            : "Live jobs across Pakistan"}
        </span>

        <h2
          className="mt-5 mx-auto max-w-[680px]"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(36px, 5vw, 60px)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          Pakistan&apos;s{" "}
          <span className="text-editorial-italic" style={{ color: "var(--brand)" }}>
            verified
          </span>{" "}
          workforce, a click away.
        </h2>

        <p className="mt-5 mx-auto max-w-[520px] text-[16px] leading-relaxed text-[color:var(--text-secondary)]">
          Free sign-up. Verification in under 24 hours. Your first job can
          start the same day.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md text-[15px] font-semibold text-[color:var(--text-inverse)] transition-opacity hover:opacity-90"
            style={{ background: "var(--brand)" }}
          >
            <Briefcase className="w-4 h-4" aria-hidden="true" />
            Worker sign-up
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <Link
            href="/post-job"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md text-[15px] font-semibold ring-soft hover:ring-soft-bright transition-colors text-[color:var(--text-primary)]"
            style={{ background: "var(--bg-card)" }}
          >
            <Search className="w-4 h-4" aria-hidden="true" />
            Post a job
          </Link>
        </div>

        <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-[color:var(--text-muted)]">
          <li>No credit card required</li>
          <li className="text-[color:var(--border-bright)]">·</li>
          <li>Cancel anytime</li>
          <li className="text-[color:var(--border-bright)]">·</li>
          <li>24/7 Roman Urdu support</li>
        </ul>
      </motion.div>
    </section>
  );
}
