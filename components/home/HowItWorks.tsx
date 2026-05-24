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
import { useLanguage } from "@/lib/i18n/LanguageContext";

const workerIcons = [UserPlus, Search, BadgeDollarSign];
const clientIcons = [FileEdit, Inbox, Handshake];

export default function HowItWorks() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<"workers" | "clients">("workers");
  const data = tab === "workers" ? workerSteps : clientSteps;
  const Icons = tab === "workers" ? workerIcons : clientIcons;

  const tabs = [
    { id: "workers" as const, label: t("home.how.for_workers") },
    { id: "clients" as const, label: t("home.how.for_clients") },
  ];

  return (
    <section className="mx-auto max-w-[1240px] px-5 lg:px-8 py-20 lg:py-28">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="eyebrow eyebrow-bilingual">{t("home.how.eyebrow")}</span>
        <h2 className="mt-4 text-section">
          {t("home.how.title_a")}{" "}
          <span className="text-grad-brand">{t("home.how.title_b")}</span>
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--text-secondary)]">
          {t("home.how.desc")}
        </p>
      </div>

      <div className="flex justify-center mb-12">
        <div
          role="tablist"
          aria-label="Audience"
          className="glass-pill inline-flex p-1"
        >
          {tabs.map((tab_) => {
            const active = tab === tab_.id;
            return (
              <button
                key={tab_.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(tab_.id)}
                className={`relative px-5 py-2 rounded-full text-[13px] font-semibold transition-colors ${
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
                    style={{ background: "var(--grad-brand)" }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative">{tab_.label}</span>
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
          className="grid md:grid-cols-3 gap-5 relative"
        >
          {/* Dotted connector — desktop only */}
          <svg
            className="hidden md:block absolute left-[18%] right-[18%] top-[58px] -z-[1]"
            height="2"
            preserveAspectRatio="none"
            viewBox="0 0 600 2"
            aria-hidden="true"
          >
            <path
              d="M 0 1 L 600 1"
              stroke="var(--border-bright)"
              strokeWidth="2"
              strokeDasharray="2 8"
              strokeLinecap="round"
              fill="none"
            />
          </svg>

          {data.map((s, i) => {
            const Icon = Icons[i];
            return (
              <li
                key={s.num}
                className="glass-card p-6 relative"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="relative w-12 h-12 rounded-xl grid place-items-center font-display font-bold text-[14px]"
                    style={{
                      background: "var(--grad-brand)",
                      color: "var(--text-inverse)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.3), 0 6px 18px -6px var(--brand-glow)",
                    }}
                    aria-hidden="true"
                  >
                    <Icon className="w-5 h-5" />
                    <span
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full grid place-items-center text-[11px] font-mono font-semibold glass"
                      style={{ color: "var(--brand)" }}
                    >
                      {s.num}
                    </span>
                  </span>
                  <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    {t("home.how.step")} {s.num}
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
