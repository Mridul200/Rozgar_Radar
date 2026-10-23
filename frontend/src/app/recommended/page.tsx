"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { JobModal } from "@/components/JobModal";
import { useAuth } from "@/lib/auth-context";
import { fetchRecommendedJobs, saveJob, removeSavedJob } from "@/lib/api";
import { RecommendedJobItem, JobListing } from "@/types/job";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  MapPin,
  Banknote,
  Clock,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  SlidersHorizontal,
  ArrowRight,
  ShieldCheck,
  Layers,
  GraduationCap,
  Calendar,
  RefreshCw,
  Info,
} from "lucide-react";

const MATCH_THRESHOLDS = [
  { label: "All Matches", value: 0.0, minPct: "0%+" },
  { label: "Good (≥50%)", value: 0.50, minPct: "50%+" },
  { label: "Strong (≥70%)", value: 0.70, minPct: "70%+" },
  { label: "Top (≥85%)", value: 0.85, minPct: "85%+" },
];

export default function RecommendedJobsPage() {
  const { user, token, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<RecommendedJobItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [minScore, setMinScore] = useState<number>(0.0);
  const [profileComplete, setProfileComplete] = useState(true);
  const [profileCompletionPct, setProfileCompletionPct] = useState(100);

  // Modal inspection
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [savingJobId, setSavingJobId] = useState<string | null>(null);

  const loadRecommendations = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRecommendedJobs(
        { page, page_size: 15, min_score: minScore },
        token
      );
      setJobs(data.results);
      setTotal(data.total);
      setTotalPages(data.total_pages);
      setProfileComplete(data.profile_complete);
      setProfileCompletionPct(data.profile_completion_pct);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load job recommendations";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [token, page, minScore]);

  useEffect(() => {
    if (!authLoading) {
      loadRecommendations();
    }
  }, [authLoading, loadRecommendations]);

  const handleToggleSave = async (jobItem: RecommendedJobItem) => {
    if (!token) return;
    const isSaved = savedJobIds.has(jobItem.job_id);
    setSavingJobId(jobItem.job_id);
    try {
      if (isSaved) {
        await removeSavedJob(jobItem.job_id, token);
        setSavedJobIds((prev) => {
          const next = new Set(prev);
          next.delete(jobItem.job_id);
          return next;
        });
      } else {
        await saveJob({ job_id: jobItem.job_id, status: "saved" }, token);
        setSavedJobIds((prev) => new Set(prev).add(jobItem.job_id));
      }
    } catch {
      // ignore
    } finally {
      setSavingJobId(null);
    }
  };

  const openJobModal = (item: RecommendedJobItem) => {
    const jobListing: JobListing = {
      id: item.job_id,
      source_id: "recommendation",
      title: item.title,
      company_name: item.company_name,
      city: item.city,
      work_mode: item.work_mode,
      employment_type: item.employment_type,
      department: item.department,
      salary_min: item.salary_min,
      salary_max: item.salary_max,
      salary_currency: item.salary_currency,
      salary_pay_period: item.salary_pay_period,
      salary_display: item.salary_display,
      location_display: item.city || "India",
      application_url: item.application_url,
      first_seen_at: item.first_seen_at || new Date().toISOString(),
      last_seen_at: item.first_seen_at || new Date().toISOString(),
      last_checked_at: item.first_seen_at || new Date().toISOString(),
      freshness_status: "active",
      is_duplicate: false,
      location_category: item.location_category,
      is_india_eligible: true,
    };
    setSelectedJob(jobListing);
  };

  const getScoreBadgeColor = (pct: number) => {
    if (pct >= 80) {
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    }
    if (pct >= 60) {
      return "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30";
    }
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
  };

  const getWorkModeBadge = (mode: string) => {
    switch (mode) {
      case "remote":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
      case "hybrid":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "on_site":
        return "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header Strip */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pb-6 border-b border-border">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              AI Matching Engine
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Recommended Jobs
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
              Opportunities tailored specifically to your verified skills, experience level,
              target role, preferred locations, and salary expectation.
            </p>
          </div>

          {token && (
            <button
              onClick={() => loadRecommendations()}
              disabled={loading}
              className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-accent text-xs font-medium text-foreground transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Matches
            </button>
          )}
        </div>

        {/* Unauthenticated State */}
        {!token && !authLoading && (
          <div className="p-8 sm:p-12 rounded-2xl border border-border bg-card text-center max-w-2xl mx-auto my-12 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold mb-2">Personalized Recommendations Require Sign In</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Sign in to your candidate account or register in under 1 minute to receive structured,
              accurately scored job recommendations matched against your profile.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/auth/login?redirect=/recommended"
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="px-5 py-2.5 rounded-xl border border-border bg-background hover:bg-accent text-sm font-semibold transition-colors"
              >
                Create Candidate Account
              </Link>
            </div>
          </div>
        )}

        {/* Authenticated Content */}
        {token && (
          <>
            {/* Profile Completeness Alert (if under 60%) */}
            {!profileComplete && profileCompletionPct < 60 && (
              <div className="mb-8 p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                      Your Profile is {profileCompletionPct}% Complete
                    </h3>
                    <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-0.5">
                      Adding your target roles, years of experience, and standardized skills will unlock
                      higher accuracy and more relevant match recommendations.
                    </p>
                  </div>
                </div>
                <Link
                  href="/profile"
                  className="shrink-0 px-4 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  Complete Profile
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Threshold Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border">
                {MATCH_THRESHOLDS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => {
                      setMinScore(t.value);
                      setPage(1);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      minScore === t.value
                        ? "bg-background text-foreground shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{jobs.length}</span> of{" "}
                <span className="font-semibold text-foreground">{total}</span> opportunities
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm mb-6 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Loading Skeletons */}
            {loading && (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="p-6 rounded-2xl border border-border bg-card animate-pulse space-y-4"
                  >
                    <div className="h-6 bg-muted rounded-md w-1/3" />
                    <div className="h-4 bg-muted rounded-md w-1/4" />
                    <div className="h-4 bg-muted rounded-md w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && jobs.length === 0 && (
              <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/50 my-6">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-foreground">No matches found for this threshold</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-5">
                  Try switching the threshold to &quot;All Matches&quot; or update your candidate profile skills and target roles to find more relevant positions.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setMinScore(0.0);
                      setPage(1);
                    }}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
                  >
                    View All Matches
                  </button>
                  <Link
                    href="/profile"
                    className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent text-xs font-semibold"
                  >
                    Edit Profile Skills
                  </Link>
                </div>
              </div>
            )}

            {/* Jobs List */}
            {!loading && jobs.length > 0 && (
              <div className="space-y-4">
                {jobs.map((item) => {
                  const isSaved = savedJobIds.has(item.job_id);
                  const isSaving = savingJobId === item.job_id;

                  return (
                    <div
                      key={item.job_id}
                      className="p-5 sm:p-6 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all shadow-xs hover:shadow-md flex flex-col gap-4"
                    >
                      {/* Top Row: Title, Match Badge, Save Button */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getScoreBadgeColor(
                                item.match_score_pct
                              )}`}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              {item.match_score_pct}% Match
                            </span>

                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border capitalize ${getWorkModeBadge(
                                item.work_mode
                              )}`}
                            >
                              {item.work_mode.replace("_", " ")}
                            </span>

                            {item.employment_type && item.employment_type !== "not_disclosed" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground">
                                {item.employment_type.replace("_", " ")}
                              </span>
                            )}
                          </div>

                          <h2
                            onClick={() => openJobModal(item)}
                            className="text-lg sm:text-xl font-bold text-foreground hover:text-primary transition-colors cursor-pointer truncate"
                          >
                            {item.title}
                          </h2>

                          <p className="text-sm font-medium text-muted-foreground mt-0.5">
                            {item.company_name}
                            {item.department ? ` · ${item.department}` : ""}
                          </p>
                        </div>

                        {/* Save Bookmark */}
                        <button
                          onClick={() => handleToggleSave(item)}
                          disabled={isSaving}
                          aria-label={isSaved ? "Remove from saved" : "Save job"}
                          className={`p-2.5 rounded-xl border transition-colors shrink-0 ${
                            isSaved
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                          }`}
                        >
                          {isSaved ? (
                            <BookmarkCheck className="w-4 h-4 fill-primary" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Details Strip (Location, Salary, Date) */}
                      <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-muted-foreground pt-1 border-t border-border/50">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{item.city || "All India"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Banknote className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-medium text-foreground">{item.salary_display}</span>
                        </div>
                        {item.first_seen_at && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>
                              Discovered {new Date(item.first_seen_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Reasons Strip */}
                      {item.reasons.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {item.reasons.map((r, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/60 text-foreground text-[11px] font-medium"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                              {r}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Skills Matching Chips */}
                      {(item.matched_skills.length > 0 || item.missing_skills.length > 0) && (
                        <div className="pt-2 border-t border-border/50 flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-muted-foreground mr-1">
                              Matched Skills:
                            </span>
                            {item.matched_skills.map((s) => (
                              <span
                                key={s}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-medium"
                              >
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                {s}
                              </span>
                            ))}
                            {item.missing_skills.slice(0, 3).map((s) => (
                              <span
                                key={s}
                                className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-dashed border-border text-[11px]"
                                title="Missing from your profile"
                              >
                                + {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                        <button
                          onClick={() => openJobModal(item)}
                          className="px-4 py-2 rounded-xl border border-border bg-background hover:bg-accent text-xs font-semibold text-foreground transition-colors"
                        >
                          View Full Details
                        </button>
                        <a
                          href={item.application_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-colors shadow-xs"
                        >
                          Apply Directly
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-foreground transition-colors"
                >
                  Previous
                </button>
                <span className="text-xs text-muted-foreground font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-foreground transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />

      {/* Detail Modal */}
      {selectedJob && (
        <JobModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}
