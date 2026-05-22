"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { toast } from "@/components/ui/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { FullPageLoader, InlineLoader } from "@/components/Loader";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  User,
  Briefcase,
  FileText,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Star,
  Eye,
  Calendar,
  Edit,
  Save,
  X,
} from "lucide-react";

interface Profile {
  id: string;
  email: string;
  fullName: string;
  bio: string;
  location: string;
  phone: string;
  userType: string;
  avatarUrl: string;
  hourlyRate: number;
  completedJobs: number;
  successRate: number;
  rating: string;
  reviewCount: number;
  createdAt: string;
}

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

interface Proposal {
  id: string;
  jobId: string;
  jobTitle: string;
  coverLetter: string;
  proposedRate: string;
  deliveryTime: string;
  status: string;
  submittedAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    bio: "",
    location: "",
    phone: "",
    hourlyRate: "",
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in?redirect=/dashboard');
      return;
    }

    if (isSignedIn) {
      fetchDashboardData();
    }
  }, [isLoaded, isSignedIn, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch profile
      const profileRes = await fetch('/api/profile');
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const p = profileData.profile;

        // Redirect to onboarding if no role selected yet
        if (!p.userType) {
          router.push('/onboarding');
          return;
        }

        setProfile(p);
        setFormData({
          fullName: p.fullName || "",
          bio: p.bio || "",
          location: p.location || "",
          phone: p.phone || "",
          hourlyRate: p.hourlyRate?.toString() || "",
        });
      }

      // Fetch jobs if client
      const jobsRes = await fetch('/api/my-jobs');
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setJobs(jobsData.jobs);
      }

      // Fetch proposals if freelancer
      const proposalsRes = await fetch('/api/proposals');
      if (proposalsRes.ok) {
        const proposalsData = await proposalsRes.json();
        setProposals(proposalsData.proposals || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast({
        title: "Couldn't load your dashboard",
        description: "Refresh the page or try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();
      setProfile(data.profile);
      setEditMode(false);
      toast({ title: 'Profile Updated!', description: 'Your changes have been saved.' });
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({ title: 'Error', description: 'Failed to update profile. Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || "",
        bio: profile.bio || "",
        location: profile.location || "",
        phone: profile.phone || "",
        hourlyRate: profile.hourlyRate?.toString() || "",
      });
    }
    setEditMode(false);
  };

  if (!isLoaded || loading) {
    return <FullPageLoader />;
  }

  const isClient = profile?.userType === 'client';
  const isFreelancer = profile?.userType === 'freelancer';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Dashboard</h1>
          <p className="text-xl text-primary-foreground/80">
            Welcome back, {profile?.fullName || user?.firstName || 'User'}!
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <Tabs defaultValue="profile" className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            {isClient && (
              <TabsTrigger value="jobs">
                <Briefcase className="w-4 h-4 mr-2" />
                My Jobs
              </TabsTrigger>
            )}
            {isFreelancer && (
              <TabsTrigger value="proposals">
                <FileText className="w-4 h-4 mr-2" />
                Proposals
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Manage your personal information and settings
                    </CardDescription>
                  </div>
                  {!editMode ? (
                    <Button onClick={() => setEditMode(true)} variant="outline">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button onClick={handleSaveProfile} disabled={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button onClick={handleCancelEdit} variant="outline" disabled={saving}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    {editMode ? (
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{profile?.fullName || 'Not set'}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="flex items-center gap-2 p-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{profile?.email}</span>
                      <Badge variant="secondary" className="ml-auto">Verified</Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    {editMode ? (
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g., Karachi, Pakistan"
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{profile?.location || 'Not set'}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    {editMode ? (
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="e.g., +92 300 1234567"
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{profile?.phone || 'Not set'}</span>
                      </div>
                    )}
                  </div>

                  {isFreelancer && (
                    <div className="space-y-2">
                      <Label htmlFor="hourlyRate">Hourly Rate (PKR)</Label>
                      {editMode ? (
                        <Input
                          id="hourlyRate"
                          type="number"
                          value={formData.hourlyRate}
                          onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                          placeholder="e.g., 2000"
                        />
                      ) : (
                        <div className="flex items-center gap-2 p-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span>PKR {profile?.hourlyRate?.toLocaleString() || 'Not set'}/hr</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <div className="flex items-center gap-2 p-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <Badge variant="default" className="capitalize">
                        {profile?.userType}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  {editMode ? (
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Tell us about yourself, your skills, and experience..."
                      className="min-h-[100px]"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground p-2">
                      {profile?.bio || 'No bio added yet. Click edit to add one.'}
                    </p>
                  )}
                </div>

                {isFreelancer && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{profile?.completedJobs || 0}</div>
                      <div className="text-sm text-muted-foreground">Completed Jobs</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        <span className="text-2xl font-bold">{profile?.rating || '0.0'}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">{profile?.reviewCount || 0} Reviews</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{profile?.successRate || 0}%</div>
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{proposals.length}</div>
                      <div className="text-sm text-muted-foreground">Active Proposals</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Jobs Tab (Client) */}
          {isClient && (
            <TabsContent value="jobs" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">My Posted Jobs</h2>
                  <p className="text-muted-foreground">Manage your job postings</p>
                </div>
                <Button asChild>
                  <Link href="/post-job">
                    <Briefcase className="w-4 h-4 mr-2" />
                    Post New Job
                  </Link>
                </Button>
              </div>

              {jobs.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No jobs posted yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start by posting your first job to find talented freelancers
                    </p>
                    <Button asChild>
                      <Link href="/post-job">Post Your First Job</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {jobs.map((job) => (
                    <Card key={job.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CardTitle className="text-xl">
                                <Link href={`/job/${job.id}`} className="hover:text-primary">
                                  {job.title}
                                </Link>
                              </CardTitle>
                              <Badge
                                variant={job.status === 'open' ? 'default' : 'secondary'}
                                className="capitalize"
                              >
                                {job.status}
                              </Badge>
                            </div>
                            <CardDescription>{job.description?.substring(0, 150) || 'No description'}...</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{job.budget}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span>{job.proposalsCount} Proposals</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-muted-foreground" />
                            <span>{job.viewsCount} Views</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{job.postedTime}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/job/${job.id}`}>View Details</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* Proposals Tab (Freelancer) */}
          {isFreelancer && (
            <TabsContent value="proposals" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">My Proposals</h2>
                <p className="text-muted-foreground">Track your submitted proposals</p>
              </div>

              {proposals.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No proposals yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Browse jobs and submit proposals to get started
                    </p>
                    <Button asChild>
                      <Link href="/browse-jobs">Browse Jobs</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {proposals.map((proposal) => (
                    <Card key={proposal.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-xl">
                              <Link href={`/job/${proposal.jobId}`} className="hover:text-primary">
                                {proposal.jobTitle}
                              </Link>
                            </CardTitle>
                            <CardDescription className="mt-2">
                              {proposal.coverLetter?.substring(0, 150) || 'No cover letter'}...
                            </CardDescription>
                          </div>
                          <Badge
                            variant={
                              proposal.status === 'pending'
                                ? 'secondary'
                                : proposal.status === 'accepted'
                                ? 'default'
                                : 'destructive'
                            }
                            className="capitalize"
                          >
                            {proposal.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Proposed Rate:</span>
                            <div className="font-medium">{proposal.proposedRate}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Delivery Time:</span>
                            <div className="font-medium">{proposal.deliveryTime}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Submitted:</span>
                            <div className="font-medium">{new Date(proposal.submittedAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
