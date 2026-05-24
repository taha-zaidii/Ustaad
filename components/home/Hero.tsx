"use client";

import { motion } from "framer-motion";
import {
  MapPin,
  Wrench,
  ArrowRight,
  Check,
  Sparkles,
  ShieldCheck,
  Zap,
  Droplets,
  Snowflake,
  PaintBucket,
} from "lucide-react";
import { cities, categories } from "./data";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * Hero — Liquid Glass over an aurora gradient base.
 *
 *   - Bilingual lockup: the English headline is the loud one, with a
 *     Roman-Urdu second line stacked below it (or above when ur). Either
 *     way both languages are visible at once — the language toggle just
 *     swaps which is primary.
 *   - Ambient orbs drift behind the glass without subscribing to cursor
 *     movement (cheap, no JS event handlers).
 *   - Floating "live activity" chips around the periphery hint at the
 *     platform's busyness without requiring real data.
 *   - The search lockup is a single big glass surface — the most
 *     important interaction above the fold.
 */
export default function Hero() {
  const { t, lang } = useLanguage();

  const primaryLine1 = t("hero.line1");
  const primaryBrand = t("hero.line2_brand");
  const primaryEnd = t("hero.line2_post");
  // The other language's headline, shown smaller as a bilingual lockup
  const altLine1 = lang === "en" ? "Ghar ka kaam ho ya business —" : "Whether home or business —";
  const altEnd = lang === "en" ? "Ustaad hai!" : "Ustaad has you covered.";

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: (delay = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay, ease: [0.4, 0, 0.2, 1] as const },
    }),
  };

  return (
    <section className="relative overflow-hidden aurora-bg">
      <div className="grain" aria-hidden="true" />

      {/* Ambient orbs */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none float-slow"
        style={{
          width: 480,
          height: 480,
          top: "-80px",
          left: "-120px",
          background:
            "radial-gradient(closest-side, rgba(255,169,77,0.30), transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute pointer-events-none float-slower"
        style={{
          width: 520,
          height: 520,
          top: "20%",
          right: "-160px",
          background:
            "radial-gradient(closest-side, rgba(52,211,153,0.22), transparent 70%)",
          filter: "blur(50px)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute pointer-events-none float-slow"
        style={{
          width: 320,
          height: 320,
          bottom: "-40px",
          left: "30%",
          background:
            "radial-gradient(closest-side, rgba(180,100,220,0.18), transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <div className="relative mx-auto max-w-[1240px] px-5 lg:px-8 pt-16 lg:pt-24 pb-24 lg:pb-32">
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          custom={0}
          className="text-center"
        >
          {/* Eyebrow pill — live state */}
          <motion.div
            variants={fadeUp}
            custom={0.05}
            className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full glass"
          >
            <span className="live-pulse" aria-hidden="true" />
            <span className="text-[12px] font-medium font-mono tracking-[0.04em] text-[color:var(--text-secondary)]">
              {t("hero.pill")}
            </span>
          </motion.div>

          {/* Headline — bilingual lockup */}
          <motion.h1
            variants={fadeUp}
            custom={0.12}
            className="mt-7 text-hero"
          >
            {primaryLine1}{" "}
            <span className="text-grad-brand">{primaryBrand}</span>{" "}
            {primaryEnd}
          </motion.h1>
          <motion.p
            variants={fadeUp}
            custom={0.18}
            className="mt-3 text-[15px] sm:text-[16px] font-mono text-[color:var(--text-muted)]"
            aria-hidden="true"
          >
            {altLine1} <span className="text-editorial-italic" style={{ color: "var(--brand)" }}>Ustaad</span> {altEnd}
          </motion.p>

          {/* Sub */}
          <motion.p
            variants={fadeUp}
            custom={0.24}
            className="mt-8 mx-auto max-w-[640px] text-[16px] sm:text-[18px] leading-relaxed text-[color:var(--text-secondary)]"
          >
            {t("hero.sub_lead")} {t("hero.sub_mid")}{" "}
            <span className="text-editorial-italic" style={{ color: "var(--brand)" }}>
              {t("hero.sub_accent")}
            </span>
            {t("hero.sub_tail")}
          </motion.p>

          {/* Search lockup — big glass surface */}
          <motion.form
            variants={fadeUp}
            custom={0.32}
            action="/browse-jobs"
            method="get"
            className="relative mt-10 mx-auto max-w-[760px]"
          >
            <div
              className="glass-card glass-edge p-1.5 flex flex-col sm:flex-row items-stretch gap-1.5"
              style={{ borderRadius: "var(--radius-xl)" }}
            >
              <label className="flex-1 min-w-0 flex items-center gap-3 px-5 py-3 rounded-2xl hover:bg-[color:var(--glass-bright)] transition-colors">
                <span
                  className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
                  style={{
                    background: "var(--brand-soft)",
                    color: "var(--brand)",
                  }}
                  aria-hidden="true"
                >
                  <MapPin className="w-[18px] h-[18px]" />
                </span>
                <span className="flex flex-col flex-1 leading-tight min-w-0 text-left">
                  <span className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-[color:var(--text-muted)]">
                    {t("hero.search_city")}
                  </span>
                  <select
                    name="location"
                    aria-label={t("hero.search_city")}
                    defaultValue="Karachi"
                    className="bg-transparent outline-none font-semibold text-[15px] text-[color:var(--text-primary)] truncate cursor-pointer"
                  >
                    {cities.map((c) => (
                      <option key={c} value={c} style={{ color: "#000" }}>
                        {c}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <label className="flex-1 min-w-0 flex items-center gap-3 px-5 py-3 rounded-2xl hover:bg-[color:var(--glass-bright)] transition-colors">
                <span
                  className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
                  style={{
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                  }}
                  aria-hidden="true"
                >
                  <Wrench className="w-[18px] h-[18px]" />
                </span>
                <span className="flex flex-col flex-1 leading-tight min-w-0 text-left">
                  <span className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-[color:var(--text-muted)]">
                    {t("hero.search_kind")}
                  </span>
                  <select
                    name="category"
                    aria-label={t("hero.search_kind")}
                    defaultValue="Electrician"
                    className="bg-transparent outline-none font-semibold text-[15px] text-[color:var(--text-primary)] truncate cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.nameEn} value={c.nameEn} style={{ color: "#000" }}>
                        {c.nameEn}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <button
                type="submit"
                className="btn-brand px-7 sm:m-1"
                style={{ borderRadius: "var(--radius-lg)" }}
              >
                {t("hero.search_btn")}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </motion.form>

          {/* Trust row */}
          <motion.ul
            variants={fadeUp}
            custom={0.4}
            className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-[color:var(--text-secondary)]"
          >
            {[
              t("hero.trust_free"),
              t("hero.trust_verified"),
              t("hero.trust_no_fee"),
              t("hero.trust_support"),
            ].map((label) => (
              <li key={label} className="inline-flex items-center gap-1.5">
                <Check
                  className="w-3.5 h-3.5"
                  style={{ color: "var(--accent)" }}
                  aria-hidden="true"
                />
                {label}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Floating glass activity chips — desktop only, decorative */}
        <FloatingChip
          delay={0.6}
          className="hidden lg:flex absolute left-[3%] top-[36%]"
          icon={<Zap className="w-4 h-4" />}
          label="Wiring fix · DHA"
          time="12m"
          tint="brand"
        />
        <FloatingChip
          delay={0.75}
          className="hidden lg:flex absolute right-[3%] top-[30%]"
          icon={<Snowflake className="w-4 h-4" />}
          label="AC service · Karachi"
          time="27m"
          tint="accent"
        />
        <FloatingChip
          delay={0.85}
          className="hidden lg:flex absolute left-[6%] bottom-[18%]"
          icon={<Droplets className="w-4 h-4" />}
          label="Pipe repair · Lahore"
          time="1h"
          tint="info"
        />
        <FloatingChip
          delay={0.95}
          className="hidden lg:flex absolute right-[5%] bottom-[24%]"
          icon={<PaintBucket className="w-4 h-4" />}
          label="3-room paint · F-10"
          time="2h"
          tint="brand"
        />
        <FloatingChip
          delay={1.05}
          className="hidden xl:flex absolute right-[8%] top-[60%]"
          icon={<ShieldCheck className="w-4 h-4" />}
          label="New verified pro"
          time="3m"
          tint="accent"
        />
        <FloatingChip
          delay={1.15}
          className="hidden xl:flex absolute left-[4%] top-[62%]"
          icon={<Sparkles className="w-4 h-4" />}
          label="Deep clean booked"
          time="5m"
          tint="brand"
        />
      </div>
    </section>
  );
}

function FloatingChip({
  icon,
  label,
  time,
  className,
  delay,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  time: string;
  className: string;
  delay: number;
  tint: "brand" | "accent" | "info";
}) {
  const tintColor =
    tint === "brand"
      ? "var(--brand)"
      : tint === "accent"
      ? "var(--accent)"
      : "var(--info)";
  const tintSoft =
    tint === "brand"
      ? "var(--brand-soft)"
      : tint === "accent"
      ? "var(--accent-soft)"
      : "var(--info-soft)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      className={`${className} items-center gap-2.5 px-3.5 py-2 rounded-full glass`}
    >
      <span
        className="w-7 h-7 rounded-full grid place-items-center shrink-0"
        style={{ background: tintSoft, color: tintColor }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[12.5px] font-medium text-[color:var(--text-primary)] whitespace-nowrap">
          {label}
        </span>
        <span className="text-[10.5px] font-mono text-[color:var(--text-muted)]">
          {time} ago
        </span>
      </span>
    </motion.div>
  );
}
