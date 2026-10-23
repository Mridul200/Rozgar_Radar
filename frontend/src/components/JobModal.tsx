"use client";

import { useState, useEffect } from "react";
import { JobListing } from "@/types/job";
import { SavedJobItem } from "@/types/user";
import { X, ExternalLink, MapPin, ShieldCheck, Banknote, Clock, Briefcase, Globe, Calendar, Bookmark, BookmarkCheck, Check, Loader2, RefreshCw, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { saveJob, removeSavedJob, checkJobSaved } from "@/lib/api";

interface JobModalProps {
  job: JobListing | null;
  onClose: () => void;
}

const PLATFORM_COLORS: Record<string, string> = {
  greenhouse:      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  lever:           "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  ashby:           "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  smartrecruiters: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30",
  workday:         "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  workable:        "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30",
  recruitee:       "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30",
  arbeitnow:       "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  aggregator:      "bg-muted text-muted-foreground border-border",
};

const WORK_MODE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  on_site: "On-site",
  not_disclosed: "Flexible",
};

const WORK_MODE_STYLES: Record<string, string> = {
  remote:        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  hybrid:        "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  on_site:       "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30",
  not_disclosed: "bg-muted text-muted-foreground border-border",
};

const EMP_TYPE_LABELS: Record<string, string> = {
  full_time:    "Full-time",
  part_time:    "Part-time",
  contract:     "Contract",
  internship:   "Internship",
  not_disclosed:"Not Disclosed",
};

