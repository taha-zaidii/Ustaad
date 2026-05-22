"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { FullPageLoader } from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { toast } from "@/components/ui/use-toast";
import {
  MapPin, Clock, DollarSign, Briefcase, Star,
  FileText, Eye, Users, CheckCircle, XCircle,
  ArrowLeft, Zap, ChevronRight, Send,
} from "lucide-react";

interface Job {
  id: string;
  title: string;
  description: string;
  budget: string;
  budgetMin: number;
  budgetMax: number;
  budgetType: string;
  location: string;
  duration: string;
  postedTime: string;
  category: string;
  skillsRequired: string[];
  proposals: number;
  views: number;
  status: string;
  client: {
    name: string;
    rating: string;
    reviews: number;
    jobsPosted: number;
    hireRate: string;
    memberSince: string;
  };
}

interface Proposal {
  id: string;
  freelancer_name: string;
  freelancer_avatar: string;
  cover_letter: string;
  proposed_budget: number;
  proposed_duration: string;
  status: string;
  hourly_rate: number;
  success_rate: number;
  avg_rating: string;
  review_count: number;
  created_at: string;
}

interface SimilarJob {
  id: string;
  title: string;
  budget: string;
  location: string;
  postedTime: string;
}

interface ProposalForm {
  coverLetter: string;
  proposedBudget: string;
  proposedDuration: string;
}

