"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  animate,
} from "framer-motion";

const stats = [
  { value: 10000, suffix: "+", label: "Verified workers",  detail: "CNIC + skill test" },
  { value: 500,   suffix: "+", label: "Businesses served", detail: "Karachi to Peshawar" },
  { value: 50,    suffix: "+", label: "Pakistani cities",  detail: "Live coverage" },
  { value: 98,    suffix: "%", label: "Satisfaction",      detail: "Across 12,000 jobs" },
];

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
  const root = useRef<HTMLElement>(null);
  const inView = useInView(root, { once: true, margin: "-15%" });

  return (
    <section
      ref={root}
      className="border-y"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg-elevated)",
      }}
    >
      <div className="mx-auto max-w-[1100px] px-5 lg:px-8 py-14 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="max-w-2xl"
        >
          <span className="eyebrow">By the numbers</span>
          <h2 className="mt-3 text-section">
            Real workers. Real households.{" "}
            <span className="text-editorial-italic" style={{ color: "var(--brand)" }}>
              Real Pakistan.
            </span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--text-secondary)]">
            Tracked since day one across every city we operate in.
          </p>
        </motion.div>

        <dl className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-8 border-t pt-12" style={{ borderColor: "var(--border)" }}>
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.05 + i * 0.06, duration: 0.4 }}
              className="flex flex-col gap-2"
            >
              <dd
                className="font-display tabular-nums leading-none"
                style={{
                  fontSize: "clamp(40px, 5.4vw, 64px)",
                  letterSpacing: "-0.02em",
                  color: "var(--text-primary)",
                }}
                aria-label={`${s.value}${s.suffix} ${s.label}`}
              >
                <Counter value={s.value} suffix={s.suffix} start={inView} />
              </dd>
              <dt className="text-[14px] font-medium text-[color:var(--text-primary)]">
                {s.label}
              </dt>
              <p className="text-[12.5px] text-[color:var(--text-muted)] font-mono">
                {s.detail}
              </p>
            </motion.div>
          ))}
        </dl>
      </div>
    </section>
  );
}
