"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { testimonials } from "./data";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function Testimonials() {
  const { t } = useLanguage();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const cur = testimonials[idx];

  useEffect(() => {
    if (paused) return;
    const id = setInterval(
      () => setIdx((i) => (i + 1) % testimonials.length),
      7000
    );
    return () => clearInterval(id);
  }, [paused]);

  const go = (dir: 1 | -1) =>
    setIdx((i) => (i + dir + testimonials.length) % testimonials.length);

  return (
    <section
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className="relative"
    >
      <div className="mx-auto max-w-[1100px] px-5 lg:px-8 py-24 lg:py-32">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="eyebrow eyebrow-bilingual">{t("home.testimonials.eyebrow")}</span>
          <h2 className="mt-4 text-section">
            {t("home.testimonials.title_a")}{" "}
            <span className="text-grad-brand">{t("home.testimonials.title_b")}</span>
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="glass-card glass-edge p-8 sm:p-12 relative"
        >
          <Quote
            aria-hidden="true"
            className="absolute top-6 left-6 w-12 h-12 opacity-20"
            style={{ color: "var(--brand)" }}
          />

          <AnimatePresence mode="wait">
            <motion.blockquote
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="relative text-center text-[color:var(--text-primary)] font-display font-medium"
              style={{
                fontSize: "clamp(22px, 3vw, 36px)",
                lineHeight: 1.3,
                letterSpacing: "-0.012em",
              }}
            >
              {cur.quote}
            </motion.blockquote>
          </AnimatePresence>

          <div className="mt-10 flex items-center justify-between gap-6 flex-wrap">
            <AnimatePresence mode="wait">
              <motion.div
                key={idx + "-meta"}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-3"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-semibold font-display"
                  style={{
                    background: "var(--grad-brand)",
                    color: "var(--text-inverse)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.3), 0 6px 14px -4px var(--brand-glow)",
                  }}
                  aria-hidden="true"
                >
                  {cur.initials}
                </div>
                <div className="text-left">
                  <div className="text-[14.5px] font-semibold text-[color:var(--text-primary)]">
                    {cur.name}
                  </div>
                  <div className="text-[12.5px] text-[color:var(--text-secondary)]">
                    {cur.role} · {cur.city}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={t("home.testimonials.prev")}
                className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-[color:var(--glass-bright)] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label={t("home.testimonials.next")}
                className="btn-brand w-10 h-10 p-0"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="mt-8 flex justify-center gap-1.5" role="tablist" aria-label="Testimonials">
            {testimonials.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === idx}
                aria-label={`Go to testimonial ${i + 1}`}
                onClick={() => setIdx(i)}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === idx ? 28 : 8,
                  background: i === idx ? "var(--brand)" : "var(--border-bright)",
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
