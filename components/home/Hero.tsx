"use client";

import { motion } from "framer-motion";
import { MapPin, Wrench, ArrowRight, Check } from "lucide-react";
import { cities, categories } from "./data";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * Hero — quiet, content-first.
 *
 * The previous hero used character-by-character splits, magnetic buttons,
 * cursor-parallax orbs, and a 168px display font. Lots of motion, very
 * little signal. This rewrite keeps a single editorial composition:
 *
 *   - One headline, three lines, displayed at a humane size (clamps from
 *     40px → 84px).
 *   - The brand word is italicised in the display serif as the only
 *     typographic accent — no SVG underlines, no scale-from-0.3 dramatics.
 *   - One search lockup, sized for fingers on phones.
 *   - Trust chips appear via a single fade-up, no stagger trickery.
 *
 * Motion respects prefers-reduced-motion via the CSS layer in
 * globals.css — no extra runtime checks needed here.
 */
export default function Hero() {
  const { t } = useLanguage();

  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: (delay = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] as const },
    }),
  };

  return (
    <section className="relative overflow-hidden">
      {/* One very soft, very large radial wash — no orbs, no noise grids. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none bg-grad-hero"
      />

      <div className="mx-auto max-w-[1100px] px-5 lg:px-8 pt-20 pb-24 lg:pt-28 lg:pb-32">
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          custom={0}
          className="text-center"
        >
          <span className="eyebrow">
            <span className="live-pulse" aria-hidden="true" />
            {t("hero.pill")}
          </span>

          <motion.h1
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={0.05}
            className="mt-6 text-hero"
          >
            {t("hero.line1")}{" "}
            <span className="text-editorial-italic" style={{ color: "var(--brand)" }}>
              {t("hero.line2_brand")}
            </span>{" "}
            {t("hero.line2_post")}
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={0.15}
            className="mt-6 mx-auto max-w-[640px] text-[16px] sm:text-[18px] leading-relaxed text-[color:var(--text-secondary)]"
          >
            {t("hero.sub_lead")} {t("hero.sub_mid")}{" "}
            <span className="text-editorial-italic">{t("hero.sub_accent")}</span>
            {t("hero.sub_tail")}
          </motion.p>

          {/* Search lockup */}
          <motion.form
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={0.25}
            action="/browse-jobs"
            method="get"
            className="mt-10 mx-auto max-w-[720px]"
          >
            <div
              className="flex flex-col sm:flex-row items-stretch rounded-2xl sm:rounded-full overflow-hidden ring-soft"
              style={{
                background: "var(--bg-card)",
                boxShadow: "var(--shadow-3)",
              }}
            >
              <label className="flex-1 min-w-0 flex items-center gap-3 px-5 py-3 border-b sm:border-b-0 sm:border-r" style={{ borderColor: "var(--border)" }}>
                <MapPin
                  className="w-4 h-4 shrink-0"
                  style={{ color: "var(--brand)" }}
                  aria-hidden="true"
                />
                <span className="flex flex-col flex-1 leading-tight min-w-0">
                  <span className="text-[10.5px] uppercase tracking-[0.14em] font-medium text-[color:var(--text-muted)]">
                    {t("hero.search_city")}
                  </span>
                  <select
                    name="location"
                    aria-label={t("hero.search_city")}
                    defaultValue="Karachi"
                    className="bg-transparent outline-none font-medium text-[15px] text-[color:var(--text-primary)] truncate cursor-pointer"
                  >
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <label className="flex-1 min-w-0 flex items-center gap-3 px-5 py-3">
                <Wrench
                  className="w-4 h-4 shrink-0"
                  style={{ color: "var(--brand)" }}
                  aria-hidden="true"
                />
                <span className="flex flex-col flex-1 leading-tight min-w-0">
                  <span className="text-[10.5px] uppercase tracking-[0.14em] font-medium text-[color:var(--text-muted)]">
                    {t("hero.search_kind")}
                  </span>
                  <select
                    name="category"
                    aria-label={t("hero.search_kind")}
                    defaultValue="Electrician"
                    className="bg-transparent outline-none font-medium text-[15px] text-[color:var(--text-primary)] truncate cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.nameEn} value={c.nameEn}>
                        {c.nameEn}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 sm:m-1.5 sm:rounded-full text-[15px] font-semibold text-[color:var(--text-inverse)] transition-opacity hover:opacity-90"
                style={{ background: "var(--brand)" }}
              >
                {t("hero.search_btn")}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </motion.form>

          <motion.ul
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={0.35}
            className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-[color:var(--text-secondary)]"
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
                  style={{ color: "var(--success)" }}
                  aria-hidden="true"
                />
                {label}
              </li>
            ))}
          </motion.ul>
        </motion.div>
      </div>
    </section>
  );
}