export default function JobDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { t }    = useLanguage();

  const [job, setJob]                   = useState<Job | null>(null);
  const [similarJobs, setSimilarJobs]   = useState<SimilarJob[]>([]);
  const [proposals, setProposals]       = useState<Proposal[]>([]);
  const [profile, setProfile]           = useState<{ userType: string; id: string } | null>(null);
  const [loading, setLoading]           = useState(true);
  const [fetchState, setFetchState]     = useState<"idle" | "not-found" | "error">("idle");
  const [proposalOpen, setProposalOpen] = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [updatingId, setUpdatingId]     = useState<string | null>(null);
  const [matchScore, setMatchScore]     = useState<{ score: number; explanation: string } | null>(null);
  const [proposalForm, setProposalForm] = useState<ProposalForm>({
    coverLetter: "",
    proposedBudget: "",
    proposedDuration: "",
  });
  const [proposalErrors, setProposalErrors] = useState<{
    coverLetter?: string;
    proposedBudget?: string;
    proposedDuration?: string;
  }>({});

  const COVER_MIN = 30;
  const COVER_MAX = 1500;
  const PROPOSAL_MAX = 10_000_000; // PKR 1 crore

  const jobId = params.id as string;

  useEffect(() => {
    fetchJobData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    if (isLoaded && isSignedIn) fetchProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, jobId]);

  const fetchJobData = async () => {
    try {
      setLoading(true);
      setFetchState("idle");
      const res = await fetch(`/api/jobs/${jobId}`);
      if (res.status === 404) {
        setFetchState("not-found");
        return;
      }
      if (!res.ok) {
        setFetchState("error");
        return;
      }
      const data = await res.json();
      setJob(data.job);
      setSimilarJobs(data.similarJobs || []);
    } catch {
      setFetchState("error");
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      const data = await res.json();
      setProfile({ userType: data.profile.userType, id: data.profile.id });

      if (data.profile.userType === "client") {
        const pRes = await fetch(`/api/proposals?jobId=${jobId}&role=client`);
        if (pRes.ok) {
          const pData = await pRes.json();
          setProposals(pData.proposals || []);
        }
      }
    } catch { /* non-critical */ }
  };

  const validateProposal = () => {
    const errs: typeof proposalErrors = {};
    const cover = proposalForm.coverLetter.trim();
    if (cover.length < COVER_MIN)
      errs.coverLetter = `Tell the client what you'd do — at least ${COVER_MIN} characters.`;
    if (cover.length > COVER_MAX)
      errs.coverLetter = `Keep the cover letter under ${COVER_MAX} characters.`;
    const budget = Number(proposalForm.proposedBudget);
    if (!proposalForm.proposedBudget || isNaN(budget) || budget <= 0)
      errs.proposedBudget = "Enter a positive budget.";
    else if (budget > PROPOSAL_MAX)
      errs.proposedBudget = `Maximum is PKR ${PROPOSAL_MAX.toLocaleString()}.`;
    if (!proposalForm.proposedDuration.trim())
      errs.proposedDuration = "Roughly how long will this take?";
    return errs;
  };

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateProposal();
    setProposalErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast({
        title: "Please review your proposal",
        description: Object.values(errs)[0],
        variant: "destructive",
      });
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          coverLetter: proposalForm.coverLetter.trim(),
          proposedBudget: parseFloat(proposalForm.proposedBudget),
          proposedDuration: proposalForm.proposedDuration.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit proposal");
      }
      toast({ title: "Proposal Submitted!", description: "The client will be notified." });
      setProposalOpen(false);
      setProposalForm({ coverLetter: "", proposedBudget: "", proposedDuration: "" });
      setProposalErrors({});
      fetchJobData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || t("common.error"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleProposalAction = async (proposalId: string, action: "accepted" | "rejected") => {
    try {
      setUpdatingId(proposalId);
      const res = await fetch(`/api/proposals/${proposalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      if (!res.ok) throw new Error("Failed to update proposal");
      setProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? { ...p, status: action } : p))
      );
      toast({
        title: action === "accepted" ? "Proposal Accepted!" : "Proposal Rejected",
        description: action === "accepted" ? "The freelancer has been notified." : "The proposal has been declined.",
      });
    } catch {
      toast({ title: "Error", description: t("common.error"), variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <FullPageLoader />;
  if (fetchState === "not-found") {
    return (
      <>
        <Navigation />
        <main className="min-h-screen pt-[88px] pb-20 flex items-center justify-center">
          <div className="max-w-md mx-auto px-6 text-center space-y-4">
            <h1 className="text-3xl font-bold">Job not found</h1>
            <p className="text-muted-foreground">
              This job may have been removed or the link is incorrect.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => router.push("/browse-jobs")}>
                Browse other jobs
              </Button>
              <Button variant="outline" onClick={() => router.back()}>
                Go back
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }
  if (fetchState === "error") {
    return (
      <>
        <Navigation />
        <main className="min-h-screen pt-[88px] pb-20 flex items-center justify-center">
          <div className="max-w-md mx-auto px-6 text-center space-y-4">
            <h1 className="text-3xl font-bold">Couldn&apos;t load this job</h1>
            <p className="text-muted-foreground">
              Something went wrong reaching the server. Try again in a moment.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={fetchJobData}>Retry</Button>
              <Button variant="outline" onClick={() => router.push("/browse-jobs")}>
                Browse other jobs
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }
  if (!job)    return null;

  const isClient     = profile?.userType === "client";
  const isFreelancer = profile?.userType === "freelancer";

  const statusColor = ({
    open:        "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    in_progress: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    completed:   "bg-gray-500/15 text-gray-400 border-gray-500/30",
    cancelled:   "bg-red-500/15 text-red-400 border-red-500/30",
  } as Record<string, string>)[job.status] ?? "bg-gray-500/15 text-gray-400";

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-[88px] pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          {/* Back */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm mb-6 transition hover:opacity-80"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t("common.back")}
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ── MAIN CONTENT ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Header card */}
              <div className="rounded-2xl p-6 ring-soft" style={{ background: "var(--bg-card)" }}>
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
                        {job.status}
                      </span>
                      {job.category && (
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                          style={{ background: "var(--brand-dim)", color: "var(--brand)" }}>
                          {job.category}
                        </span>
                      )}
                      {isFreelancer && matchScore && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                          style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
                          <Zap className="w-3 h-3" />
                          {t("job.ai_match")}: {matchScore.score}%
                        </span>
                      )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2"
                      style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                      {job.title}
                    </h1>
                    <div className="flex flex-wrap gap-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {job.location}</span>
                      <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {job.duration}</span>
                      <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> {job.views} views</span>
                      <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {job.proposals} proposals</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold" style={{ color: "var(--brand)", fontFamily: "var(--font-display)" }}>
                      {job.budget}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{job.budgetType}</div>
                  </div>
                </div>

                {/* CTA buttons */}
                {isFreelancer && job.status === "open" && (
                  <button id="submit-proposal-btn" onClick={() => setProposalOpen(true)}
                    className="mt-5 w-full py-3 rounded-xl text-[15px] font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ background: "var(--grad-brand)", boxShadow: "0 8px 24px -8px var(--brand-glow)" }}>
                    <Send className="w-4 h-4" />
                    {t("job.submit_proposal")}
                  </button>
                )}
                {!isSignedIn && !isLoaded && null}
                {isLoaded && !isSignedIn && (
                  <Link href={`/sign-in?redirect=/job/${jobId}`}
                    className="mt-5 block text-center w-full py-3 rounded-xl text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: "var(--grad-brand)" }}>
                    Sign In to Apply →
                  </Link>
                )}
              </div>

              {/* Description */}
              <div className="rounded-2xl p-6 ring-soft" style={{ background: "var(--bg-card)" }}>
                <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                  Job Description
                </h2>
                <p className="text-[15px] leading-relaxed whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>
                  {job.description}
                </p>
              </div>

              {/* Skills */}
              {job.skillsRequired?.length > 0 && (
                <div className="rounded-2xl p-6 ring-soft" style={{ background: "var(--bg-card)" }}>
                  <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                    {t("job.skills_required")}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {job.skillsRequired.map((skill) => (
                      <span key={skill} className="px-3 py-1.5 rounded-lg text-sm font-medium"
                        style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Proposal submission form (inline) */}
              {isFreelancer && proposalOpen && (
                <div className="rounded-2xl p-6 ring-soft" style={{ background: "var(--bg-card)", border: "1px solid var(--brand)" }}>
                  <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                    {t("job.submit_proposal")}
                  </h2>
                  <form onSubmit={handleSubmitProposal} className="space-y-4" noValidate>
                    <div>
                      <label htmlFor="coverLetter" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                        {t("job.cover_letter")} *
                      </label>
                      <textarea
                        id="coverLetter"
                        required
                        rows={5}
                        maxLength={COVER_MAX}
                        aria-invalid={!!proposalErrors.coverLetter}
                        aria-describedby={proposalErrors.coverLetter ? "coverLetter-error" : "coverLetter-hint"}
                        className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1"
                        style={{
                          background: "var(--bg)",
                          color: "var(--text-primary)",
                          border: `1px solid ${proposalErrors.coverLetter ? "#ef4444" : "var(--border)"}`,
                        }}
                        placeholder="Describe your experience, why you're the best fit, and how you'll approach this job..."
                        value={proposalForm.coverLetter}
                        onChange={(e) => {
                          setProposalForm({ ...proposalForm, coverLetter: e.target.value });
                          if (proposalErrors.coverLetter) setProposalErrors((p) => ({ ...p, coverLetter: undefined }));
                        }}
                      />
                      {proposalErrors.coverLetter ? (
                        <p id="coverLetter-error" className="text-xs mt-1 text-red-500">
                          {proposalErrors.coverLetter}
                        </p>
                      ) : (
                        <p id="coverLetter-hint" className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                          Minimum {COVER_MIN} characters
                          {" "}
                          ({proposalForm.coverLetter.length}/{COVER_MAX})
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="proposedBudget" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                          {t("job.proposed_rate")} *
                        </label>
                        <input
                          id="proposedBudget"
                          type="number"
                          required
                          min={1}
                          max={PROPOSAL_MAX}
                          step={100}
                          aria-invalid={!!proposalErrors.proposedBudget}
                          aria-describedby={proposalErrors.proposedBudget ? "proposedBudget-error" : undefined}
                          className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                          style={{
                            background: "var(--bg)",
                            color: "var(--text-primary)",
                            border: `1px solid ${proposalErrors.proposedBudget ? "#ef4444" : "var(--border)"}`,
                          }}
                          placeholder="e.g. 5000"
                          value={proposalForm.proposedBudget}
                          onChange={(e) => {
                            setProposalForm({ ...proposalForm, proposedBudget: e.target.value });
                            if (proposalErrors.proposedBudget) setProposalErrors((p) => ({ ...p, proposedBudget: undefined }));
                          }}
                        />
                        {proposalErrors.proposedBudget && (
                          <p id="proposedBudget-error" className="text-xs mt-1 text-red-500">
                            {proposalErrors.proposedBudget}
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="proposedDuration" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                          {t("job.delivery_time")} *
                        </label>
                        <input
                          id="proposedDuration"
                          type="text"
                          maxLength={40}
                          aria-invalid={!!proposalErrors.proposedDuration}
                          aria-describedby={proposalErrors.proposedDuration ? "proposedDuration-error" : undefined}
                          className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                          style={{
                            background: "var(--bg)",
                            color: "var(--text-primary)",
                            border: `1px solid ${proposalErrors.proposedDuration ? "#ef4444" : "var(--border)"}`,
                          }}
                          placeholder="e.g. 3 days"
                          value={proposalForm.proposedDuration}
                          onChange={(e) => {
                            setProposalForm({ ...proposalForm, proposedDuration: e.target.value });
                            if (proposalErrors.proposedDuration) setProposalErrors((p) => ({ ...p, proposedDuration: undefined }));
                          }}
                        />
                        {proposalErrors.proposedDuration && (
                          <p id="proposedDuration-error" className="text-xs mt-1 text-red-500">
                            {proposalErrors.proposedDuration}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                        style={{ background: "var(--grad-brand)" }}
                      >
                        {submitting ? "Submitting…" : "Submit Proposal →"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setProposalOpen(false)}
                        className="px-4 py-3 rounded-xl text-sm font-medium transition"
                        style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Proposals list — client only */}
              {isClient && (
                <div id="proposals" className="rounded-2xl p-6 ring-soft scroll-mt-24" style={{ background: "var(--bg-card)" }}>
                  <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                    {t("job.proposals_received")} ({proposals.length})
                  </h2>
                  {proposals.length === 0 ? (
                    <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      No proposals yet. Share your job to attract applicants.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {proposals.map((proposal) => (
                        <div key={proposal.id} className="rounded-xl p-4"
                          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <div className="font-semibold" style={{ color: "var(--text-primary)" }}>
                                {proposal.freelancer_name}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                                <span className="flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                  {parseFloat(proposal.avg_rating || "0").toFixed(1)} ({proposal.review_count} reviews)
                                </span>
                                <span>{proposal.success_rate || 0}% success</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold" style={{ color: "var(--brand)" }}>
                                PKR {Number(proposal.proposed_budget).toLocaleString()}
                              </div>
                              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                                {proposal.proposed_duration}
                              </div>
                            </div>
                          </div>
                          <p className="text-sm mb-3 line-clamp-3" style={{ color: "var(--text-secondary)" }}>
                            {proposal.cover_letter}
                          </p>
                          {proposal.status === "pending" ? (
                            <div className="flex gap-2">
                              <button id={`accept-proposal-${proposal.id}`}
                                onClick={() => handleProposalAction(proposal.id, "accepted")}
                                disabled={!!updatingId}
                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
                                style={{ background: "var(--grad-brand)" }}>
                                <CheckCircle className="w-4 h-4" /> {t("job.accept")}
                              </button>
                              <button id={`reject-proposal-${proposal.id}`}
                                onClick={() => handleProposalAction(proposal.id, "rejected")}
                                disabled={!!updatingId}
                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition"
                                style={{ background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                                <XCircle className="w-4 h-4" /> {t("job.reject")}
                              </button>
                            </div>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium capitalize ${
                              proposal.status === "accepted" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                            }`}>
                              {proposal.status === "accepted" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {proposal.status}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── SIDEBAR ── */}
            <div className="space-y-5">
              {/* Client info */}
              <div className="rounded-2xl p-5 ring-soft" style={{ background: "var(--bg-card)" }}>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
                  {t("job.posted_by")}
                </h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: "var(--grad-brand)" }}>
                    {job.client.name?.[0] ?? "C"}
                  </div>
                  <div>
                    <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{job.client.name}</div>
                    <div className="flex items-center gap-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      {job.client.rating} ({job.client.reviews} reviews)
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {[
                    { label: "Jobs Posted", value: job.client.jobsPosted },
                    { label: "Hire Rate",   value: job.client.hireRate },
                    { label: "Member Since", value: job.client.memberSince },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span>{label}</span>
                      <span className="font-medium" style={{ color: "var(--text-primary)" }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Job details */}
              <div className="rounded-2xl p-5 ring-soft" style={{ background: "var(--bg-card)" }}>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
                  Job Details
                </h3>
                <div className="space-y-3">
                  {[
                    { icon: DollarSign, label: t("job.budget"),   value: job.budget },
                    { icon: MapPin,     label: t("job.location"), value: job.location },
                    { icon: Clock,      label: t("job.duration"), value: job.duration || "—" },
                    { icon: Briefcase,  label: "Category",        value: job.category || "—" },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: "var(--brand-dim)" }}>
                        <Icon className="w-4 h-4" style={{ color: "var(--brand)" }} />
                      </div>
                      <div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</div>
                        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Similar Jobs */}
              {similarJobs.length > 0 && (
                <div className="rounded-2xl p-5 ring-soft" style={{ background: "var(--bg-card)" }}>
                  <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
                    {t("job.similar_jobs")}
                  </h3>
                  <div className="space-y-3">
                    {similarJobs.map((sj) => (
                      <Link key={sj.id} href={`/job/${sj.id}`}
                        className="flex items-center justify-between group">
                        <div>
                          <div className="text-sm font-medium group-hover:underline"
                            style={{ color: "var(--text-primary)" }}>{sj.title}</div>
                          <div className="text-xs" style={{ color: "var(--brand)" }}>{sj.budget}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
