"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Briefcase, Search, Asterisk } from "lucide-react";
import MagneticButton from "./MagneticButton";

export default function FinalCTA() {
  // Live count of currently open jobs, with a sensible static fallback for
  // first paint so the "live jobs" badge never reads as 0.
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
        /* leave null → fall back to "many" copy below */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="relative py-28 lg:py-36 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative rounded-[28px] overflow-hidden p-10 sm:p-16 lg:p-20 ring-soft"
          style={{
            background:
              "radial-gradient(ellipse 80% 100% at 0% 100%, rgba(249,115,22,0.22), transparent 60%)," +
              "radial-gradient(ellipse 60% 80% at 100% 0%, rgba(249,115,22,0.12), transparent 60%)," +
              "var(--bg-card)",
          }}
        >
          {/* Decorative grid */}
          <div className="absolute inset-0 hero-grid opacity-50 pointer-events-none" />

          {/* Spinning asterisks */}
          <Asterisk
            aria-hidden
            className="absolute top-8 right-10 w-12 h-12 spin-slow opacity-80"
            style={{ color: "var(--brand)" }}
            strokeWidth={1.2}
          />
          <Asterisk
            aria-hidden
            className="absolute bottom-10 left-10 w-9 h-9 spin-slow"
            style={{ color: "var(--brand)", animationDirection: "reverse" }}
            strokeWidth={1.4}
          />

          {/* Accent ring */}
          <motion.div
            aria-hidden
            initial={{ scale: 0.6, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, type: "spring", stiffness: 80, damping: 20 }}
            className="absolute -bottom-20 -right-20 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(closest-side, rgba(249,115,22,0.3), transparent)" }}
          />

          <div className="relative grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-semibold mb-6 uppercase tracking-[0.16em]"
                style={{ background: "var(--brand-dim)", color: "var(--brand)" }}
              >
                <span className="pulse-dot" />
                {openJobs !== null
                  ? `${openJobs} open jobs right now`
                  : "Live jobs across Pakistan"}
              </motion.span>

              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.7 }}
                className="text-hero"
                style={{ fontSize: "clamp(44px, 6.5vw, 84px)", lineHeight: 0.92 }}
              >
                Pakistan ka <br />
                <span className="text-grad-brand text-editorial-italic">Apna Kaam</span>{" "}
                <span style={{ color: "var(--text-primary)" }}>ka platform.</span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.45 }}
                className="mt-6 text-[16px] sm:text-[18px] leading-relaxed max-w-[520px] dropcap"
                style={{ color: "var(--text-secondary)" }}
              >
                Sign up free hai. Verification 24 ghante mein. Pehla kaam aaj hi
                shuru ho sakta hai — bus ek click ki dair hai.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                className="mt-9 flex flex-wrap gap-3"
              >
                <MagneticButton
                  as="a"
                  href="/sign-up"
                  strength={26}
                  parallax={1.5}
                  className="px-7 py-4 rounded-full text-white text-[15px] font-semibold"
                  style={{
                    background: "var(--grad-brand)",
                    boxShadow: "0 14px 36px -10px var(--brand-glow)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  <Briefcase className="w-4 h-4" />
                  Worker Sign Up
                  <ArrowUpRight className="w-4 h-4" />
                </MagneticButton>
                <MagneticButton
                  as="a"
                  href="/post-job"
                  strength={20}
                  parallax={1.3}
                  className="px-7 py-4 rounded-full text-[15px] font-semibold"
                  style={{
                    color: "var(--text-primary)",
                    background: "var(--bg-elevated)",
                    boxShadow: "inset 0 0 0 1px var(--border-bright)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  <Search className="w-4 h-4" />
                  Kaam Post Karo
                </MagneticButton>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 }}
                className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-2 text-[13px]"
                style={{ color: "var(--text-muted)" }}
              >
                <span>✓ No credit card required</span>
                <span>✓ Cancel anytime</span>
                <span>✓ 24/7 Roman Urdu support</span>
              </motion.div>
            </div>

            {/* Right: stat tiles */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              {[
                { num: "10K+", label: "Verified workers" },
                { num: "98%",  label: "Satisfaction rate" },
                { num: "30m",  label: "Avg response time" },
                { num: "24/7", label: "Roman Urdu support" },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: 0.4 + i * 0.08,
                    type: "spring",
                    stiffness: 200,
                    damping: 22,
                  }}
                  whileHover={{ y: -4, rotate: i % 2 ? 1 : -1 }}
                  className="rounded-2xl p-6 ring-soft relative overflow-hidden"
                  style={{ background: "rgba(15,17,23,0.65)" }}
                >
                  <div
                    className="font-display tabular-nums leading-none"
                    style={{
                      fontSize: "clamp(36px, 4vw, 56px)",
                      fontWeight: 800,
                      color: "var(--brand)",
                      letterSpacing: "-0.04em",
                    }}
                  >
                    {s.num}
                  </div>
                  <div className="mt-3 text-[12px] uppercase tracking-[0.14em] font-semibold"
                       style={{ color: "var(--text-secondary)" }}>
                    {s.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
