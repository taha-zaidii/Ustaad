"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight } from "lucide-react";
import { categories as seedCategories, type Category } from "./data";

// 3D tilt card
function CategoryCard({ c, idx }: { c: Category; idx: number }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 200, damping: 18 });
  const sy = useSpring(my, { stiffness: 200, damping: 18 });
  const rotateX = useTransform(sy, [-0.5, 0.5], ["8deg", "-8deg"]);
  const rotateY = useTransform(sx, [-0.5, 0.5], ["-10deg", "10deg"]);
  const glowX   = useTransform(sx, [-0.5, 0.5], ["0%", "100%"]);
  const glowY   = useTransform(sy, [-0.5, 0.5], ["0%", "100%"]);

  const Icon = c.icon;

  const handleMove = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!ref.current) return;
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1024px)").matches) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top)  / r.height - 0.5);
  };
  const handleLeave = () => { mx.set(0); my.set(0); };

  return (
    <motion.a
      ref={ref}
      href={`/browse-jobs?category=${encodeURIComponent(c.nameEn)}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      data-cursor="link"
      className="cat-card group relative rounded-[18px] p-5 sm:p-6 cursor-pointer overflow-hidden preserve-3d"
      style={{
        rotateX,
        rotateY,
        transformPerspective: 800,
        background: "var(--bg-card)",
        boxShadow: "inset 0 0 0 1px var(--border)",
      }}
    >
      {/* Hover spotlight following cursor */}
      <motion.div
        aria-hidden
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: useTransform(
            [glowX, glowY] as any,
            ([gx, gy]: any) =>
              `radial-gradient(220px 200px at ${gx} ${gy}, ${c.color}30, transparent 70%)`
          ),
          boxShadow: `inset 0 0 0 1px ${c.color}55`,
        }}
      />

      {/* Big background ghost icon */}
      <div className="absolute -bottom-3 -right-3 opacity-[0.07] pointer-events-none transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12">
        <Icon className="w-28 h-28" style={{ color: c.color }} strokeWidth={1.4} />
      </div>

      {/* Index numeral */}
      <span
        className="absolute top-3 right-3 text-[10.5px] font-mono tabular-nums uppercase tracking-[0.16em]"
        style={{ color: "var(--text-muted)" }}
      >
        {String(idx + 1).padStart(2, "0")}
      </span>

      {/* Icon tile */}
      <motion.div
        whileHover={{ rotate: -8 }}
        transition={{ type: "spring", stiffness: 380, damping: 16 }}
        className="relative w-12 h-12 rounded-[12px] flex items-center justify-center mb-5"
        style={{ background: `${c.color}20`, color: c.color }}
      >
        <Icon className="w-[24px] h-[24px]" strokeWidth={2} />
      </motion.div>

      {/* Name */}
      <div className="relative">
        <div
          className="text-[16px] font-semibold mb-0.5 leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
          dir="rtl"
          lang="ur"
        >
          {c.nameUr}
        </div>
        <div
          className="text-[14px] mb-4 font-editorial italic"
          style={{
            color: "var(--text-secondary)",
            fontVariationSettings: '"opsz" 144',
          }}
        >
          {c.nameEn}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[11px] font-mono font-semibold tracking-wide"
            style={{ color: c.color }}
          >
            {c.jobs} kaam available
          </span>
          <ArrowUpRight
            className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            style={{ color: c.color }}
          />
        </div>
      </div>
    </motion.a>
  );
}

const containerV: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.04 } },
};

export default function CategoryGrid() {
  const root = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<Category[]>(seedCategories);

  useEffect(() => {
    if (typeof window === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.fromTo(".cat-card",
        { opacity: 0, y: 36 },
        {
          opacity: 1, y: 0, duration: 0.6, ease: "power2.out",
          stagger: { each: 0.05, from: "start" },
          scrollTrigger: { trigger: root.current, start: "top 80%", once: true },
        });
    }, root);
    return () => ctx.revert();
  }, []);

  // Pull live job counts from the DB but keep the seed icons/colours since
  // the API only returns icon names as strings, not Lucide components.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/categories", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const rows: any[] = Array.isArray(data?.categories) ? data.categories : [];
        if (cancelled || rows.length === 0) return;
        const byName: Record<string, { count: number }> = {};
        for (const r of rows) {
          const name = String(r.title || "").trim();
          const n = parseInt(String(r.count || "").replace(/[^\d]/g, ""), 10);
          if (name) byName[name.toLowerCase()] = { count: isNaN(n) ? 0 : n };
        }
        setItems((prev) =>
          prev.map((c) => {
            const hit = byName[c.nameEn.toLowerCase()];
            return hit ? { ...c, jobs: hit.count } : c;
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
    <section ref={root} className="py-28 lg:py-36 relative">
      <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex items-end justify-between flex-wrap gap-8 mb-16"
        >
          <div className="max-w-3xl">
            <span
              className="inline-block text-[11px] uppercase tracking-[0.24em] font-mono mb-4"
              style={{ color: "var(--brand)" }}
            >
              ✦ §03 — Categories
            </span>
            <h2 className="text-section">
              Twelve trades.
              <br />
              <span className="text-editorial-italic" style={{ color: "var(--brand)" }}>
                One marketplace.
              </span>
            </h2>
            <p className="mt-5 text-[16px] max-w-xl"
               style={{ color: "var(--text-secondary)" }}>
              Bijli ke kaam se le kar baghbani tak — Pakistan ke har shehar mein
              verified pros, ek tap door.
            </p>
          </div>
          <motion.a
            href="/browse-jobs"
            data-cursor="link"
            whileHover={{ x: 6 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="inline-flex items-center gap-2 text-[14px] font-semibold tracking-wide"
            style={{ color: "var(--brand)" }}
          >
            Browse all categories
            <ArrowUpRight className="w-4 h-4" />
          </motion.a>
        </motion.div>

        {/* Grid */}
        <motion.div
          variants={containerV}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 perspective-1000"
        >
          {items.map((c, idx) => (
            <CategoryCard key={c.nameEn} c={c} idx={idx} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
