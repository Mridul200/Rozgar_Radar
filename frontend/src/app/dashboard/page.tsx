"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  fetchUserProfile,
  fetchSavedJobs,
  fetchAutomationConfig,
  fetchUserResumes,
  fetchJobs
} from "@/lib/api";
import { UserProfile, SavedJobItem, AutomationConfig, ResumeRecord } from "@/types/user";
import { JobListing } from "@/types/job";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { JobModal } from "@/components/JobModal";
import {
  Sparkles,
  Briefcase,
  Zap,
  FileText,
  CheckCircle2,
  BookmarkCheck,
  ArrowRight,
  MapPin,
  Clock,
  TrendingUp,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  ChevronRight
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [savedJobs, setSavedJobs] = useState<SavedJobItem[]>([]);
  const [automation, setAutomation] = useState<AutomationConfig | null>(null);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<JobListing[]>([]);
  const [totalLiveJobs, setTotalLiveJobs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }

    if (token) {
      setLoading(true);
      Promise.all([
        fetchUserProfile(token).catch(() => null),
        fetchSavedJobs(undefined, token).catch(() => []),
        fetchAutomationConfig(token).catch(() => null),
        fetchUserResumes(token).catch(() => []),
        fetchJobs({ india_feed: true, page_size: 6, sort_by: "verified" }).catch(() => ({ items: [], total: 0 })),
      ])
        .then(([profData, savedData, autoData, resumeData, jobsData]) => {
          if (profData) setProfile(profData);
          setSavedJobs(savedData || []);
          if (autoData) setAutomation(autoData);
          setResumes(resumeData || []);
          if (jobsData) {
            setRecommendedJobs(jobsData.items || []);
            setTotalLiveJobs(jobsData.total || 0);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [authLoading, user, token, router]);

  // Compute profile completion percentage
  const calculateProfileCompletion = () => {
    if (!profile) return 30;
    let score = 25; // Base for verified account
    if (profile.current_city) score += 15;
    if (profile.preferred_roles && profile.preferred_roles.length > 0) score += 20;
    if (profile.skills && profile.skills.length > 0) score += 20;
    if (profile.resume_text && profile.resume_text.length > 50) score += 20;
    return Math.min(100, score);
  };

  const profileScore = calculateProfileCompletion();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-indigo-950/40 shadow-2xl mb-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-400 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                AI Career Copilot Online
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome, {user?.full_name || "Candidate"}
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Your agent is actively tracking {totalLiveJobs.toLocaleString()} verified career openings across Greenhouse, Lever, Ashby, and top India tech hubs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/jobs"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-lg shadow-cyan-500/25 transition-all"
              >
                <Briefcase className="w-4 h-4" />
                Search All Jobs
              </Link>
              <Link
                href="/automation"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-200 border border-slate-700 bg-slate-800/80 hover:bg-slate-800 transition-colors"
              >
                <Zap className="w-4 h-4 text-cyan-400" />
                Alerts
              </Link>
            </div>
          </div>
        </div>

        {/* Status Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1: Profile Readiness */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Profile Match</span>
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{profileScore}%</span>
              <span className="text-xs text-slate-400">Complete</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-900 mt-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                style={{ width: `${profileScore}%` }}
              />
            </div>
            <Link
              href="/profile"
              className="mt-3 text-xs text-cyan-400 font-medium inline-flex items-center gap-1 hover:underline"
            >
              Update preferences <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Card 2: Saved & Tracked Jobs */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Saved & Tracker</span>
              <BookmarkCheck className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{savedJobs.length}</span>
              <span className="text-xs text-slate-400">Tracked Opportunities</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {savedJobs.filter((j) => j.status === "applied").length} applied, {savedJobs.filter((j) => j.status === "interviewing").length} interviewing
            </p>
            <Link
              href="/saved-jobs"
              className="mt-3 text-xs text-cyan-400 font-medium inline-flex items-center gap-1 hover:underline"
            >
              Open tracker <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Card 3: Daily Email Digest */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Daily Automation</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${automation?.is_active ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
              <span className="text-base font-bold text-white">
                {automation?.is_active ? "Active & Scheduled" : "Paused"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {automation?.is_active
                ? `Delivery at ${automation.delivery_time || "09:00"} (${automation.timezone || "IST"})`
                : "Enable to receive eligible job digests"}
            </p>
            <Link
              href="/automation"
              className="mt-3 text-xs text-cyan-400 font-medium inline-flex items-center gap-1 hover:underline"
            >
              Configure schedule <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Card 4: Resume & ATS */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">ATS Readiness</span>
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{resumes.length}</span>
              <span className="text-xs text-slate-400">Resumes saved</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {resumes.length > 0 ? `Latest: ${resumes[0].title}` : "Create an ATS-ready resume"}
            </p>
            <Link
              href="/ats-checker"
              className="mt-3 text-xs text-cyan-400 font-medium inline-flex items-center gap-1 hover:underline"
            >
              Score ATS match <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Recommended Verified Jobs Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                Recommended Verified Jobs For You
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Matched against India tech hubs, verified direct ATS sources, and your candidate profile.
              </p>
            </div>
            <Link
              href="/jobs"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              View All ({totalLiveJobs}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-cyan-500/40 cursor-pointer flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-semibold text-white text-base leading-snug line-clamp-1 hover:text-cyan-400 transition-colors">
                        {job.title}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">{job.company_name}</p>
                    </div>
                    {job.is_india_eligible && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                        India Verified
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 my-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {job.location_raw || job.city || "Not specified"}
                    </span>
                    <span className="capitalize px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px]">
                      {job.work_mode.replace("_", "-")}
                    </span>
                  </div>

                  {job.salary_display && (
                    <div className="text-xs font-semibold text-slate-300 mb-2">
                      {job.salary_display}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 mt-2 text-xs">
                  <span className="text-[11px] text-slate-500">
                    Source: {job.source_name || "Official ATS"}
                  </span>
                  <span className="text-cyan-400 font-medium flex items-center gap-1">
                    Details <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6 border border-slate-800 relative overflow-hidden group">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Daily Job Automation</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
              Configure automated daily digests sent straight to your email with newly discovered eligible jobs.
            </p>
            <Link
              href="/automation"
              className="text-xs font-semibold text-cyan-400 flex items-center gap-1 hover:underline"
            >
              Configure Digest <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-slate-800 relative overflow-hidden group">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">AI Resume Builder</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
              Create clean, ATS-optimized resumes with modern templates and export directly to PDF.
            </p>
            <Link
              href="/resume-builder"
              className="text-xs font-semibold text-indigo-400 flex items-center gap-1 hover:underline"
            >
              Open Builder <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-slate-800 relative overflow-hidden group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">ATS Readiness Scorer</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
              Evaluate how your resume scores against actual job descriptions with keyword and formatting feedback.
            </p>
            <Link
              href="/ats-checker"
              className="text-xs font-semibold text-emerald-400 flex items-center gap-1 hover:underline"
            >
              Check ATS Score <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Job Detail Modal */}
        {selectedJob && (
          <JobModal job={selectedJob} onClose={() => setSelectedJob(null)} />
        )}
      </main>

      <Footer />
    </div>
  );
}
