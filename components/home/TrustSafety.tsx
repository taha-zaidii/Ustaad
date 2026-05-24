"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, MessagesSquare, Award } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function TrustSafety() {
  const { t } = useLanguage();
  const pillars = [
    { icon: ShieldCheck,    title: t("home.trust.p1_t"), desc: t("home.trust.p1_d"), tint: "accent" as const },
    { icon: Lock,           title: t("home.trust.p2_t"), desc: t("home.trust.p2_d"), tint: "brand" as const },
    { icon: MessagesSquare, title: t("home.trust.p3_t"), desc: t("home.trust.p3_d"), tint: "accent" as const },
    { icon: Award,          title: t("home.trust.p4_t"), desc: t("home.trust.p4_d"), tint: "brand" as const },
  ];

  return (
    <section className="mx-auto max-w-[1240px] px-5 lg:px-8 py-20 lg:py-28">
      <div className="grid lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5 lg:sticky lg:top-32">
          <span className="eyebrow eyebrow-bilingual">{t("home.trust.eyebrow")}</span>
          <h2 className="mt-4 text-section">
            {t("home.trust.title_a")}{" "}
            <span className="text-grad-brand">{t("home.trust.title_b")}</span>
          </h2>
          <p className="mt-5 text-[15.5px] leading-relaxed text-[color:var(--text-secondary)]">
            {t("home.trust.desc")}
          </p>

          <div className="mt-7 inline-flex items-center gap-3 p-3.5 glass-card">
            <div
              className="w-10 h-10 rounded-xl grid place-items-center"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
              aria-hidden="true"
            >
              <Award className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] uppercase tracking-[0.1em] font-mono text-[color:var(--text-muted)]">
                {t("home.trust.compliant_a")}
              </div>
              <div className="text-[14px] font-semibold text-[color:var(--text-primary)]">
                {t("home.trust.compliant_b")}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
          {pillars.map((p, i) => {
            const Icon = p.icon;
            const tintColor = p.tint === "brand" ? "var(--brand)" : "var(--accent)";
            const tintSoft = p.tint === "brand" ? "var(--brand-soft)" : "var(--accent-soft)";
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="glass-card p-6"
              >
                <div
                  className="w-11 h-11 rounded-xl grid place-items-center mb-4"
                  style={{ background: tintSoft, color: tintColor }}
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
