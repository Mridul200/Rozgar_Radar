"use client";
import { AppSidebarLayout } from "@/components/layout/AppSidebarLayout";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  fetchUserProfile,
  fetchSavedJobs,
  fetchAutomationConfig,
  fetchUserResumes,
  fetchJobs,
} from "@/lib/api";
import { UserProfile, SavedJobItem, AutomationConfig, ResumeRecord } from "@/types/user";
import { JobListing } from "@/types/job";
import { JobModal } from "@/components/JobModal";
import {
  Home,
  Briefcase,
  Zap,
  FileText,
  CheckCircle2,
  BookmarkCheck,
  User as UserIcon,
  ChevronsRight,
  ChevronDown,
  Moon,
  Sun,
  Bell,
  Settings,
  HelpCircle,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Loader2,
  Compass,
  LogOut,
  ShieldCheck,
  Clock,
  MapPin,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, logout, isLoading: authLoading } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [savedJobs, setSavedJobs] = useState<SavedJobItem[]>([]);
  const [automation, setAutomation] = useState<AutomationConfig | null>(null);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<JobListing[]>([]);
  const [totalLiveJobs, setTotalLiveJobs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(true);

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
    let score = 25;
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

  const sidebarLinks = [
    { title: "Dashboard", href: "/dashboard", Icon: Home, notifs: undefined },
    { title: "Explore Jobs", href: "/jobs", Icon: Compass, notifs: totalLiveJobs > 0 ? totalLiveJobs : undefined },
    { title: "Daily Automation", href: "/automation", Icon: Zap, notifs: automation?.is_active ? "ON" : undefined },
    { title: "Resume Builder", href: "/resume-builder", Icon: FileText, notifs: resumes.length > 0 ? resumes.length : undefined },
    { title: "ATS Readiness", href: "/ats-checker", Icon: CheckCircle2, notifs: undefined },
    { title: "Job Tracker", href: "/saved-jobs", Icon: BookmarkCheck, notifs: savedJobs.length > 0 ? savedJobs.length : undefined },
  ];

    return (
    <AppSidebarLayout>
      <div className="max-w-7xl mx-auto space-y-8">

          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-400 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                AI Job Search Copilot Active
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome back, {user?.full_name || "Candidate"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Here is your live job pipeline, automated dispatches, and ATS match readiness.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/automation"
                className="relative p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Automation Notifications"
              >
                <Bell className="h-4 w-4" />
                {automation?.is_active && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-emerald-400 rounded-full animate-ping" />
                )}
              </Link>
              <Link
                href="/profile"
                className="flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-xs font-semibold"
              >
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
                  {(user?.full_name || "U")[0].toUpperCase()}
                </div>
                <span className="hidden sm:inline">{user?.full_name?.split(" ")[0]}</span>
              </Link>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Saved & Tracker</span>
                <BookmarkCheck className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{savedJobs.length}</span>
                <span className="text-xs text-slate-400">Tracked</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {savedJobs.filter((j) => j.status === "applied").length} applied,{" "}
                {savedJobs.filter((j) => j.status === "interviewing").length} interviewing
              </p>
              <Link
                href="/saved-jobs"
                className="mt-3 text-xs text-cyan-400 font-medium inline-flex items-center gap-1 hover:underline"
              >
                Open tracker <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Daily Automation</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    automation?.is_active ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                  }`}
                />
                <span className="text-base font-bold text-white">
                  {automation?.is_active ? "Active & Scheduled" : "Paused"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {automation?.is_active
                  ? `Scheduled at ${automation.delivery_time || "09:00"} IST`
                  : "Enable daily job digests"}
              </p>
              <Link
                href="/automation"
                className="mt-3 text-xs text-cyan-400 font-medium inline-flex items-center gap-1 hover:underline"
              >
                Configure schedule <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">ATS Readiness</span>
                <FileText className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{resumes.length}</span>
                <span className="text-xs text-slate-400">Resumes created</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {resumes.length > 0 ? `Latest: ${resumes[0].title}` : "Build an ATS-ready resume"}
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
                  Direct official ATS openings from Greenhouse, Lever, Ashby, and top tech employers.
                </p>
              </div>
              <Link
                href="/jobs"
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                Browse All ({totalLiveJobs.toLocaleString()}) <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {recommendedJobs.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400">
                No recommended jobs yet. Update your skills and preferred roles in your profile.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendedJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col justify-between cursor-pointer hover:border-cyan-500/40 transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {job.source_id.replace("agg_", "").toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {job.publication_date
                            ? new Date(job.publication_date).toLocaleDateString()
                            : "Recent"}
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-sm line-clamp-2 hover:text-cyan-400 transition-colors">
                        {job.title}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium mt-1">
                        {job.company_name}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-3">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {job.location_display || "India"}
                        </span>
                        <span>&bull;</span>
                        <span className="capitalize">{job.work_mode.replace("_", " ")}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-semibold">
                        {job.salary_display || "Competitive"}
                      </span>
                      <span className="text-cyan-400 font-semibold flex items-center gap-1">
                        View & Apply <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      {/* Selected Job Modal */}
      {selectedJob && (
        <JobModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </AppSidebarLayout>
  );
}
