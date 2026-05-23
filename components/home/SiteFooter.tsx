"use client";

import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
} from "lucide-react";

const linkGroups = [
  {
    heading: "For workers",
    links: [
      { label: "Create profile",     href: "/sign-up" },
      { label: "Browse jobs",        href: "/browse-jobs" },
      { label: "Skill test",         href: "/sign-up" },
      { label: "Payments & fees",    href: "/how-it-works" },
    ],
  },
  {
    heading: "For clients",
    links: [
      { label: "Post a job",         href: "/post-job" },
      { label: "Find talent",        href: "/freelancers" },
      { label: "Pricing",            href: "/how-it-works" },
      { label: "Business plans",     href: "/contact" },
    ],
  },
  {
    heading: "Ustaad",
    links: [
      { label: "About us",           href: "/about" },
      { label: "How it works",       href: "/how-it-works" },
      { label: "Contact",            href: "/contact" },
      { label: "Privacy policy",     href: "/privacy" },
    ],
  },
  {
    heading: "Help",
    links: [
      { label: "Help center",        href: "/contact" },
      { label: "Trust & safety",     href: "/privacy" },
      { label: "Sign in",            href: "/sign-in" },
      { label: "Sign up",            href: "/sign-up" },
    ],
  },
];

// Real social profiles slot in once the brand pages exist. Until then
// these render as disabled spans — no dead "#" anchors.
const socials: { Icon: typeof Facebook; href: string | null; label: string }[] = [
  { Icon: Facebook,  href: null, label: "Facebook"  },
  { Icon: Instagram, href: null, label: "Instagram" },
  { Icon: Twitter,   href: null, label: "Twitter"   },
  { Icon: Youtube,   href: null, label: "YouTube"   },
];

export default function SiteFooter() {
  return (
    <footer
      className="border-t"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg-sunken)",
      }}
    >
      <div className="mx-auto max-w-[1200px] px-5 lg:px-8 py-16">
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-[22px] font-display text-[color:var(--text-primary)]">
                Ustaad
              </span>
              <span className="text-[11px] uppercase tracking-[0.18em] font-mono text-[color:var(--text-muted)]">
                PK
              </span>
            </div>
            <p className="text-[14px] leading-relaxed mb-6 max-w-sm text-[color:var(--text-secondary)]">
              Pakistan&apos;s workforce marketplace. Verified workers,
              transparent pricing, AI-matched proposals — from Karachi to
              Peshawar.
            </p>

            <div className="flex flex-col gap-2 text-[13px] text-[color:var(--text-secondary)]">
              <a
                href="tel:0300878223"
                className="inline-flex items-center gap-2 hover:text-[color:var(--brand)] transition-colors"
              >
                <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="font-mono">0300-USTAAD (878223)</span>
              </a>
              <a
                href="mailto:salam@ustaad.pk"
                className="inline-flex items-center gap-2 hover:text-[color:var(--brand)] transition-colors"
              >
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                salam@ustaad.pk
              </a>
              <span className="inline-flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                NIC, Plot 49, Korangi Creek, Karachi
              </span>
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {linkGroups.map((g) => (
              <div key={g.heading}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-4 font-mono text-[color:var(--text-muted)]">
                  {g.heading}
                </div>
                <ul className="flex flex-col gap-2.5">
                  {g.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-[14px] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div
          className="mt-14 pt-7 border-t flex flex-wrap items-center justify-between gap-4"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="text-[12.5px] text-[color:var(--text-muted)]">
            © {new Date().getFullYear()} Ustaad Technologies (Pvt) Ltd · Made in Pakistan
          </div>

          <div className="flex items-center gap-1.5">
            {socials.map(({ Icon, href, label }) =>
              href ? (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-md flex items-center justify-center text-[color:var(--text-secondary)] hover:text-[color:var(--brand)] hover:bg-[color:var(--brand-soft)] transition-colors ring-soft"
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </a>
              ) : (
                <span
                  key={label}
                  aria-label={`${label} — coming soon`}
                  title="Coming soon"
                  className="w-9 h-9 rounded-md flex items-center justify-center opacity-40 cursor-not-allowed text-[color:var(--text-muted)] ring-soft"
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
