"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Menu,
  X,
  ArrowRight,
  ArrowLeftRight,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import UserMenu from "./UserMenu";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAuth, useClerk } from "@clerk/nextjs";

/**
 * Navbar — Liquid Glass header with first-class bilingual switch.
 *
 *   - Transparent until scroll, then becomes a translucent glass bar.
 *   - Brand mark = "U" tile (saffron gradient) + wordmark.
 *   - Language pill ALWAYS shows both labels so the user can see the
 *     state and the target language at the same time.
 *   - Primary CTA is a saffron pill — the single biggest action.
 *   - Mobile drawer is its own glass surface (not a transparent flyout).
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
      className="sticky top-0 z-50 transition-[background,backdrop-filter,border-color] duration-300"
      style={{
        background: scrolled ? "color-mix(in oklab, var(--bg) 70%, transparent)" : "transparent",
        backdropFilter: scrolled ? "blur(20px) saturate(160%)" : undefined,
        WebkitBackdropFilter: scrolled ? "blur(20px) saturate(160%)" : undefined,
        borderBottom: `1px solid ${scrolled ? "var(--border)" : "transparent"}`,
      }}
    >
      <nav className="mx-auto max-w-[1240px] px-5 lg:px-8 h-[72px] flex items-center justify-between gap-6">
        <Link
          href="/"
          aria-label="Ustaad — home"
          className="flex items-center gap-2.5 group"
        >
          <span
            className="relative w-9 h-9 rounded-[12px] grid place-items-center text-[15px] font-extrabold font-display"
            style={{
              background: "var(--grad-brand)",
              color: "var(--text-inverse)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.4), 0 6px 18px -6px var(--brand-glow)",
            }}
          >
            U
          </span>
          <span className="flex flex-col leading-none">
            <span
              className="text-[20px] font-bold tracking-[-0.018em] font-display"
              style={{ color: "var(--text-primary)" }}
            >
              Ustaad
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[color:var(--text-muted)] mt-[3px]">
              PK · Workforce
            </span>
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3.5 py-2 text-[14px] font-medium rounded-full text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--glass-bright)] transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          {/* Bilingual language pill — always shows both labels */}
          <div
            role="group"
            aria-label="Language"
            className="glass-pill inline-flex items-center p-1 text-[12.5px] font-medium"
          >
            <button
              type="button"
              onClick={() => setLang("en")}
              aria-pressed={lang === "en"}
              className={`px-3 py-1 rounded-full transition-colors ${
                lang === "en"
                  ? "text-[color:var(--text-inverse)]"
                  : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
              }`}
              style={
                lang === "en"
                  ? { background: "var(--grad-brand)" }
                  : undefined
              }
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang("ur")}
              aria-pressed={lang === "ur"}
              className={`px-3 py-1 rounded-full transition-colors ${
                lang === "ur"
                  ? "text-[color:var(--text-inverse)]"
                  : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
              }`}
              style={
                lang === "ur"
                  ? { background: "var(--grad-brand)" }
                  : undefined
              }
            >
              اردو
            </button>
          </div>

          {isSignedIn ? (
            <>
              <Link
                href="/post-job"
                className="btn-brand"
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
                className="btn-brand"
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
          className="lg:hidden p-2 -mr-2 rounded-md text-[color:var(--text-primary)] hover:bg-[color:var(--glass-bright)]"
          onClick={() => setOpen((s) => !s)}
        >
          {open ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="lg:hidden overflow-hidden border-t glass"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="px-5 py-4 flex flex-col gap-1">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-3 rounded-lg text-[15px] text-[color:var(--text-primary)] hover:bg-[color:var(--glass-bright)]"
                >
                  {l.label}
                </Link>
              ))}

              <div className="hairline my-2" />

              {/* Mobile language switch — large bilingual pill */}
              <div className="px-3 pt-1">
                <div
                  role="group"
                  aria-label="Language"
                  className="glass-pill inline-flex items-center p-1 text-[13px] font-medium w-full max-w-xs"
                >
                  <button
                    type="button"
                    onClick={() => setLang("en")}
                    aria-pressed={lang === "en"}
                    className={`flex-1 px-4 py-2 rounded-full transition-colors ${
                      lang === "en"
                        ? "text-[color:var(--text-inverse)]"
                        : "text-[color:var(--text-secondary)]"
                    }`}
                    style={
                      lang === "en"
                        ? { background: "var(--grad-brand)" }
                        : undefined
                    }
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang("ur")}
                    aria-pressed={lang === "ur"}
                    className={`flex-1 px-4 py-2 rounded-full transition-colors ${
                      lang === "ur"
                        ? "text-[color:var(--text-inverse)]"
                        : "text-[color:var(--text-secondary)]"
                    }`}
                    style={
                      lang === "ur"
                        ? { background: "var(--grad-brand)" }
                        : undefined
                    }
                  >
                    اردو · Roman Urdu
                  </button>
                </div>
              </div>

              {isSignedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="px-3 py-3 rounded-lg text-[15px] text-[color:var(--text-primary)] hover:bg-[color:var(--glass-bright)]"
                  >
                    {t("nav.dashboard")}
                  </Link>
                  <button
                    type="button"
                    onClick={handleMobileSwitchRole}
                    className="flex items-center gap-2 px-3 py-3 text-left text-[15px] text-[color:var(--text-primary)] hover:bg-[color:var(--glass-bright)] rounded-lg"
                  >
                    <ArrowLeftRight className="w-4 h-4" style={{ color: "var(--brand)" }} aria-hidden="true" />
                    {t("nav.switch_to_freelancer")}
                  </button>
                  <button
                    type="button"
                    onClick={handleMobileSignOut}
                    className="flex items-center gap-2 px-3 py-3 text-left text-[15px] rounded-lg"
                    style={{ color: "var(--error)" }}
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    {t("nav.sign_out")}
                  </button>
                  <Link
                    href="/post-job"
                    onClick={() => setOpen(false)}
                    className="btn-brand mt-2 justify-center"
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
                    className="px-3 py-3 rounded-lg text-[15px] text-[color:var(--text-primary)] hover:bg-[color:var(--glass-bright)]"
                  >
                    {t("nav.sign_in")}
                  </Link>
                  <Link
                    href="/sign-up"
                    onClick={() => setOpen(false)}
                    className="btn-brand mt-2 justify-center"
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
