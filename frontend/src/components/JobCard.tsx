"use client";

import React, { useState } from "react";
import { JobListing } from "@/types/job";
import {
  MapPin,
  Building2,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Clock,
  Banknote,
  Briefcase,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { saveJob, removeSavedJob } from "@/lib/api";

interface JobCardProps {
  job: JobListing;
  onSelect: (job: JobListing) => void;
  isSavedInitial?: boolean;
}

// Platform color + label map (optimized for both Light and Dark modes)
const PLATFORM_CONFIG: Record<string, { label: string; color: string }> = {
  greenhouse:      { label: "Greenhouse",      color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  lever:           { label: "Lever",           color: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30" },
  ashby:           { label: "Ashby",           color: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30" },
  smartrecruiters: { label: "SmartRecruiters", color: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30" },
  workday:         { label: "Workday",         color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  workable:        { label: "Workable",        color: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30" },
  recruitee:       { label: "Recruitee",       color: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30" },
  arbeitnow:       { label: "Arbeitnow",       color: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30" },
  aggregator:      { label: "Aggregator",      color: "bg-muted text-muted-foreground border-border" },
};

const WORK_MODE_STYLES: Record<string, string> = {
  remote:        "bg-emerald-500/10 text-[#087F68] dark:text-[#21A67A] border-emerald-500/30",
  hybrid:        "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  on_site:       "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30",
  not_disclosed: "bg-muted text-muted-foreground border-border",
};

const WORK_MODE_LABELS: Record<string, string> = {
  remote:        "Remote",
  hybrid:        "Hybrid",
  on_site:       "On-site",
  not_disclosed: "Flexible",
};

const EMP_TYPE_LABELS: Record<string, string> = {
  full_time:     "Full-time",
  part_time:     "Part-time",
  contract:      "Contract",
  internship:    "Internship",
  not_disclosed: "",
};

export function JobCard({ job, onSelect, isSavedInitial = false }: JobCardProps) {
  const { user, token } = useAuth();
  const [isSaved, setIsSaved] = useState(isSavedInitial);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) {
      alert("Please sign in or create an account to save jobs to your tracker.");
      return;
    }
    setIsSaving(true);
    try {
      if (isSaved) {
        await removeSavedJob(job.id, token);
        setIsSaved(false);
      } else {
        await saveJob({ job_id: job.id }, token);
        setIsSaved(true);
      }
    } catch (err) {
      console.error("Failed to toggle saved job:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const hasRealPubDate = !!job.publication_date;
  const firstDate = job.publication_date || job.first_seen_at;
  const firstDateFormatted = firstDate
    ? new Date(firstDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const firstDateLabel = hasRealPubDate ? "Posted" : "First Seen";

  const lastDateFormatted = job.application_deadline
    ? new Date(job.application_deadline).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const platform = job.platform?.toLowerCase() || "aggregator";
  const platformCfg = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG["aggregator"];

  const workModeStyle = WORK_MODE_STYLES[job.work_mode] ?? WORK_MODE_STYLES["not_disclosed"];
  const workModeLabel = WORK_MODE_LABELS[job.work_mode] ?? job.work_mode;
  const empTypeLabel  = EMP_TYPE_LABELS[job.employment_type] ?? "";

  const salaryDisplay = job.salary_display && job.salary_display !== "Not disclosed"
    ? job.salary_display
    : "Industry Standard";

  return (
    <div
      className="group relative glass-card rounded-2xl flex flex-col justify-between overflow-hidden
                 border border-border hover:border-primary/50 transition-all duration-300
                 hover:shadow-md hover:-translate-y-0.5 bg-card text-card-foreground"
    >
      {/* Subtle top accent line on hover */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/0 to-transparent
                      group-hover:via-primary/80 transition-all duration-300" />

      <div className="p-5 sm:p-6 flex flex-col gap-3.5">
        {/* Top row: Platform badge + work mode badge + Save Bookmark */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${platformCfg.color}`}>
              {platformCfg.label}
            </span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${workModeStyle}`}>
              {workModeLabel}
            </span>
            {empTypeLabel && (
              <span className="text-[11px] text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-md border border-border flex items-center gap-1 font-medium">
                <Briefcase className="w-3 h-3 opacity-70" />
                {empTypeLabel}
              </span>
            )}
            {job.location_category === "india_office" && (
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md flex items-center gap-1">
                <span>🇮🇳</span>
                <span>India Office</span>
              </span>
            )}
            {job.location_category === "remote_india" && (
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md flex items-center gap-1">
                <span>🇮🇳</span>
                <span>Remote (India)</span>
              </span>
            )}
            {job.location_category === "apac_worldwide" && (
              <span className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-500/10 border border-sky-500/25 px-2 py-0.5 rounded-md flex items-center gap-1">
                <span>🌏</span>
                <span>APAC / Global</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSave}
              disabled={isSaving}
              aria-label={isSaved ? "Remove from saved" : "Save job"}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isSaved
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title={isSaved ? "Saved in Tracker" : "Save to Tracker"}
            >
              {isSaved ? (
                <BookmarkCheck className="w-4 h-4 text-primary fill-primary/20" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>
            <div className="flex items-center gap-1 text-[11px] text-[#087F68] dark:text-[#21A67A] shrink-0 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified</span>
            </div>
          </div>
        </div>

        {/* Job Title */}
        <h3
          onClick={() => onSelect(job)}
          className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary
                     transition-colors cursor-pointer line-clamp-2 leading-snug"
        >
          {job.title}
        </h3>

        {/* Company & Location */}
        <div className="flex flex-col gap-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            <span className="font-semibold text-foreground truncate">{job.company_name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{job.location_display}</span>
          </div>
        </div>

        {/* Salary chip */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10
                        border border-emerald-500/20 text-[#087F68] dark:text-[#21A67A] text-xs font-semibold w-fit">
          <Banknote className="w-3.5 h-3.5 shrink-0" />
          <span>{salaryDisplay}</span>
        </div>

        {/* Registration Dates */}
        {(firstDateFormatted || lastDateFormatted) && (
          <div className="pt-2 border-t border-border grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-2 bg-muted/60 dark:bg-muted/30 px-2.5 py-1.5 rounded-lg border border-border">
              <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-muted-foreground block uppercase font-semibold tracking-wider">{firstDateLabel}</span>
                <span className="font-bold text-foreground text-xs">{firstDateFormatted || "—"}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-muted/60 dark:bg-muted/30 px-2.5 py-1.5 rounded-lg border border-border">
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-muted-foreground block uppercase font-semibold tracking-wider">Deadline</span>
                <span className={`font-bold text-xs ${lastDateFormatted ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>
                  {lastDateFormatted || "Open until filled"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="px-5 sm:px-6 pb-4 sm:pb-5 pt-3 flex items-center justify-between gap-3 border-t border-border bg-muted/20 dark:bg-transparent">
        <div className="text-[11px] text-muted-foreground font-medium truncate">
          Official ATS Ingestion
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelect(job)}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground px-2.5 py-1.5
                       rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            Details
          </button>
          <a
            href={job.application_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full
                       bg-primary hover:bg-[--primary-hover] text-white
                       shadow-xs transition-all cursor-pointer whitespace-nowrap hover:scale-102"
          >
            Apply
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default JobCard;
