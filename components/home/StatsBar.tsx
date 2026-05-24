"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, animate } from "framer-motion";
import { Users, Building2, MapPin, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const fmt = (n: number) =>
  n >= 1000 ? Math.round(n).toLocaleString("en-US") : Math.round(n).toString();

function Counter({
  value,
  suffix,
  start,
}: {
  value: number;
  suffix: string;
  start: boolean;
}) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(start ? fmt(value) + suffix : "0" + suffix);

  useEffect(() => {
    if (!start) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(fmt(value) + suffix);
      return;
    }
    const controls = animate(mv, value, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(fmt(v) + suffix),
    });
    return controls.stop;
  }, [start, value, suffix, mv]);

  return <>{display}</>;
}

export default function StatsBar() {
  const { t } = useLanguage();
  const root = useRef<HTMLElement>(null);
  const inView = useInView(root, { once: true, margin: "-15%" });

  const stats = [
    {
      value: 10000,
      suffix: "+",
      icon: Users,
      label: t("home.stats.workers"),
      detail: t("home.stats.workers_d"),
      tint: "brand" as const,
    },
    {
      value: 500,
      suffix: "+",
      icon: Building2,
      label: t("home.stats.biz"),
      detail: t("home.stats.biz_d"),
      tint: "accent" as const,
    },
    {
      value: 50,
      suffix: "+",
      icon: MapPin,
      label: t("home.stats.cities"),
      detail: t("home.stats.cities_d"),
      tint: "brand" as const,
    },
    {
      value: 98,
      suffix: "%",
      icon: Sparkles,
      label: t("home.stats.sat"),
      detail: t("home.stats.sat_d"),
      tint: "accent" as const,
    },
  ];

  return (
    <section ref={root} className="relative">
      <div className="mx-auto max-w-[1240px] px-5 lg:px-8 py-16 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="max-w-2xl"
        >
          <span className="eyebrow eyebrow-bilingual">{t("home.stats.eyebrow")}</span>
          <h2 className="mt-4 text-section">
            {t("home.stats.title_a")}{" "}
            <span className="text-grad-brand">{t("home.stats.title_b")}</span>{" "}
            {t("home.stats.title_c")}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--text-secondary)]">
            {t("home.stats.desc")}
          </p>
        </motion.div>

        <dl className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => {
            const Icon = s.icon;
            const tintColor = s.tint === "brand" ? "var(--brand)" : "var(--accent)";
            const tintSoft = s.tint === "brand" ? "var(--brand-soft)" : "var(--accent-soft)";
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.08 + i * 0.06, duration: 0.45 }}
                className="glass-card p-6 flex flex-col gap-3"
              >
                <span
                  className="w-11 h-11 rounded-xl grid place-items-center"
                  style={{ background: tintSoft, color: tintColor }}
                  aria-hidden="true"
                >
                  <Icon className="w-5 h-5" />
                </span>
                <dd
                  className="font-display font-bold tabular-nums leading-none mt-1"
                  style={{
                    fontSize: "clamp(36px, 4.6vw, 56px)",
                    letterSpacing: "-0.025em",
                    color: "var(--text-primary)",
                  }}
                  aria-label={`${s.value}${s.suffix} ${s.label}`}
                >
                  <Counter value={s.value} suffix={s.suffix} start={inView} />
                </dd>
                <dt className="text-[14px] font-medium text-[color:var(--text-primary)]">
                  {s.label}
                </dt>
                <p className="text-[12px] font-mono text-[color:var(--text-muted)]">
                  {s.detail}
                </p>
              </motion.div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
