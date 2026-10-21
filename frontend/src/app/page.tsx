"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CareerNodes3D } from "@/components/3d/CareerNodes3D";
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
  Lock
} from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();
  const [liveJobs, setLiveJobs] = useState<JobListing[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [indiaCount, setIndiaCount] = useState(0);
  const [filterOptions, setFilterOptions] = useState<JobFilterOptions | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [isEmbedOpen, setIsEmbedOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchJobs({ india_feed: true, page_size: 6, sort_by: "verified" }).catch(() => ({ items: [], total: 0 })),
      fetchFilterOptions().catch(() => null),
    ])
      .then(([jobsData, filters]) => {
        setLiveJobs(jobsData.items || []);
        setTotalJobs(jobsData.total || 0);
        if (filters) {
          setFilterOptions(filters);
          setIndiaCount(filters.india_eligible_count || jobsData.total || 0);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION WITH 3D CAREER NODES */}
        <section className="relative overflow-hidden pt-8 pb-16 md:py-20 border-b border-slate-900">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-cyan-500/10 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left copy */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  India&apos;s Premier AI Job Hunting Copilot
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
                  Discover Verified Jobs. <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
                    Automate Your Hunt.
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                  Stop scrolling duplicate spam and ghost postings. HirePulse aggregates direct official ATS feeds, matches your exact eligibility, dispatches daily morning alerts, and optimizes your resume for ATS scoring.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                  <Link
                    href="/jobs"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-xl shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5"
                  >
                    <Compass className="w-4 h-4" />
                    Explore Verified Jobs
                  </Link>
                  <Link
                    href={user ? "/automation" : "/onboarding"}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold text-slate-200 border border-slate-800 bg-slate-900/90 hover:bg-slate-800 hover:border-slate-700 transition-colors shadow-sm"
                  >
                    <Zap className="w-4 h-4 text-cyan-400" />
                    Automate My Job Search
                  </Link>
                </div>

                {/* Micro trust stats */}
                <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>100% Direct ATS Links</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <span>12-Hour Sync Cadence</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    <span>Layered Deduplication</span>
                  </div>
                </div>
              </div>

              {/* Right: 3D Career Opportunity Universe */}
              <div className="lg:col-span-5 relative">
                <div className="p-2 rounded-3xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl relative">
                  <CareerNodes3D />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LIVE REAL BACKEND JOBS PREVIEW */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                Live Feed From Official ATS Sources
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Recently Ingested Career Openings
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Zero aggregator spam. Direct canonical URLs from Greenhouse, Lever, and Ashby.
              </p>
            </div>

            <Link
              href={user ? "/jobs" : "/auth/register"}
              className="text-xs sm:text-sm font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 self-start sm:self-auto"
            >
              {user ? `Browse All (${totalJobs.toLocaleString()})` : "Unlock All Openings"} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: user ? 6 : 3 }).map((_, i) => (
                <div key={i} className="h-64 rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse" />
              ))}
            </div>
          ) : liveJobs.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400">
              No jobs currently in active feed. Start backend sync to populate.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(user ? liveJobs : liveJobs.slice(0, 3)).map((job) => (
                <JobCard key={job.id} job={job} onSelect={(j) => setSelectedJob(j)} />
              ))}

              {/* Locked card if not logged in */}
              {!user && (
                <div className="glass-card rounded-2xl p-6 border border-cyan-500/30 bg-gradient-to-br from-slate-900/90 to-cyan-950/30 flex flex-col justify-between text-center sm:text-left">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3 mx-auto sm:mx-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-white text-base">Unlock {totalJobs.toLocaleString()}+ Verified Jobs</h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      Sign in or create an account to browse the full live feed, salary insights, direct ATS links, and daily email automation.
                    </p>
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <Link href="/auth/register" className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 text-center shadow-md">
                      Create Account
                    </Link>
                    <Link href="/auth/login" className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 text-center hover:text-white">
                      Sign In
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* HOW THE AGENT WORKS */}
        <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-slate-900">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
              Architecture & Workflow
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
              How the AI Job Hunting Agent Works
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Engineered specifically for India&apos;s tech ecosystem with strict provenance tracking and deduplication.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-800 relative">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-lg mb-5">
                01
              </div>
              <h3 className="font-bold text-lg text-white mb-2">Automated ATS Ingestion</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Connects directly to company career boards across Greenhouse, Lever, Ashby, and Workday every 12 hours, capturing fresh openings the moment they go live.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-800 relative">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-lg mb-5">
                02
              </div>
              <h3 className="font-bold text-lg text-white mb-2">India Eligibility & Dedup</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Our 4-tier location classifier tags roles for India offices (Bengaluru, Pune, Hyderabad, NCR) or India-eligible remote, eliminating international-only dead ends.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-800 relative">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg mb-5">
                03
              </div>
              <h3 className="font-bold text-lg text-white mb-2">Daily Digest & ATS Matching</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Matches candidate profiles against newly ingested jobs, dispatches personalized morning digests, and provides instant ATS readiness scoring for resumes.
              </p>
            </div>
          </div>
        </section>

        {/* 5 CORE PILLARS FEATURE SUITE */}
        <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-slate-900">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
              End-To-End Platform
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
              Everything Needed to Accelerate Your Career
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white">Faceted Job Discovery</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Search across verified tech hubs, work modes (Remote, Hybrid, On-site), salary bands, and official source platforms.
                </p>
              </div>
              <Link href="/jobs" className="mt-4 text-xs font-semibold text-cyan-400 flex items-center gap-1 hover:underline">
                Explore Jobs <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 2 */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white">Daily Job Automation</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Set target titles, skills, and match thresholds. The backend agent runs every morning and emails newly matching jobs.
                </p>
              </div>
              <Link href="/automation" className="mt-4 text-xs font-semibold text-amber-400 flex items-center gap-1 hover:underline">
                Setup Daily Digest <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 3 */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white">ATS Resume Builder</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Clean, structured resume builder designed specifically to be parsed flawlessly by Greenhouse, Lever, and Workday ATS bots.
                </p>
              </div>
              <Link href="/resume-builder" className="mt-4 text-xs font-semibold text-indigo-400 flex items-center gap-1 hover:underline">
                Build ATS Resume <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 4 */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white">ATS Readiness Scorer</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Analyze keyword match against actual job postings. Get actionable suggestions to increase recruiter callback probability.
                </p>
              </div>
              <Link href="/ats-checker" className="mt-4 text-xs font-semibold text-emerald-400 flex items-center gap-1 hover:underline">
                Test Resume Match <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 5 */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white">Application Tracker</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Organize your job pipeline from Saved to Applied, Interviewing, and Offered with notes and direct application links.
                </p>
              </div>
              <Link href="/saved-jobs" className="mt-4 text-xs font-semibold text-sky-400 flex items-center gap-1 hover:underline">
                Open Pipeline <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 6 */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
                  <Code className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white">Universal Web Embed</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Easily embed the HirePulse job widget or responsive iframe into WordPress, Webflow, or custom React apps.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEmbedOpen(true)}
                className="mt-4 text-xs font-semibold text-purple-400 flex items-center gap-1 hover:underline text-left"
              >
                Get Embed Code <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* BOTTOM CALL TO ACTION */}
        <section className="py-20 max-w-5xl mx-auto px-4 text-center">
          <div className="glass-card rounded-3xl p-8 sm:p-12 border border-slate-800 relative overflow-hidden bg-gradient-to-b from-slate-900 to-indigo-950/30">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
              Ready to automate your Indian tech job search?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto mb-8">
              Create an account in 30 seconds, configure your target roles, and let your AI agent discover eligible opportunities on autopilot.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/auth/register"
                className="px-8 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-xl shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5"
              >
                Create Free Candidate Account
              </Link>
              <Link
                href="/jobs"
                className="px-6 py-3.5 rounded-2xl text-sm font-semibold text-slate-300 border border-slate-800 bg-slate-900 hover:bg-slate-800 transition-colors"
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
