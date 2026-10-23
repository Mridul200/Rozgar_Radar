"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { HeroSplit } from "@/components/HeroSplit";
import { Footer } from "@/components/layout/Footer";
import { JobCard } from "@/components/JobCard";
import { JobModal } from "@/components/JobModal";
import { EmbedModal } from "@/components/EmbedModal";
import { fetchJobs, fetchFilterOptions } from "@/lib/api";
import { JobListing, JobFilterOptions } from "@/types/job";
import { useAuth } from "@/lib/auth-context";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  FileText,
  CheckCircle2,
  MapPin,
  Building2,
  Code2,
  Layers,
  Compass,
  ChevronRight,
  ExternalLink,
  Code,
  Lock,
} from "lucide-react";

interface HomePageClientProps {
  initialJobs: JobListing[];
  initialTotal: number;
  initialIndiaCount: number;
  initialFilters: JobFilterOptions | null;
}

export function HomePageClient({
  initialJobs,
  initialTotal,
  initialIndiaCount,
  initialFilters,
}: HomePageClientProps) {
  const { user } = useAuth();
  const [liveJobs, setLiveJobs] = useState<JobListing[]>(initialJobs);
  const [totalJobs, setTotalJobs] = useState<number>(initialTotal || 1885);
  const [indiaCount, setIndiaCount] = useState<number>(initialIndiaCount || 160);
  const [filterOptions, setFilterOptions] = useState<JobFilterOptions | null>(initialFilters);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [isEmbedOpen, setIsEmbedOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Client-side refresh on return visits
    Promise.all([
      fetchJobs({ india_feed: true, page_size: 6, sort_by: "verified" }).catch(() => null),
      fetchFilterOptions().catch(() => null),
    ])
      .then(([jobsData, filters]) => {
        if (jobsData && jobsData.items && jobsData.items.length > 0) {
          setLiveJobs(jobsData.items);
          if (jobsData.total) {
            setTotalJobs(jobsData.total);
          }
        }
        if (filters) {
          setFilterOptions(filters);
          setIndiaCount(filters.india_eligible_count || initialIndiaCount);
        }
      })
      .catch((err) => console.error("Live jobs client refresh error:", err));
  }, [initialIndiaCount]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      <Navbar />

      <main className="flex-1">
        {/* POLISHED SPLIT HERO MATCHING DESIGN REFERENCE */}
        <HeroSplit totalJobs={totalJobs} />

        {/* LIVE REAL BACKEND JOBS PREVIEW */}
        <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#087F68] dark:text-[#21A67A] mb-1.5">
                <span className="w-2 h-2 rounded-full bg-[#087F68] dark:bg-[#21A67A] animate-pulse" />
                Live Ingested Feed • 100% Direct ATS Links
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Recently Ingested Career Openings
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Zero aggregator spam. Direct canonical application URLs from Greenhouse, Lever, Workday, and Ashby.
              </p>
            </div>

            <Link
              href={user ? "/jobs" : "/auth/register"}
              className="text-xs sm:text-sm font-semibold text-primary hover:text-[--primary-hover] flex items-center gap-1 self-start sm:self-auto group"
            >
              <span>{user ? `Browse All (${totalJobs.toLocaleString()})` : "Unlock All Openings"}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: user ? 6 : 3 }).map((_, i) => (
                <div key={i} className="h-64 rounded-2xl bg-card border border-border animate-pulse shadow-xs" />
              ))}
            </div>
          ) : liveJobs.length === 0 ? (
            <div className="p-10 rounded-2xl bg-card border border-border text-center text-xs text-muted-foreground shadow-xs">
              No jobs currently in active feed. Start backend sync to populate.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {(user ? liveJobs : liveJobs.slice(0, 3)).map((job) => (
                <JobCard key={job.id} job={job} onSelect={(j) => setSelectedJob(j)} />
              ))}

              {/* Locked card if not logged in */}
              {!user && (
                <div className="glass-card rounded-2xl p-6 border border-emerald-500/30 bg-card flex flex-col justify-between text-center sm:text-left shadow-sm">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-primary flex items-center justify-center mb-3 mx-auto sm:mx-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-foreground text-base">Unlock {totalJobs.toLocaleString()}+ Verified Jobs</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      Create a free candidate account to browse the full live feed, salary insights, direct ATS links, and daily email automation.
                    </p>
                  </div>
                  <div className="mt-5 flex flex-col sm:flex-row gap-2">
                    <Link
                      href="/auth/register"
                      className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-primary hover:bg-[--primary-hover] text-center shadow-xs transition-all"
                    >
                      Create Account
                    </Link>
                    <Link
                      href="/auth/login"
                      className="px-4 py-2.5 rounded-full text-xs font-semibold text-foreground bg-muted border border-border text-center hover:bg-muted/80 transition-colors"
                    >
                      Sign In
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* HOW THE AGENT WORKS */}
        <section className="py-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-border">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-[#087F68] dark:text-[#21A67A]">
              Architecture & Workflow
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight mt-2">
              How the AI Job Hunting Agent Works
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Engineered specifically for India&apos;s tech ecosystem with strict provenance tracking and deduplication.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card rounded-2xl p-6 sm:p-7 border border-border relative bg-card shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#087F68] dark:text-[#21A67A] font-bold text-sm mb-4">
                01
              </div>
              <h3 className="font-bold text-base text-foreground mb-1.5">Automated ATS Ingestion</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connects directly to company career boards across Greenhouse, Lever, Ashby, and Workday every 12 hours, capturing fresh openings the moment they go live.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 sm:p-7 border border-border relative bg-card shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-sm mb-4">
                02
              </div>
              <h3 className="font-bold text-base text-foreground mb-1.5">India Eligibility & Dedup</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Our 4-tier location classifier tags roles for India offices (Bengaluru, Pune, Hyderabad, NCR) or India-eligible remote, eliminating international-only dead ends.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 sm:p-7 border border-border relative bg-card shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm mb-4">
                03
              </div>
              <h3 className="font-bold text-base text-foreground mb-1.5">Daily Digest & ATS Matching</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Matches candidate profiles against newly ingested jobs, dispatches personalized morning digests, and provides instant ATS readiness scoring for resumes.
              </p>
            </div>
          </div>
        </section>

        {/* 6 CORE PILLARS FEATURE SUITE */}
        <section className="py-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-border">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-[#087F68] dark:text-[#21A67A]">
              End-To-End Platform
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight mt-2">
              Everything Needed to Accelerate Your Career
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Feature 1 */}
            <div className="glass-card rounded-2xl p-6 border border-border flex flex-col justify-between bg-card shadow-xs">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#087F68] dark:text-[#21A67A] mb-3.5">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">Faceted Job Discovery</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Search across verified tech hubs, work modes (Remote, Hybrid, On-site), salary bands, and official source platforms.
                </p>
              </div>
              <Link href="/jobs" className="mt-4 text-xs font-semibold text-primary flex items-center gap-1 hover:underline">
                Explore Jobs <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 2 */}
            <div className="glass-card rounded-2xl p-6 border border-border flex flex-col justify-between bg-card shadow-xs">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3.5">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">Daily Job Automation</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Set target titles, skills, and match thresholds. The backend agent runs every morning and emails newly matching jobs.
                </p>
              </div>
              <Link href="/automation" className="mt-4 text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline">
                Setup Daily Digest <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 3 */}
            <div className="glass-card rounded-2xl p-6 border border-border flex flex-col justify-between bg-card shadow-xs">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3.5">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">ATS Resume Builder</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Clean, structured resume builder designed specifically to be parsed flawlessly by Greenhouse, Lever, and Workday ATS bots.
                </p>
              </div>
              <Link href="/resume-builder" className="mt-4 text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
                Build ATS Resume <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 4 */}
            <div className="glass-card rounded-2xl p-6 border border-border flex flex-col justify-between bg-card shadow-xs">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#087F68] dark:text-[#21A67A] mb-3.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">ATS Scorer</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Analyze keyword match against actual job postings. Get actionable suggestions to increase recruiter callback probability.
                </p>
              </div>
              <Link href="/ats-checker" className="mt-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline">
                Test Resume Match <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 5 */}
            <div className="glass-card rounded-2xl p-6 border border-border flex flex-col justify-between bg-card shadow-xs">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-3.5">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">Application Tracker</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Organize your job pipeline from Saved to Applied, Interviewing, and Offered with notes and direct application links.
                </p>
              </div>
              <Link href="/saved-jobs" className="mt-4 text-xs font-semibold text-primary flex items-center gap-1 hover:underline">
                Open Pipeline <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 6 */}
            <div className="glass-card rounded-2xl p-6 border border-border flex flex-col justify-between bg-card shadow-xs">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3.5">
                  <Code className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">Universal Web Embed</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Easily embed the Rozgar Radar job widget or responsive iframe into WordPress, Webflow, or custom React apps.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEmbedOpen(true)}
                className="mt-4 text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1 hover:underline text-left cursor-pointer"
              >
                Get Embed Code <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* BOTTOM CALL TO ACTION */}
        <section className="py-16 md:py-20 max-w-5xl mx-auto px-4 text-center">
          <div className="glass-card rounded-3xl p-8 sm:p-12 border border-border relative overflow-hidden bg-card shadow-md">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-3">
              Ready to automate your Indian tech job search?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto mb-8">
              Create an account in 30 seconds, configure your target roles, and let your AI agent discover eligible opportunities on autopilot.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/auth/register"
                className="px-8 py-3 rounded-full text-sm font-bold text-white bg-primary hover:bg-[--primary-hover] shadow-md transition-all transform hover:-translate-y-0.5"
              >
                Create Free Candidate Account
              </Link>
              <Link
                href="/jobs"
                className="px-6 py-3 rounded-full text-sm font-semibold text-foreground border border-border bg-card hover:bg-muted transition-colors shadow-2xs"
              >
                Browse Openings First
              </Link>
            </div>
          </div>
        </section>

        {/* Embed Modal */}
        <EmbedModal isOpen={isEmbedOpen} onClose={() => setIsEmbedOpen(false)} />

        {/* Job Detail Modal */}
        {selectedJob && (
          <JobModal job={selectedJob} onClose={() => setSelectedJob(null)} />
        )}
      </main>

      <Footer />
    </div>
  );
}

export default HomePageClient;
