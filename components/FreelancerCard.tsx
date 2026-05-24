import { Star, MapPin, ArrowRight, BadgeCheck } from "lucide-react";
import Link from "next/link";

interface FreelancerCardProps {
  id: string;
  name: string;
  title: string;
  location: string;
  rating: number;
  reviews: number;
  skills: string[];
  hourlyRate: string;
  avatar?: string;
}

const FreelancerCard = ({
  id,
  name,
  title,
  location,
  rating,
  reviews,
  skills,
  hourlyRate,
  avatar,
}: FreelancerCardProps) => {
  return (
    <article className="glass-card glass-edge h-full flex flex-col gap-4 p-6">
      <div className="flex items-start gap-4">
        <div
          className="relative h-12 w-12 shrink-0 rounded-full flex items-center justify-center font-semibold text-[15px] font-display"
          style={{
            background: "var(--grad-brand)",
            color: "var(--text-inverse)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.3), 0 6px 14px -4px var(--brand-glow)",
          }}
          aria-hidden={avatar ? "false" : "true"}
        >
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            (name || "?").charAt(0).toUpperCase()
          )}
          <span
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full grid place-items-center"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border-bright)",
            }}
          >
            <BadgeCheck
              className="w-4 h-4"
              style={{ color: "var(--accent)" }}
              aria-hidden="true"
            />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="truncate text-[15px] font-semibold leading-tight text-[color:var(--text-primary)]">
            {name}
          </h3>
          <p className="text-[13.5px] truncate text-[color:var(--text-secondary)]">
            {title}
          </p>
          <div className="mt-1 inline-flex items-center text-[12.5px] gap-1 text-[color:var(--text-muted)]">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {location}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 star-row">
        <div className="flex">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star
              key={i}
              className="w-3.5 h-3.5"
              style={{
                color:
                  i < Math.round(Number(rating) || 0)
                    ? "var(--brand)"
                    : "var(--border-bright)",
              }}
              fill="currentColor"
              aria-hidden="true"
            />
          ))}
        </div>
        <span className="text-[13px] font-mono font-semibold tabular-nums">
          {rating}
        </span>
        <span className="text-[12px] text-[color:var(--text-muted)]">
          ({reviews} reviews)
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {skills.slice(0, 3).map((skill) => (
          <span key={skill} className="chip chip-brand">
            {skill}
          </span>
        ))}
        {skills.length > 3 && (
          <span className="chip">+{skills.length - 3} more</span>
        )}
      </div>

      <div className="hairline mt-auto" />

      <div className="flex items-center justify-between gap-3">
        <div className="leading-tight">
          <p className="text-[10.5px] uppercase tracking-[0.12em] font-mono text-[color:var(--text-muted)]">
            Starting at
          </p>
          <p className="font-mono font-semibold text-[15.5px] tabular-nums text-[color:var(--text-primary)]">
            {hourlyRate}
            <span className="text-[11px] font-medium ml-1 text-[color:var(--text-muted)]">
              /hr
            </span>
          </p>
        </div>
        <Link href={`/freelancer/${id}`} className="btn-brand">
          View
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
};

export default FreelancerCard;
