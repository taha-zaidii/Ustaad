"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Menu,
  X,
  ArrowRight,
  ArrowLeftRight,
  LogOut,
  Languages,
} from "lucide-react";
import Link from "next/link";
import UserMenu from "./UserMenu";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAuth, useClerk } from "@clerk/nextjs";

/**
 * Navbar — calm, sticky, accessible.
 *
 * Design notes
 *   - One row of content. No big logo flourishes, no scrolling progress bar
 *     to flicker on every scroll. The bar only adds a soft border + subtle
 *     surface once the user scrolls past the hero.
 *   - Brand mark = wordmark, not a coloured square + Beta pill.
 *   - Language toggle is a real button with both labels visible so the
 *     user can see which language they're switching to.
 *   - Mobile drawer is a vertical column with proper focus order.
 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { lang, setLang, t } = useLanguage();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: t("nav.browse_jobs"), href: "/browse-jobs" },
    { label: t("nav.freelancers"), href: "/freelancers" },
    { label: t("nav.how_it_works"), href: "/how-it-works" },
  ];

  const handleMobileSwitchRole = async () => {
    setOpen(false);
    try {
      const r = await fetch("/api/profile/switch-role", { method: "POST" });
      if (r.ok) window.location.reload();
    } catch {
      /* noop */
    }
  };

  const handleMobileSignOut = async () => {
    setOpen(false);
    await signOut({ redirectUrl: "/" });
  };

  return (
    <header
      className="sticky top-0 z-50 transition-colors"
      style={{
        background: scrolled
          ? "color-mix(in oklab, var(--bg) 88%, transparent)"
          : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : undefined,
        WebkitBackdropFilter: scrolled ? "blur(12px)" : undefined,
        borderBottom: `1px solid ${scrolled ? "var(--border)" : "transparent"}`,
      }}
    >
      <nav className="mx-auto max-w-[1200px] px-5 lg:px-8 h-[68px] flex items-center justify-between gap-6">
        <Link
          href="/"
          aria-label="Ustaad — home"
          className="flex items-baseline gap-2"
        >
          <span
            className="text-[22px] leading-none font-display"
            style={{ color: "var(--text-primary)" }}
          >
            Ustaad
          </span>
          <span className="text-[11px] uppercase tracking-[0.18em] font-mono text-[color:var(--text-muted)]">
            PK
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-2 text-[14px] font-medium rounded-md text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-elevated)] transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "ur" : "en")}
            aria-label={`Switch language to ${lang === "en" ? "Urdu" : "English"}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-elevated)] transition-colors"
          >
            <Languages className="w-3.5 h-3.5" aria-hidden="true" />
            {lang === "en" ? "اردو" : "English"}
          </button>

          {isSignedIn ? (
            <>
              <Link
                href="/post-job"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[14px] font-semibold text-[color:var(--text-inverse)] transition-opacity hover:opacity-90"
                style={{ background: "var(--brand)" }}
              >
                {t("nav.post_job")}
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
              <UserMenu />
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="px-3 py-2 text-[14px] font-medium text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors"
              >
                {t("nav.sign_in")}
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[14px] font-semibold text-[color:var(--text-inverse)] transition-opacity hover:opacity-90"
                style={{ background: "var(--brand)" }}
              >
                {t("nav.sign_up")}
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="lg:hidden p-2 -mr-2 rounded-md hover:bg-[color:var(--bg-elevated)]"
          onClick={() => setOpen((s) => !s)}
        >
          {open ? (
            <X className="w-5 h-5" aria-hidden="true" />
          ) : (
            <Menu className="w-5 h-5" aria-hidden="true" />
          )}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="lg:hidden overflow-hidden border-t"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg)",
            }}
          >
            <div className="px-5 py-4 flex flex-col gap-1">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-3 rounded-md text-[15px] text-[color:var(--text-primary)] hover:bg-[color:var(--bg-elevated)]"
                >
                  {l.label}
                </Link>
              ))}

              <div className="hairline my-2" />

              <button
                type="button"
                onClick={() => setLang(lang === "en" ? "ur" : "en")}
                className="flex items-center gap-2 px-3 py-3 text-left text-[15px] text-[color:var(--text-primary)] hover:bg-[color:var(--bg-elevated)] rounded-md"
              >
                <Languages
                  className="w-4 h-4"
                  style={{ color: "var(--brand)" }}
                  aria-hidden="true"
                />
                {lang === "en" ? "اردو" : "English"}
              </button>

              {isSignedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="px-3 py-3 rounded-md text-[15px] text-[color:var(--text-primary)] hover:bg-[color:var(--bg-elevated)]"
                  >
                    {t("nav.dashboard")}
                  </Link>
                  <button
                    type="button"
                    onClick={handleMobileSwitchRole}
                    className="flex items-center gap-2 px-3 py-3 text-left text-[15px] text-[color:var(--text-primary)] hover:bg-[color:var(--bg-elevated)] rounded-md"
                  >
                    <ArrowLeftRight
                      className="w-4 h-4"
                      style={{ color: "var(--brand)" }}
                      aria-hidden="true"
                    />
                    {t("nav.switch_to_freelancer")}
                  </button>
                  <button
                    type="button"
                    onClick={handleMobileSignOut}
                    className="flex items-center gap-2 px-3 py-3 text-left text-[15px] rounded-md hover:bg-[color:var(--error-soft)]"
                    style={{ color: "var(--error)" }}
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    {t("nav.sign_out")}
                  </button>
                  <Link
                    href="/post-job"
                    onClick={() => setOpen(false)}
                    className="mt-2 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md text-[15px] font-semibold text-[color:var(--text-inverse)]"
                    style={{ background: "var(--brand)" }}
                  >
                    {t("nav.post_job")}
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    onClick={() => setOpen(false)}
                    className="px-3 py-3 rounded-md text-[15px] text-[color:var(--text-primary)] hover:bg-[color:var(--bg-elevated)]"
                  >
                    {t("nav.sign_in")}
                  </Link>
                  <Link
                    href="/sign-up"
                    onClick={() => setOpen(false)}
                    className="mt-2 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md text-[15px] font-semibold text-[color:var(--text-inverse)]"
                    style={{ background: "var(--brand)" }}
                  >
                    {t("nav.sign_up")}
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
