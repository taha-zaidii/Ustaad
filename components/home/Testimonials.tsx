"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Asterisk } from "lucide-react";
import { testimonials } from "./data";
import Marquee from "./Marquee";

export default function Testimonials() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const t = testimonials[idx];

  // Auto-advance every 7s, but pause when the user is hovering or has any
  // element inside the section focused (keyboard-readers, screen-readers).
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
      className="relative py-28 lg:py-36 overflow-hidden border-y"
      style={{ borderColor: "var(--border)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {/* Top + bottom marquee bands — opposite directions */}
      <div className="absolute inset-x-0 top-0 opacity-[0.08] pointer-events-none">
        <Marquee speed="slow">
          {["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta"].map(c => (
            <span key={`t-${c}`} className="px-8 text-[64px] font-extrabold tracking-tighter"
                  style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
              {c} <Asterisk className="inline w-8 h-8 -mt-3" style={{ color: "var(--brand)" }} />
            </span>
          ))}
        </Marquee>
      </div>
      <div className="absolute inset-x-0 bottom-0 opacity-[0.08] pointer-events-none">
        <Marquee speed="slow" reverse>
          {["Hyderabad", "Sialkot", "Gujranwala", "Bahawalpur", "Sargodha", "Mardan", "Sukkur"].map(c => (
            <span key={`b-${c}`} className="px-8 text-[64px] font-extrabold tracking-tighter italic text-editorial-italic"
                  style={{ color: "var(--text-primary)", fontFamily: "var(--font-editorial)" }}>
              {c} ✦
            </span>
          ))}
        </Marquee>
      </div>

      <div className="max-w-[1400px] mx-auto px-5 lg:px-8 relative">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-[11px] uppercase tracking-[0.24em] font-mono mb-4"
                style={{ color: "var(--brand)" }}>
            ✦ §08 — Voices
          </span>
          <h2 className="text-section">
            What people are{" "}
            <span className="text-editorial-italic" style={{ color: "var(--brand)" }}>saying.</span>
          </h2>
          <p className="mt-3 text-[16px]" style={{ color: "var(--text-secondary)" }}>
            Pakistan bhar se asli stories — workers, clients, businesses.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.blockquote
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative font-editorial italic font-semibold leading-[1.05] mb-12 max-w-[18ch] mx-auto text-center"
              style={{
                color: "var(--text-primary)",
                fontSize: "clamp(34px, 4.5vw, 60px)",
                fontVariationSettings: '"opsz" 144, "WONK" 1, "SOFT" 100',
                letterSpacing: "-0.025em",
              }}
            >
              <span className="inline-block" style={{ color: "var(--brand)" }}>"</span>
              {t.quote}
              <span className="inline-block" style={{ color: "var(--brand)" }}>"</span>
            </motion.blockquote>
          </AnimatePresence>

          <div className="flex items-center justify-between gap-6 flex-wrap">
            <AnimatePresence mode="wait">
              <motion.div
                key={idx + "-meta"}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-3"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-[14px]"
                  style={{
                    background: `linear-gradient(135deg, ${t.accent}, var(--brand))`,
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="font-semibold text-[15px]"
                       style={{ fontFamily: "var(--font-display)" }}>
                    {t.name}
                  </div>
                  <div className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                    {t.role} · {t.city}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => go(-1)}
                aria-label="Previous"
                data-cursor="link"
                className="w-11 h-11 rounded-full flex items-center justify-center ring-soft hover:ring-soft-bright transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => go(1)}
                aria-label="Next"
                data-cursor="link"
                className="w-11 h-11 rounded-full flex items-center justify-center text-white"
                style={{ background: "var(--grad-brand)" }}
              >
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {/* Pager dots */}
          <div className="flex justify-center gap-2 mt-9">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Go to testimonial ${i + 1}`}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === idx ? 32 : 8,
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
