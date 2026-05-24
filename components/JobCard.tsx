import { Clock, MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";

interface JobCardProps {
  id: string;
  title: string;
  description: string;
  budget: string;
  location: string;
  postedTime: string;
  category: string;
}

const JobCard = ({
  id,
  title,
  description,
  budget,
  location,
  postedTime,
  category,
}: JobCardProps) => {
  return (
    <article className="glass-card glass-edge h-full flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-3">
        <span className="chip chip-brand w-fit">{category}</span>
        <h3 className="text-card-title clamp-2">
          <Link
            href={`/job/${id}`}
            className="hover:text-[color:var(--brand)] transition-colors"
          >
            {title}
          </Link>
        </h3>
      </div>

      <p className="clamp-2 flex-1 text-[14px] leading-relaxed text-[color:var(--text-secondary)]">
        {description}
      </p>

      <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-[color:var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {location}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {postedTime}
        </span>
      </div>

      <div className="hairline" />

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col leading-tight">
          <span className="text-[10.5px] uppercase tracking-[0.12em] font-mono text-[color:var(--text-muted)]">
            Budget
          </span>
          <span className="font-mono font-semibold text-[16px] tabular-nums text-[color:var(--text-primary)]">
            {budget}
          </span>
        </div>
        <Link href={`/job/${id}`} className="btn-brand">
          View
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
};

export default JobCard;
