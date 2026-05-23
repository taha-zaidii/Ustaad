import { Star, MapPin, ArrowRight } from "lucide-react";
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
    <article
      className="group h-full flex flex-col gap-4 rounded-xl p-6 ring-soft transition-colors hover:ring-soft-bright"
      style={{ background: "var(--bg-card)" }}
    >
      <div className="flex items-start gap-4">
        <div
          className="h-12 w-12 shrink-0 rounded-full flex items-center justify-center font-semibold text-[15px]"
          style={{
            background: "var(--brand-soft)",
            color: "var(--brand)",
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
          <span key={skill} className="chip">
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
          <p className="text-[10.5px] uppercase tracking-[0.12em] font-medium text-[color:var(--text-muted)]">
            Starting at
          </p>
          <p className="font-mono font-semibold text-[15.5px] tabular-nums text-[color:var(--text-primary)]">
            {hourlyRate}
            <span className="text-[11px] font-medium ml-1 text-[color:var(--text-muted)]">
              /hr
            </span>
          </p>
        </div>
        <Link
          href={`/freelancer/${id}`}
          className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[13px] font-semibold text-[color:var(--text-inverse)] transition-opacity hover:opacity-90"
          style={{ background: "var(--brand)" }}
        >
          View
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
};

export default FreelancerCard;
