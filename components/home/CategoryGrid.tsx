"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { categories as seedCategories, type Category } from "./data";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function CategoryGrid() {
  const { t, lang } = useLanguage();
  const [items, setItems] = useState<Category[]>(seedCategories);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/categories", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const rows: any[] = Array.isArray(data?.categories) ? data.categories : [];
        if (cancelled || rows.length === 0) return;
        const byName: Record<string, number> = {};
        for (const r of rows) {
          const name = String(r.title || "").trim().toLowerCase();
          const n = parseInt(String(r.count || "").replace(/[^\d]/g, ""), 10);
          if (name) byName[name] = isNaN(n) ? 0 : n;
        }
        setItems((prev) =>
          prev.map((c) => {
            const n = byName[c.nameEn.toLowerCase()];
            return n !== undefined ? { ...c, jobs: n } : c;
          })
        );
      } catch {
        /* keep seed counts */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mx-auto max-w-[1240px] px-5 lg:px-8 py-20 lg:py-28">
      <div className="flex items-end justify-between flex-wrap gap-6 mb-10">
        <div className="max-w-2xl">
          <span className="eyebrow eyebrow-bilingual">{t("home.cats.eyebrow")}</span>
          <h2 className="mt-4 text-section">
            {t("home.cats.title_a")}{" "}
            <span className="text-grad-brand">{t("home.cats.title_b")}</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--text-secondary)]">
            {t("home.cats.desc")}
          </p>
        </div>

        <Link
          href="/browse-jobs"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[color:var(--brand)] hover:underline underline-offset-4"
        >
          {t("home.cats.browse_all")}
          <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {items.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.li
              key={c.nameEn}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
            >
              <Link
                href={`/browse-jobs?category=${encodeURIComponent(c.nameEn)}`}
                className="group glass-card flex items-center gap-4 p-4 sm:p-5"
              >
                <span
                  className="w-11 h-11 rounded-xl grid place-items-center shrink-0"
                  style={{
                    background: c.color + "22",
                    color: c.color,
                    boxShadow: `inset 0 1px 0 ${c.color}33`,
                  }}
                  aria-hidden="true"
                >
                  <Icon className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14.5px] font-semibold text-[color:var(--text-primary)] truncate">
                    {c.nameEn}
                  </span>
                  <span className="block text-[12px] font-mono text-[color:var(--text-muted)] tabular-nums">
                    {c.jobs.toLocaleString()} {t("home.cats.unit")}
                  </span>
                </span>
                <ArrowUpRight
                  className="w-4 h-4 shrink-0 text-[color:var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-hidden="true"
                />
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