export function JobModal({ job, onClose }: JobModalProps) {
  const { user, token } = useAuth();
  const [savedRecord, setSavedRecord] = useState<SavedJobItem | null>(null);
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "loaded" | "error">(token ? "loading" : "idle");
  const [lookupRetryCount, setLookupRetryCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showIncompletePrompt, setShowIncompletePrompt] = useState(false);

  const handleApplyClick = (e: React.MouseEvent) => {
    if (user && (!user.mobile_number || !user.current_city)) {
      e.preventDefault();
      setShowIncompletePrompt(true);
      return;
    }
  };

  useEffect(() => {
    if (!job || !token) {
      setSavedRecord(null);
      setLookupState("idle");
      return;
    }
    let isCancelled = false;
    setLookupState("loading");
    checkJobSaved(job.id, token)
      .then((record) => {
        if (!isCancelled) {
          setSavedRecord(record);
          setLookupState("loaded");
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setLookupState("error");
        }
      });
    return () => {
      isCancelled = true;
    };
  }, [job?.id, token, lookupRetryCount]);

  if (!job) return null;

  const isBookmarked = savedRecord?.status === "saved";
  const isApplicationTracked = !!savedRecord && savedRecord.status !== "saved";

  const handleToggleSave = async () => {
    if (!token) {
      alert("Please sign in to save and track jobs.");
      return;
    }
    if (lookupState === "loading") {
      return;
    }
    if (lookupState === "error") {
      setLookupRetryCount((c) => c + 1);
      return;
    }
    if (isApplicationTracked) {
      alert(`This job is tracked in your applications as '${savedRecord.status}'. Manage it from the Application Tracker.`);
      return;
    }
    setSaving(true);
    try {
      if (isBookmarked && savedRecord && savedRecord.job_id === job.id) {
        // Confirm the persisted record still has status 'saved' before removal
        const fresh = await checkJobSaved(job.id, token);
        if (fresh && fresh.status !== "saved") {
          if (fresh.job_id === job.id) setSavedRecord(fresh);
          alert(`This job is tracked in your applications as '${fresh.status}'. Manage it from the Application Tracker.`);
          return;
        }
        await removeSavedJob(savedRecord.id, token);
        setSavedRecord(null);
      } else {
        const created = await saveJob({
          job_id: job.id,
          status: "saved",
        }, token);
        if (created.job_id === job.id) {
          setSavedRecord(created);
        }
      }
    } catch (err: any) {
      try {
        const latest = await checkJobSaved(job.id, token);
        if (latest && latest.job_id === job.id) {
          setSavedRecord(latest);
        }
      } catch {
        // ignore background refresh error
      }
      alert(err.message || "Failed to update saved job status.");
    } finally {
      setSaving(false);
    }
  };

  const hasRealPubDate = !!job.publication_date;
  const pubDate = job.publication_date || job.first_seen_at;
  const pubDateFormatted = pubDate
    ? new Date(pubDate).toLocaleDateString(undefined, {
        month: "short", day: "numeric", year: "numeric",
      })
    : "—";
  const pubDateLabel = hasRealPubDate ? "Posted" : "First Seen";

  const lastChecked = new Date(job.last_checked_at).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const platform = job.platform?.toLowerCase() || "aggregator";
  const platformLabel = (job.source_name || platform).toUpperCase();
  const platformStyle = PLATFORM_COLORS[platform] || PLATFORM_COLORS["aggregator"];
  const workModeLabel = WORK_MODE_LABELS[job.work_mode] ?? job.work_mode;
  const workModeStyle = WORK_MODE_STYLES[job.work_mode] ?? WORK_MODE_STYLES["not_disclosed"];
  const empTypeLabel = EMP_TYPE_LABELS[job.employment_type] ?? job.employment_type.replace("_", " ");
  const hasSalary = job.salary_display !== "Not disclosed";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-2xl bg-card border border-border
                      rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col text-card-foreground">
        {/* Gradient accent top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-indigo-500 to-teal-400" />

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-border flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${platformStyle}`}>
                {platformLabel}
              </span>
              <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-md border ${workModeStyle}`}>
                {workModeLabel}
              </span>
              {job.employment_type !== "not_disclosed" && (
                <span className="text-[11px] text-muted-foreground bg-muted px-2.5 py-0.5 rounded-md border border-border font-medium">
                  {empTypeLabel}
                </span>
              )}
              {job.location_category === "india_office" && (
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <span>🇮🇳</span>
                  <span>India Office</span>
                </span>
              )}
              {job.location_category === "remote_india" && (
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <span>🇮🇳</span>
                  <span>Remote (India Eligible)</span>
                </span>
              )}
              {job.location_category === "apac_worldwide" && (
                <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-500/15 border border-sky-500/30 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <span>🌏</span>
                  <span>APAC / Worldwide</span>
                </span>
              )}
              {job.location_category === "international_only" && (
                <span className="text-[11px] font-medium text-muted-foreground bg-muted border border-border px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <span>🌍</span>
                  <span>International Only</span>
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold text-foreground leading-snug mb-2">
              {job.title}
            </h2>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="font-bold text-primary">{job.company_name}</span>
              <span className="flex items-center gap-1 text-muted-foreground text-xs">
                <MapPin className="w-3.5 h-3.5" />
                {job.location_display}
              </span>
              {hasSalary && (
                <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                  <Banknote className="w-3.5 h-3.5" />
                  {job.salary_display}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-foreground text-sm leading-relaxed">
          {/* Source attribution row */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/60 border border-border text-xs flex-wrap">
            <div className="flex items-center gap-2 text-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Source: <strong className="text-foreground">{job.source_name || job.source_id}</strong>
                {platform !== "aggregator" && <span className="text-muted-foreground"> (ATS Direct Feed)</span>}
              </span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Verified {lastChecked}
              </span>
            </div>
          </div>

          {/* Registration & Compensation Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-medium">{pubDateLabel}:</span>
                <span className="font-bold text-foreground">{pubDateFormatted}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-medium">Deadline:</span>
                <span className={`font-bold ${job.application_deadline ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>
                  {job.application_deadline ? new Date(job.application_deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Open until filled"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-medium">Salary / CTC:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  {job.salary_display && job.salary_display !== "Not disclosed" ? job.salary_display : "Competitive / Industry Standard"}
                </span>
              </div>
            </div>
          </div>

          {/* Job description */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Job Description & Details
            </h4>
            {job.description ? (
              <div
                className="prose max-w-none prose-sm prose-p:leading-relaxed text-foreground"
                dangerouslySetInnerHTML={{ __html: job.description }}
              />
            ) : job.description_plain ? (
              <p className="whitespace-pre-line text-foreground">{job.description_plain}</p>
            ) : (
              <p className="text-muted-foreground italic text-sm">
                No detailed description is included in this feed.
                View the complete listing on the company&apos;s official career page.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-border bg-card flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[11px] text-muted-foreground hidden sm:block">
            Always verify credentials independently before applying.
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground
                         rounded-lg hover:bg-muted transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleToggleSave}
              disabled={saving || (!!token && lookupState === "loading")}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                token && lookupState === "error"
                  ? "bg-destructive/10 border-destructive/30 text-destructive"
                  : isApplicationTracked
                  ? "bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-300"
                  : isBookmarked
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-card hover:bg-muted border-border text-foreground"
              }`}
            >
              {token && lookupState === "loading" ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  Checking...
                </>
              ) : token && lookupState === "error" ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-destructive" />
                  Retry Check
                </>
              ) : isApplicationTracked ? (
                <>
                  <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Tracked ({savedRecord?.status})
                </>
              ) : isBookmarked ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Saved
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5" />
                  Save Job
                </>
              )}
            </button>
            <a
              href={job.application_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleApplyClick}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:opacity-90
                         text-primary-foreground font-bold text-xs rounded-xl shadow-md
                         transition-all cursor-pointer hover:scale-102"
            >
              <Globe className="w-3.5 h-3.5" />
              Apply on Official Site
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {showIncompletePrompt && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Complete Your Candidate Profile</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                To submit verified job applications and ensure recruiters can contact you, please complete your mandatory profile details (Mobile Number, Current City, and Education/Skills).
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowIncompletePrompt(false)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
              >
                Dismiss
              </button>
              <a
                href="/profile"
                className="px-5 py-2 text-xs font-bold bg-primary text-white rounded-xl hover:opacity-90 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                Complete Profile Now
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
