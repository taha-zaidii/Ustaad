"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { testimonials } from "./data";

export default function Testimonials() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const t = testimonials[idx];

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
      className="border-y"
      style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
    >
      <div className="mx-auto max-w-[1000px] px-5 lg:px-8 py-24 lg:py-32">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="eyebrow">Voices</span>
          <h2 className="mt-3 text-section">
            What people are{" "}
            <span className="text-editorial-italic" style={{ color: "var(--brand)" }}>
              saying.
            </span>
          </h2>
        </div>

        <div className="relative">
          <Quote
            aria-hidden="true"
            className="absolute -top-2 left-0 w-10 h-10 opacity-15"
            style={{ color: "var(--brand)" }}
          />

          <AnimatePresence mode="wait">
            <motion.blockquote
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="relative text-center font-display text-[color:var(--text-primary)]"
              style={{
                fontSize: "clamp(24px, 3.4vw, 38px)",
                lineHeight: 1.25,
                letterSpacing: "-0.005em",
              }}
            >
              {t.quote}
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
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold"
                  style={{
                    background: "var(--brand-soft)",
                    color: "var(--brand)",
                  }}
                  aria-hidden="true"
                >
                  {t.initials}
                </div>
                <div className="text-left">
                  <div className="text-[14.5px] font-semibold text-[color:var(--text-primary)]">
                    {t.name}
                  </div>
                  <div className="text-[12.5px] text-[color:var(--text-secondary)]">
                    {t.role} · {t.city}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous testimonial"
                className="w-10 h-10 rounded-full flex items-center justify-center ring-soft hover:ring-soft-bright transition-colors"
                style={{ background: "var(--bg-card)" }}
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next testimonial"
                className="w-10 h-10 rounded-full flex items-center justify-center text-[color:var(--text-inverse)] transition-opacity hover:opacity-90"
                style={{ background: "var(--brand)" }}
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
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: i === idx ? 24 : 8,
                  background: i === idx ? "var(--brand)" : "var(--border-bright)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
