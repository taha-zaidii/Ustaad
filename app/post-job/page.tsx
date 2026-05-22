"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { toast } from "@/components/ui/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { FullPageLoader } from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { ArrowRight, Briefcase, DollarSign, MapPin, Clock } from "lucide-react";

type FieldErrors = Partial<Record<
  | "title"
  | "category"
  | "description"
  | "budgetMin"
  | "budgetMax"
  | "location"
  | "duration",
  string
>>;

const TITLE_MIN = 10;
const DESC_MIN = 50;
const DESC_MAX = 2000;
const BUDGET_MAX = 10_000_000; // PKR 1 crore — cap to prevent typos

export default function PostJobPage() {
  const router = useRouter();
  const { isSignedIn, userId, isLoaded } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    budgetMin: "",
    budgetMax: "",
    budgetType: "fixed",
    location: "",
    duration: "",
    skillsRequired: "",
  });

  const validate = (data: typeof formData): FieldErrors => {
    const e: FieldErrors = {};
    if (data.title.trim().length < TITLE_MIN)
      e.title = `Title needs at least ${TITLE_MIN} characters.`;
    if (!data.category) e.category = "Please pick a category.";
    if (data.description.trim().length < DESC_MIN)
      e.description = `Add at least ${DESC_MIN} characters of detail.`;
    if (data.description.length > DESC_MAX)
      e.description = `Keep the description under ${DESC_MAX} characters.`;
    const bmin = Number(data.budgetMin);
    const bmax = Number(data.budgetMax);
    if (!data.budgetMin || isNaN(bmin) || bmin <= 0)
      e.budgetMin = "Enter a positive minimum budget.";
    if (!data.budgetMax || isNaN(bmax) || bmax <= 0)
      e.budgetMax = "Enter a positive maximum budget.";
    if (!e.budgetMin && !e.budgetMax) {
      if (bmin > bmax) e.budgetMax = "Maximum must be at least the minimum.";
      if (bmax > BUDGET_MAX)
        e.budgetMax = `Maximum cannot exceed PKR ${BUDGET_MAX.toLocaleString()}.`;
    }
    if (!data.location) e.location = "Pick a location.";
    if (!data.duration) e.duration = "Pick an expected duration.";
    return e;
  };

  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) {
        router.push('/sign-in?redirect=/post-job');
      } else {
        setAuthChecked(true);
      }
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !authChecked) {
    return <FullPageLoader />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSignedIn) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to post a job",
        variant: "destructive",
      });
      router.push('/sign-in');
      return;
    }

    const fieldErrors = validate(formData);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      const first = Object.keys(fieldErrors)[0];
      const el = document.getElementById(first);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus();
      toast({
        title: "Please fix the highlighted fields",
        description: Object.values(fieldErrors)[0],
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          budgetMin: parseInt(formData.budgetMin),
          budgetMax: parseInt(formData.budgetMax),
          skills: formData.skillsRequired.split(',').map(s => s.trim()).filter(Boolean),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create job');
      }

      const data = await response.json();
      toast({
        title: "Success!",
        description: "Shabaash! Aapka kaam post ho gaya. Jaldi hi log apply karenge.",
      });
      router.push(`/job/${data.jobId}`);
    } catch (error: any) {
      console.error('Failed to post job:', error);
      toast({
        title: "Error",
        description: error.message || 'Kuch gadbad ho gayi. Dobara try karo.',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field as keyof FieldErrors]) return prev;
      const next = { ...prev };
      delete next[field as keyof FieldErrors];
      return next;
    });
  };

  const fieldError = (field: keyof FieldErrors) => errors[field];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Kaam Post Karo</h1>
          <p className="text-xl text-primary-foreground/80">
            Apna kaam yahan post karo aur minutes mein sahi banda dhundo
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <Card className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Job Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-lg font-semibold">
                  Kaam ka Naam *
                </Label>
                <div className="relative group">
                  <Briefcase
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-all duration-200 group-hover:text-primary group-hover:scale-110"
                  />
                  <Input
                    id="title"
                    type="text"
                    placeholder="e.g., Fix Water Leakage in Kitchen Sink"
                    className={`pl-10 ${fieldError("title") ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    aria-invalid={!!fieldError("title")}
                    aria-describedby={fieldError("title") ? "title-error" : "title-hint"}
                    maxLength={120}
                    required
                  />
                </div>
                {fieldError("title") ? (
                  <p id="title-error" className="text-sm text-destructive">{fieldError("title")}</p>
                ) : (
                  <p id="title-hint" className="text-sm text-muted-foreground">
                    Clear aur seedha title likho ({formData.title.length}/120)
                  </p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-lg font-semibold">
                  Service Category *
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleChange("category", value)}
                  required
                >
                  <SelectTrigger
                    id="category"
                    aria-invalid={!!fieldError("category")}
                    className={fieldError("category") ? "border-destructive focus-visible:ring-destructive" : ""}
                  >
                    <SelectValue placeholder="Select a service category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plumbing">🔧 Plumbing</SelectItem>
                    <SelectItem value="carpentry">🪚 Carpentry</SelectItem>
                    <SelectItem value="electrician">⚡ Electrician</SelectItem>
                    <SelectItem value="painting">🎨 Painting</SelectItem>
                    <SelectItem value="ac-refrigeration">❄️ AC &amp; Refrigeration</SelectItem>
                    <SelectItem value="construction">🏗️ Construction</SelectItem>
                    <SelectItem value="cleaning">🧹 Cleaning</SelectItem>
                    <SelectItem value="gardening">🌱 Gardening</SelectItem>
                    <SelectItem value="tailoring">✂️ Tailoring</SelectItem>
                    <SelectItem value="auto-mechanic">🔩 Auto Mechanic</SelectItem>
                    <SelectItem value="welding">🔥 Welding</SelectItem>
                    <SelectItem value="home-appliances">🔌 Home Appliances</SelectItem>
                  </SelectContent>
                </Select>
                {fieldError("category") && (
                  <p className="text-sm text-destructive">{fieldError("category")}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-lg font-semibold">
                  Kaam ki Details *
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe your job in detail. Example: I need a plumber to fix water leakage in kitchen sink. The tap is dripping constantly and needs replacement. Please bring necessary tools and parts."
                  className={`min-h-[150px] ${fieldError("description") ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  aria-invalid={!!fieldError("description")}
                  aria-describedby={fieldError("description") ? "description-error" : "description-hint"}
                  maxLength={DESC_MAX}
                  required
                />
                {fieldError("description") ? (
                  <p id="description-error" className="text-sm text-destructive">
                    {fieldError("description")}
                  </p>
                ) : (
                  <p id="description-hint" className="text-sm text-muted-foreground">
                    Minimum {DESC_MIN} characters. Be specific about what you need.
                    {" "}
                    <span className={formData.description.length >= DESC_MIN ? "text-emerald-600 dark:text-emerald-500" : "text-muted-foreground"}>
                      ({formData.description.length}/{DESC_MAX})
                    </span>
                  </p>
                )}
              </div>

              {/* Budget */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="budgetType" className="text-lg font-semibold">
                    Budget Type *
                  </Label>
                  <Select
                    value={formData.budgetType}
                    onValueChange={(value) => handleChange("budgetType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Price</SelectItem>
                      <SelectItem value="hourly">Hourly Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budgetMin" className="text-lg font-semibold">
                    Min Budget (PKR) *
                  </Label>
                  <div className="relative group">
                    <DollarSign
                      aria-hidden="true"
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-all duration-200 group-hover:text-primary group-hover:scale-110"
                    />
                    <Input
                      id="budgetMin"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={BUDGET_MAX}
                      step={100}
                      placeholder="e.g., 2000"
                      className={`pl-10 ${fieldError("budgetMin") ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      value={formData.budgetMin}
                      onChange={(e) => handleChange("budgetMin", e.target.value)}
                      aria-invalid={!!fieldError("budgetMin")}
                      aria-describedby={fieldError("budgetMin") ? "budgetMin-error" : undefined}
                      required
                    />
                  </div>
                  {fieldError("budgetMin") && (
                    <p id="budgetMin-error" className="text-sm text-destructive">{fieldError("budgetMin")}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budgetMax" className="text-lg font-semibold">
                    Max Budget (PKR) *
                  </Label>
                  <div className="relative group">
                    <DollarSign
                      aria-hidden="true"
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-all duration-200 group-hover:text-primary group-hover:scale-110"
                    />
                    <Input
                      id="budgetMax"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={BUDGET_MAX}
                      step={100}
                      placeholder="e.g., 5000"
                      className={`pl-10 ${fieldError("budgetMax") ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      value={formData.budgetMax}
                      onChange={(e) => handleChange("budgetMax", e.target.value)}
                      aria-invalid={!!fieldError("budgetMax")}
                      aria-describedby={fieldError("budgetMax") ? "budgetMax-error" : undefined}
                      required
                    />
                  </div>
                  {fieldError("budgetMax") && (
                    <p id="budgetMax-error" className="text-sm text-destructive">{fieldError("budgetMax")}</p>
                  )}
                </div>
              </div>

              {/* Location & Duration */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-lg font-semibold">
                    Location *
                  </Label>
                  <div className="relative">
                    <MapPin aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10 pointer-events-none" />
                    <Select
                      value={formData.location}
                      onValueChange={(value) => handleChange("location", value)}
                      required
                    >
                      <SelectTrigger
                        id="location"
                        aria-invalid={!!fieldError("location")}
                        className={`pl-10 ${fieldError("location") ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      >
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="karachi">Karachi</SelectItem>
                        <SelectItem value="lahore">Lahore</SelectItem>
                        <SelectItem value="islamabad">Islamabad</SelectItem>
                        <SelectItem value="rawalpindi">Rawalpindi</SelectItem>
                        <SelectItem value="faisalabad">Faisalabad</SelectItem>
                        <SelectItem value="multan">Multan</SelectItem>
                        <SelectItem value="peshawar">Peshawar</SelectItem>
                        <SelectItem value="quetta">Quetta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {fieldError("location") && (
                    <p className="text-sm text-destructive">{fieldError("location")}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-lg font-semibold">
                    Project Duration *
                  </Label>
                  <div className="relative">
                    <Clock aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10 pointer-events-none" />
                    <Select
                      value={formData.duration}
                      onValueChange={(value) => handleChange("duration", value)}
                      required
                    >
                      <SelectTrigger
                        id="duration"
                        aria-invalid={!!fieldError("duration")}
                        className={`pl-10 ${fieldError("duration") ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      >
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-week">Less than 1 week</SelectItem>
                        <SelectItem value="1-2-weeks">1-2 weeks</SelectItem>
                        <SelectItem value="2-4-weeks">2-4 weeks</SelectItem>
                        <SelectItem value="1-3-months">1-3 months</SelectItem>
                        <SelectItem value="3-6-months">3-6 months</SelectItem>
                        <SelectItem value="6-months-plus">6+ months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {fieldError("duration") && (
                    <p className="text-sm text-destructive">{fieldError("duration")}</p>
                  )}
                </div>
              </div>

              {/* Skills Required */}
              <div className="space-y-2">
                <Label htmlFor="skillsRequired" className="text-lg font-semibold">
                  Skills Required
                </Label>
                <Input
                  id="skillsRequired"
                  type="text"
                  placeholder="e.g., Pipe Installation, Leak Repair, Bathroom Fitting (comma separated)"
                  value={formData.skillsRequired}
                  onChange={(e) => handleChange("skillsRequired", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Add relevant skills to help freelancers find your job
                </p>
              </div>

              <div className="flex gap-4 pt-6">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-full bg-gradient-accent hover:opacity-90 transition-opacity group"
                  size="lg"
                >
                  {loading ? 'Thoda wait karo, dhundh rahe hain...' : 'Kaam Post Karo ->'}
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  size="lg"
                  disabled={loading}
                  asChild
                >
                  <Link href="/">Cancel</Link>
                </Button>
              </div>
            </form>
          </Card>

          <div className="mt-8 p-6 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-2">Tips for posting a great job:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Be specific about the work location and access details</li>
              <li>• Set a fair budget based on local market rates</li>
              <li>• Mention if tools and materials are provided or needed</li>
              <li>• Clearly state your availability and preferred timing</li>
              <li>• Include photos of the work area if relevant</li>
            </ul>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
