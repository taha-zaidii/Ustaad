"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Briefcase, Search } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function FinalCTA() {
  const { t } = useLanguage();
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
    <section className="mx-auto max-w-[1240px] px-5 lg:px-8 py-24 lg:py-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55 }}
        className="relative glass-card glass-edge p-10 sm:p-14 lg:p-20 text-center overflow-hidden aurora-bg"
        style={{ borderRadius: "var(--radius-2xl)" }}
      >
        <div className="grain" aria-hidden="true" />

        {/* Decorative orbs */}
        <div
          aria-hidden="true"
          className="absolute -top-20 -right-20 w-[420px] h-[420px] rounded-full pointer-events-none float-slower"
          style={{
            background: "radial-gradient(closest-side, rgba(255,169,77,0.25), transparent 70%)",
            filter: "blur(50px)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -left-16 w-[360px] h-[360px] rounded-full pointer-events-none float-slow"
          style={{
            background: "radial-gradient(closest-side, rgba(52,211,153,0.18), transparent 70%)",
            filter: "blur(50px)",
          }}
        />

        <div className="relative">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full glass">
            <span className="live-pulse" aria-hidden="true" />
            <span className="text-[12px] font-medium font-mono tracking-[0.04em] text-[color:var(--text-secondary)]">
              {openJobs !== null
                ? `${openJobs} ${t("home.final.live")}`
                : t("home.final.live_fallback")}
            </span>
          </div>

          <h2
            className="mt-6 mx-auto max-w-[760px] text-display"
          >
            {t("home.final.title_a")}{" "}
            <span className="text-grad-brand">{t("home.final.title_b")}</span>{" "}
            {t("home.final.title_c")}
          </h2>

          <p className="mt-5 mx-auto max-w-[560px] text-[16px] leading-relaxed text-[color:var(--text-secondary)]">
            {t("home.final.desc")}
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/sign-up" className="btn-brand px-6 py-3.5 text-[15px]">
              <Briefcase className="w-4 h-4" aria-hidden="true" />
              {t("home.final.cta_worker")}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link href="/post-job" className="btn-glass px-6 py-3.5 text-[15px]">
              <Search className="w-4 h-4" aria-hidden="true" />
              {t("home.final.cta_client")}
            </Link>
          </div>

          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-[color:var(--text-muted)]">
            <li>{t("home.final.bullet1")}</li>
            <li className="opacity-40">·</li>
            <li>{t("home.final.bullet2")}</li>
            <li className="opacity-40">·</li>
            <li>{t("home.final.bullet3")}</li>
          </ul>
        </div>
      </motion.div>
    </section>
  );
}
