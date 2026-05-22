"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { FullPageLoader, InlineLoader } from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import {
  Briefcase,
  DollarSign,
  MapPin,
  Clock,
  FileText,
  Calendar,
} from "lucide-react";

interface Job {
  id: string;
  title: string;
  description: string;
  budget: string;
  budgetType: string;
  location: string;
  duration: string;
  status: string;
  category: string;
  categorySlug: string;
  proposalsCount: number;
  viewsCount: number;
  postedTime: string;
  createdAt: string;
}

export default function MyJobsPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in?redirect=/my-jobs');
      return;
    }

    if (isSignedIn) {
      fetchJobs();
    }
  }, [isLoaded, isSignedIn, router]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/my-jobs');

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      toast({
        title: "Couldn't load your jobs",
        description: 'Refresh the page or try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return <FullPageLoader />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">My Posted Jobs</h1>
          <p className="text-xl text-primary-foreground/80">
            Manage and track all your job postings
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold">All Jobs ({jobs.length})</h2>
            <p className="text-muted-foreground">View and manage your posted jobs</p>
          </div>
          <Button asChild size="lg">
            <Link href="/post-job">
              <Briefcase className="w-4 h-4 mr-2" />
              Post New Job
            </Link>
          </Button>
        </div>

        {loading ? (
          <InlineLoader message="Loading your jobs..." />
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No jobs posted yet</h3>
              <p className="text-muted-foreground mb-6">
                Start by posting your first job to find talented local workers
              </p>
              <Button asChild size="lg">
                <Link href="/post-job">Post Your First Job</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {jobs.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl md:text-2xl">
                          <Link href={`/job/${job.id}`} className="hover:text-primary transition-colors">
                            {job.title}
                          </Link>
                        </CardTitle>
                        <Badge
                          variant={job.status === 'open' ? 'default' : job.status === 'closed' ? 'secondary' : 'outline'}
                          className="capitalize"
                        >
                          {job.status}
                        </Badge>
                      </div>
                      <CardDescription className="text-base">
                        {job.description && job.description.length > 200
                          ? `${job.description.substring(0, 200)}...`
                          : job.description || 'No description'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <div className="text-sm text-muted-foreground">Budget</div>
                        <div className="font-semibold">{job.budget}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <div className="text-sm text-muted-foreground">Location</div>
                        <div className="font-semibold capitalize">{job.location}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <div className="text-sm text-muted-foreground">Duration</div>
                        <div className="font-semibold">{job.duration}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <div className="text-sm text-muted-foreground">Category</div>
                        <div className="font-semibold">{job.category}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-lg">{job.proposalsCount}</span>
                      <span className="text-muted-foreground">Proposals</span>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Posted {job.postedTime}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button asChild variant="default">
                      <Link href={`/job/${job.id}`}>View Details</Link>
                    </Button>
                    {job.proposalsCount > 0 && (
                      <Button asChild variant="outline">
                        <Link href={`/job/${job.id}#proposals`}>
                          View Proposals ({job.proposalsCount})
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
