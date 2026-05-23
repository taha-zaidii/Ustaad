"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, MessagesSquare, Award } from "lucide-react";

const pillars = [
  {
    icon: ShieldCheck,
    title: "Verified workers only",
    desc: "CNIC verification, address check, and a skill test before any worker reaches the platform.",
  },
  {
    icon: Lock,
    title: "Escrow-held payments",
    desc: "Your payment is held by Ustaad until the work is signed off — workers can't pull funds early.",
  },
  {
    icon: MessagesSquare,
    title: "24/7 dispute support",
    desc: "WhatsApp, call, or chat — we respond within 30 minutes, in Roman Urdu or English.",
  },
  {
    icon: Award,
    title: "Quality guarantee",
    desc: "Not happy with the work? Free re-do, or 100% refund — no questions asked.",
  },
];

export default function TrustSafety() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 lg:px-8 py-20 lg:py-28">
      <div className="grid lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5 lg:sticky lg:top-32">
          <span className="eyebrow">Trust & safety</span>
          <h2 className="mt-3 text-section">
            Your money and your time —{" "}
            <span className="text-editorial-italic" style={{ color: "var(--brand)" }}>
              both protected.
            </span>
          </h2>
          <p className="mt-5 text-[15.5px] leading-relaxed text-[color:var(--text-secondary)]">
            The hardest problem in Pakistan&apos;s informal labour market is
            trust. Every transaction is transparent, every worker verified,
            every dispute resolved — in Roman Urdu or English.
          </p>

          <div className="mt-7 inline-flex items-center gap-3 p-3 rounded-lg ring-soft" style={{ background: "var(--bg-card)" }}>
            <div
              className="w-9 h-9 rounded-md grid place-items-center"
              style={{
                background: "var(--brand-soft)",
                color: "var(--brand)",
              }}
              aria-hidden="true"
            >
              <Award className="w-[18px] h-[18px]" />
            </div>
            <div className="leading-tight">
              <div className="text-[12px] text-[color:var(--text-muted)] uppercase tracking-[0.1em]">
                SECP registered
              </div>
              <div className="text-[13.5px] font-semibold text-[color:var(--text-primary)]">
                Pakistan compliant
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
          {pillars.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="rounded-xl p-6 ring-soft"
                style={{ background: "var(--bg-card)" }}
              >
                <div
                  className="w-10 h-10 rounded-md grid place-items-center mb-4"
                  style={{
                    background: "var(--brand-soft)",
                    color: "var(--brand)",
                  }}
                  aria-hidden="true"
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-card-title mb-2">{p.title}</h3>
                <p className="text-[14px] leading-relaxed text-[color:var(--text-secondary)]">
                  {p.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
