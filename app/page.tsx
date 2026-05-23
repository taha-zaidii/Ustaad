import Navbar from "@/components/home/Navbar";
import Hero from "@/components/home/Hero";
import StatsBar from "@/components/home/StatsBar";
import CategoryGrid from "@/components/home/CategoryGrid";
import HowItWorks from "@/components/home/HowItWorks";
import FeaturedJobs from "@/components/home/FeaturedJobs";
import TopFreelancers from "@/components/home/TopFreelancers";
import TrustSafety from "@/components/home/TrustSafety";
import Testimonials from "@/components/home/Testimonials";
import FinalCTA from "@/components/home/FinalCTA";
import SiteFooter from "@/components/home/SiteFooter";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <StatsBar />
      <CategoryGrid />
      <FeaturedJobs />
      <HowItWorks />
      <TopFreelancers />
      <TrustSafety />
      <Testimonials />
      <FinalCTA />
      <SiteFooter />
    </main>
  );
}
