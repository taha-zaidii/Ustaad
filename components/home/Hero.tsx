"use client";

import { useEffect, useRef } from "react";
import {
  motion,
  useTransform,
  useMotionValue,
  useSpring,
  type Variants,
} from "framer-motion";
import {
  MapPin,
  Wrench,
  ArrowRight,
  ChevronDown,
  Check,
  Sparkles,
  Asterisk,
} from "lucide-react";
import { cities, categories } from "./data";
import MagneticButton from "./MagneticButton";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function splitToChars(text: string) {
  return text.split(""); // includes spaces; we render &nbsp; for those
}

// Variants — use spring physics so motion has weight, not duration
const containerV: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.022, delayChildren: 0.15 } },
};

const charV: Variants = {
  hidden: { y: "110%", opacity: 0 },
  show:   {
    y: 0, opacity: 1,
    transition: { type: "spring", stiffness: 380, damping: 28, mass: 0.6 },
  },
};

const fadeUp: Variants = {
  hidden: { y: 24, opacity: 0 },
  show:   {
    y: 0, opacity: 1,
    transition: { type: "spring", stiffness: 220, damping: 22, mass: 0.7 },
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Floating tool chip — drifts with the parallax field
// ─────────────────────────────────────────────────────────────────────────

function FloatingChip({
  label,
  icon,
  className,
  depth = 0.4,
  pointerX,
  pointerY,
}: {
  label: string;
  icon: string;
  className: string;
  depth?: number;
  pointerX: ReturnType<typeof useSpring>;
  pointerY: ReturnType<typeof useSpring>;
}) {
  const tx = useTransform(pointerX, (v) => v * depth);
  const ty = useTransform(pointerY, (v) => v * depth);

  return (
    <motion.div
      style={{ x: tx, y: ty }}
      initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ delay: 1.4, type: "spring", stiffness: 140, damping: 16 }}
      className={`absolute hidden md:flex glass items-center gap-2 px-3.5 py-2 rounded-full font-mono text-[12px] ${className}`}
    >
      <span className="text-[15px]">{icon}</span>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────────────────────────────────

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const { t, lang } = useLanguage();

  const lineOne   = t("hero.line1");
  const lineTwoA  = t("hero.line2_pre");
  const brandWord = t("hero.line2_brand");
  const lineEnd   = t("hero.line2_post");

  // Cursor parallax field — every floating element subscribes with its own depth
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spx = useSpring(px, { stiffness: 60, damping: 18, mass: 1.1 });
  const spy = useSpring(py, { stiffness: 60, damping: 18, mass: 1.1 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const onMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      px.set(((e.clientX - cx) / cx) * 24);
      py.set(((e.clientY - cy) / cy) * 24);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [px, py]);

  // (Hero scroll-fade effect removed — title stays fully visible while scrolling.)

  return (
    <section
      ref={root}
      className="relative min-h-[100svh] pt-[120px] pb-24 overflow-hidden flex items-center"
    >
      {/* Ambient background field */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-grad-hero" />
      <div aria-hidden className="absolute inset-0 -z-10 hero-grid" />
      <div aria-hidden className="absolute inset-0 -z-10 hero-noise pointer-events-none" />

      {/* Drifting orbs */}
      <motion.div
        aria-hidden
        style={{ x: spx, y: spy }}
        className="absolute -z-10 -top-32 left-1/2 -translate-x-1/2 w-[820px] h-[820px] rounded-full blur-3xl drift-1"
      >
        <div
          className="w-full h-full rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(249,115,22,0.22), transparent)" }}
        />
      </motion.div>
      <motion.div
        aria-hidden
        style={{ x: useTransform(spx, (v) => v * -0.6), y: useTransform(spy, (v) => v * -0.6) }}
        className="absolute -z-10 top-[42%] -left-32 w-[440px] h-[440px] rounded-full blur-3xl drift-2"
      >
        <div className="w-full h-full rounded-full"
             style={{ background: "radial-gradient(closest-side, rgba(99,102,241,0.16), transparent)" }} />
      </motion.div>
      <motion.div
        aria-hidden
        style={{ x: useTransform(spx, (v) => v * 0.4), y: useTransform(spy, (v) => v * 0.4) }}
        className="absolute -z-10 top-[28%] -right-24 w-[380px] h-[380px] rounded-full blur-3xl drift-3"
      >
        <div className="w-full h-full rounded-full"
             style={{ background: "radial-gradient(closest-side, rgba(168,85,247,0.14), transparent)" }} />
      </motion.div>

      {/* Spinning asterisk in upper right — editorial flourish */}
      <motion.div
        aria-hidden
        className="absolute top-[160px] right-[8%] hidden md:block"
        style={{ x: useTransform(spx, (v) => v * 0.7), y: useTransform(spy, (v) => v * 0.7) }}
      >
        <Asterisk
          className="w-16 h-16 spin-slow"
          style={{ color: "var(--brand)" }}
          strokeWidth={1.2}
        />
      </motion.div>

      {/* Floating tool chips — parallax with cursor */}
      <FloatingChip icon="⚡" label="Wiring fix · 12 min ago"
        className="top-[30%] left-[6%]"  depth={0.6}  pointerX={spx} pointerY={spy} />
      <FloatingChip icon="🔧" label="Plumbing booked"
        className="top-[55%] left-[10%]" depth={0.9}  pointerX={spx} pointerY={spy} />
      <FloatingChip icon="🎨" label="Painter en route"
        className="top-[70%] right-[12%]" depth={0.5} pointerX={spx} pointerY={spy} />
      <FloatingChip icon="❄️" label="AC service · Karachi"
        className="top-[40%] right-[7%]" depth={0.8}  pointerX={spx} pointerY={spy} />

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-5 lg:px-8 w-full relative">
        <motion.div
          initial="hidden"
          animate="show"
          variants={containerV}
          className="text-center max-w-[1200px] mx-auto"
        >
          {/* Pill badge */}
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 ring-soft"
            style={{
              background: "var(--brand-dim)",
              color: "var(--brand)",
              borderColor: "rgba(249,115,22,0.3)",
            }}
          >
            <span className="text-[14px]">🇵🇰</span>
            <span className="text-[12px] font-semibold tracking-[0.06em] font-mono uppercase">
              {t("hero.pill")}
            </span>
            <span className="live-pulse"></span>
          </motion.div>

          {/* H1 — letter-by-letter, with editorial italic accent */}
          <h1 className="text-hero relative" data-cursor="text">
            {/* Line 1 — chars */}
            <motion.span variants={containerV} className="block">
              {splitToChars(lineOne).map((c, i) => (
                <span key={`l1-${i}-${lang}`} className="char-mask">
                  <motion.span variants={charV}>
                    {c === " " ? " " : c}
                  </motion.span>
                </span>
              ))}
            </motion.span>

            {/* Line 2 — Business — Ustaad Hai! with editorial accent */}
            <motion.span variants={containerV} className="block">
              {splitToChars(lineTwoA).map((c, i) => (
                <span key={`l2a-${i}-${lang}`} className="char-mask">
                  <motion.span variants={charV}>
                    {c === " " ? " " : c}
                  </motion.span>
                </span>
              ))}
              <span className="char-mask" aria-hidden>
                <motion.span variants={charV}>{" "}</motion.span>
              </span>

              {/* Brand word — separate dramatic reveal */}
              <motion.span
                initial={{ opacity: 0, scale: 0.3, rotate: -6, y: 60 }}
                animate={{ opacity: 1, scale: 1, rotate: 0,  y: 0  }}
                transition={{
                  delay: 1.05,
                  type: "spring", stiffness: 220, damping: 16, mass: 0.9,
                }}
                className="inline-block text-grad-brand relative"
                style={{
                  fontFamily: "var(--font-editorial)",
                  fontStyle: "italic",
                  fontVariationSettings: '"opsz" 144, "WONK" 1, "SOFT" 100',
                  letterSpacing: "-0.04em",
                  paddingRight: "0.05em",
                }}
              >
                {brandWord}
                {/* Underline swoosh */}
                <motion.svg
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 1.55, duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
                  viewBox="0 0 300 18"
                  preserveAspectRatio="none"
                  aria-hidden
                  className="absolute -bottom-[6%] left-0 right-0 w-full h-[14%]"
                >
                  <motion.path
                    d="M2 12 C 60 4, 140 18, 220 6 S 296 14, 298 8"
                    fill="none"
                    stroke="var(--brand)"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                </motion.svg>
              </motion.span>

              <span className="char-mask" aria-hidden>
                <motion.span variants={charV}>{" "}</motion.span>
              </span>

              {splitToChars(lineEnd).map((c, i) => (
                <span key={`l2b-${i}-${lang}`} className="char-mask">
                  <motion.span variants={charV}>
                    {c === " " ? " " : c}
                  </motion.span>
                </span>
              ))}
            </motion.span>
          </h1>

          {/* Subline */}
          <motion.p
            variants={fadeUp}
            className="mt-9 text-[16px] sm:text-[19px] leading-[1.55] max-w-[640px] mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            <span className="text-editorial-italic" style={{ color: "var(--text-primary)" }}>
              {t("hero.sub_lead")}
            </span>{" "}
            {t("hero.sub_mid")}{" "}
            <span className="text-editorial-italic" style={{ color: "var(--text-primary)" }}>
              {t("hero.sub_accent")}
            </span>
            {t("hero.sub_tail")}
          </motion.p>

          {/* Search bar */}
          <motion.form
            variants={fadeUp}
            action="/browse-jobs"
            method="get"
            className="relative max-w-[820px] mx-auto mt-11"
          >
            <div
              className="flex items-stretch rounded-full bg-white text-slate-900 overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)]"
              style={{ minHeight: 68 }}
            >
              <div className="flex items-center gap-2.5 pl-6 pr-3 flex-1 min-w-0">
                <MapPin className="w-[18px] h-[18px]" style={{ color: "var(--brand)" }} />
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-slate-500">{t("hero.search_city")}</span>
                  <select name="location"
                          className="bg-transparent outline-none font-semibold text-[15px] text-slate-900 truncate cursor-pointer"
                          defaultValue="Karachi" aria-label="Select city">
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="w-px my-3 bg-slate-200" />

              <div className="flex items-center gap-2.5 pl-3 pr-3 flex-1 min-w-0">
                <Wrench className="w-[18px] h-[18px]" style={{ color: "var(--brand)" }} />
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-slate-500">{t("hero.search_kind")}</span>
                  <select name="category"
                          className="bg-transparent outline-none font-semibold text-[15px] text-slate-900 truncate cursor-pointer"
                          defaultValue="Electrician" aria-label="Select service">
                    {categories.map(c => <option key={c.nameEn} value={c.nameEn}>{c.nameEn}</option>)}
                  </select>
                </div>
              </div>

              <MagneticButton
                as="button"
                type="submit"
                strength={28}
                parallax={1.4}
                className="m-1.5 px-7 sm:px-9 rounded-full text-white text-[15px] font-semibold transition flex items-center"
                style={{ background: "var(--grad-brand)" }}
                ariaLabel="Search"
              >
                {t("hero.search_btn")} <ArrowRight className="w-4 h-4" />
              </MagneticButton>
            </div>

            {/* Trust chips */}
            <motion.div
              variants={containerV}
              initial="hidden"
              animate="show"
              className="mt-6 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-[13px]"
              style={{ color: "var(--text-secondary)" }}
            >
              {[
                t("hero.trust_free"),
                t("hero.trust_verified"),
                t("hero.trust_no_fee"),
                t("hero.trust_support"),
              ].map((label) => (
                <motion.span key={`${lang}-${label}`} variants={fadeUp} className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" style={{ color: "var(--success)" }} />
                  {label}
                </motion.span>
              ))}
            </motion.div>
          </motion.form>
        </motion.div>

        {/* Editorial hint label — bottom left */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.8, duration: 0.6 }}
          className="hidden lg:flex items-center gap-3 absolute left-8 bottom-2"
        >
          <Sparkles className="w-4 h-4" style={{ color: "var(--brand)" }} />
          <div className="text-[11px] uppercase tracking-[0.2em] font-mono"
               style={{ color: "var(--text-muted)" }}>
            Issue No. 1 / Pakistan / 2026
          </div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.9, duration: 0.6 }}
          className="absolute right-8 bottom-2 hidden lg:flex flex-col items-center gap-2"
          style={{ color: "var(--text-muted)" }}
        >
          <span className="text-[10px] uppercase tracking-[0.24em] font-mono [writing-mode:vertical-rl] [transform:rotate(180deg)]">
            Scroll to explore
          </span>
          <ChevronDown className="w-4 h-4 scroll-bounce" />
        </motion.div>
      </div>
    </section>
  );
}
