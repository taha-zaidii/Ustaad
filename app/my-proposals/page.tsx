"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "@/components/ui/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InlineLoader } from "@/components/Loader";
import Link from "next/link";
import {
  Clock,
  DollarSign,
  Briefcase,
  AlertCircle,
  ExternalLink,
  Trash2,
} from "lucide-react";

export default function MyProposalsPage() {
  const { user } = useUser();
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const userRole = user?.unsafeMetadata?.role as string | undefined;

  useEffect(() => {
    if (user) {
      fetchProposals();
    }
  }, [user]);

  const fetchProposals = async () => {
    try {
      const response = await fetch("/api/proposals?role=freelancer");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setProposals(data.proposals || []);
    } catch (error) {
      console.error("Failed to fetch proposals:", error);
      toast({
        title: "Couldn't load your proposals",
        description: "Please refresh or try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Server-side: PATCH status=withdrawn keeps the row for audit, DELETE
  // removes it entirely. We surface a single "Withdraw" action and let the
  // backend pick the right semantics based on proposal status.
  const handleWithdraw = async (proposalId: string) => {
    if (!confirm("Are you sure you want to withdraw this proposal?")) return;

    setDeletingId(proposalId);
    try {
      const response = await fetch(`/api/proposals/${proposalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "withdrawn" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to withdraw proposal");
      }

      toast({
        title: "Proposal withdrawn",
        description: "The client will no longer see this proposal.",
      });
      fetchProposals();
    } catch (error: any) {
      console.error("Error withdrawing proposal:", error);
      toast({
        title: "Couldn't withdraw proposal",
        description: error.message || "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-20 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-3xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-8">
            Please sign in to view your proposals.
          </p>
          <Button asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  if (userRole !== "freelancer") {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-20 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-8">
            This page is only accessible to freelancers.
          </p>
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const pendingProposals = proposals.filter((p) => p.status === "pending");
  const acceptedProposals = proposals.filter((p) => p.status === "accepted");
  const rejectedProposals = proposals.filter((p) => p.status === "rejected");
  const withdrawnProposals = proposals.filter((p) => p.status === "withdrawn");

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">My Proposals</h1>
            <p className="text-muted-foreground">
              Track and manage all your job proposals
            </p>
          </div>

          {loading ? (
            <InlineLoader message="Loading proposals..." />
          ) : proposals.length === 0 ? (
            <Card className="p-12 text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">No Proposals Yet</h2>
              <p className="text-muted-foreground mb-6">
                Start browsing jobs and submit your first proposal!
              </p>
              <Button asChild>
                <Link href="/browse-jobs">Browse Jobs</Link>
              </Button>
            </Card>
          ) : (
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="pending">
                  Pending ({pendingProposals.length})
                </TabsTrigger>
                <TabsTrigger value="accepted">
                  Accepted ({acceptedProposals.length})
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected ({rejectedProposals.length})
                </TabsTrigger>
                <TabsTrigger value="withdrawn">
                  Withdrawn ({withdrawnProposals.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4">
                {pendingProposals.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">No pending proposals</p>
                  </Card>
                ) : (
                  pendingProposals.map((proposal) => (
                    <ProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      onWithdraw={handleWithdraw}
                      deletingId={deletingId}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="accepted" className="space-y-4">
                {acceptedProposals.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">No accepted proposals</p>
                  </Card>
                ) : (
                  acceptedProposals.map((proposal) => (
                    <ProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      onWithdraw={handleWithdraw}
                      deletingId={deletingId}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="rejected" className="space-y-4">
                {rejectedProposals.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">No rejected proposals</p>
                  </Card>
                ) : (
                  rejectedProposals.map((proposal) => (
                    <ProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      onWithdraw={handleWithdraw}
                      deletingId={deletingId}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="withdrawn" className="space-y-4">
                {withdrawnProposals.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">No withdrawn proposals</p>
                  </Card>
                ) : (
                  withdrawnProposals.map((proposal) => (
                    <ProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      onWithdraw={handleWithdraw}
                      deletingId={deletingId}
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

interface ProposalCardProps {
  proposal: any;
  onWithdraw: (id: string) => void;
  deletingId: string | null;
}

function ProposalCard({
  proposal,
  onWithdraw,
  deletingId,
}: ProposalCardProps) {
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    accepted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    withdrawn: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Link
              href={`/job/${proposal.job_id}`}
              className="text-xl font-semibold hover:text-primary transition-colors"
            >
              {proposal.job_title}
            </Link>
            <Badge className={statusColors[proposal.status as keyof typeof statusColors]}>
              {proposal.status}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>Submitted {new Date(proposal.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              <span>{proposal.client_name}</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" asChild aria-label="Open job in a new view">
          <Link href={`/job/${proposal.job_id}`}>
            <ExternalLink className="w-5 h-5" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4 py-4 border-y mb-4">
        <div>
          <div className="text-sm text-muted-foreground mb-1">Your Bid</div>
          <div className="text-xl font-bold">
            PKR {proposal.proposed_budget?.toLocaleString() || "N/A"}
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">Duration</div>
          <div className="text-xl font-bold">{proposal.proposed_duration || "N/A"}</div>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="font-semibold mb-2 text-sm">Your Cover Letter</h4>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {proposal.cover_letter}
        </p>
      </div>

      {proposal.status === "pending" && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onWithdraw(proposal.id)}
            disabled={deletingId === proposal.id}
          >
            <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
            {deletingId === proposal.id ? "Withdrawing…" : "Withdraw Proposal"}
          </Button>
        </div>
      )}
    </Card>
  );
}
