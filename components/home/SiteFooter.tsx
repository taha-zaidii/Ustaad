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
import { useLanguage } from "@/lib/i18n/LanguageContext";

const socials: { Icon: typeof Facebook; href: string | null; label: string }[] = [
  { Icon: Facebook, href: null, label: "Facebook" },
  { Icon: Instagram, href: null, label: "Instagram" },
  { Icon: Twitter, href: null, label: "Twitter" },
  { Icon: Youtube, href: null, label: "YouTube" },
];

export default function SiteFooter() {
  const { t } = useLanguage();

  const linkGroups = [
    {
      heading: t("footer.workers"),
      links: [
        { label: t("footer.create_profile"), href: "/sign-up" },
        { label: t("footer.browse_jobs"), href: "/browse-jobs" },
        { label: t("footer.skill_test"), href: "/sign-up" },
        { label: t("footer.payments"), href: "/how-it-works" },
      ],
    },
    {
      heading: t("footer.clients"),
      links: [
        { label: t("footer.post_job"), href: "/post-job" },
        { label: t("footer.find_talent"), href: "/freelancers" },
        { label: t("footer.pricing"), href: "/how-it-works" },
        { label: t("footer.business"), href: "/contact" },
      ],
    },
    {
      heading: t("footer.brand"),
      links: [
        { label: t("footer.about"), href: "/about" },
        { label: t("footer.how"), href: "/how-it-works" },
        { label: t("footer.contact"), href: "/contact" },
        { label: t("footer.privacy"), href: "/privacy" },
      ],
    },
    {
      heading: t("footer.help"),
      links: [
        { label: t("footer.help_center"), href: "/contact" },
        { label: t("footer.trust_safety"), href: "/privacy" },
        { label: t("footer.sign_in"), href: "/sign-in" },
        { label: t("footer.sign_up"), href: "/sign-up" },
      ],
    },
  ];

  return (
    <footer
      className="relative border-t mt-16"
      style={{
        borderColor: "var(--border)",
        background:
          "linear-gradient(180deg, transparent 0%, var(--bg-sunken) 100%)",
      }}
    >
      <div className="mx-auto max-w-[1240px] px-5 lg:px-8 py-16">
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <Link href="/" className="flex items-center gap-2.5 mb-5">
              <span
                className="w-9 h-9 rounded-[12px] grid place-items-center text-[15px] font-extrabold font-display"
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
            <p className="text-[14px] leading-relaxed mb-6 max-w-sm text-[color:var(--text-secondary)]">
              {t("footer.tagline")}
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
                        className="text-[14px] text-[color:var(--text-secondary)] hover:text-[color:var(--brand)] transition-colors"
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
            © {new Date().getFullYear()} Ustaad Technologies (Pvt) Ltd · {t("footer.made_in")}
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
                  className="w-9 h-9 rounded-full glass flex items-center justify-center hover:bg-[color:var(--glass-bright)] transition-colors"
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </a>
              ) : (
                <span
                  key={label}
                  aria-label={`${label} — ${t("footer.coming_soon")}`}
                  title={t("footer.coming_soon")}
                  className="w-9 h-9 rounded-full glass flex items-center justify-center opacity-40 cursor-not-allowed text-[color:var(--text-muted)]"
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
