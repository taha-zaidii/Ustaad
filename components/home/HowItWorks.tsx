"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Search,
  BadgeDollarSign,
  FileEdit,
  Inbox,
  Handshake,
} from "lucide-react";
import { workerSteps, clientSteps } from "./data";

const tabs = [
  { id: "workers", label: "For workers" },
  { id: "clients", label: "For clients" },
] as const;

const workerIcons = [UserPlus, Search, BadgeDollarSign];
const clientIcons = [FileEdit, Inbox, Handshake];

export default function HowItWorks() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("workers");
  const data = tab === "workers" ? workerSteps : clientSteps;
  const Icons = tab === "workers" ? workerIcons : clientIcons;

  return (
    <section className="mx-auto max-w-[1100px] px-5 lg:px-8 py-20 lg:py-28">
      <div className="text-center max-w-xl mx-auto mb-10">
        <span className="eyebrow">How it works</span>
        <h2 className="mt-3 text-section">
          Start in{" "}
          <span className="text-editorial-italic" style={{ color: "var(--brand)" }}>
            three steps.
          </span>
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--text-secondary)]">
          From sign-up to payment, every step is transparent — no surprises.
        </p>
      </div>

      <div className="flex justify-center mb-12">
        <div
          role="tablist"
          aria-label="Audience"
          className="inline-flex p-1 rounded-full ring-soft"
          style={{ background: "var(--bg-card)" }}
        >
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`relative px-5 py-2 rounded-full text-[13px] font-medium transition-colors ${
                  active
                    ? "text-[color:var(--text-inverse)]"
                    : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="how-tab-pill"
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full"
                    style={{ background: "var(--brand)" }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.ol
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="grid md:grid-cols-3 gap-4 md:gap-5"
        >
          {data.map((s, i) => {
            const Icon = Icons[i];
            return (
              <li
                key={s.num}
                className="relative p-6 rounded-xl ring-soft"
                style={{ background: "var(--bg-card)" }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="w-10 h-10 rounded-md grid place-items-center"
                    style={{
                      background: "var(--brand-soft)",
                      color: "var(--brand)",
                    }}
                    aria-hidden="true"
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="font-mono text-[12px] text-[color:var(--text-muted)] tabular-nums">
                    Step {s.num}
                  </span>
                </div>
                <h3 className="text-card-title mb-2">{s.title}</h3>
                <p className="text-[14.5px] leading-relaxed text-[color:var(--text-secondary)]">
                  {s.desc}
                </p>
              </li>
            );
          })}
        </motion.ol>
      </AnimatePresence>
    </section>
  );
}
