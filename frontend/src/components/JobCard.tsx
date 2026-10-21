"use client";

import { JobListing } from "@/types/job";
import { MapPin, Building2, Calendar, ExternalLink, CheckCircle2, Clock, Banknote, Briefcase } from "lucide-react";

interface JobCardProps {
  job: JobListing;
  onSelect: (job: JobListing) => void;
}

// Platform color + label map
const PLATFORM_CONFIG: Record<string, { label: string; color: string }> = {
  greenhouse:      { label: "Greenhouse",      color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" },
  lever:           { label: "Lever",           color: "bg-violet-500/15 text-violet-300 border-violet-500/25" },
  ashby:           { label: "Ashby",           color: "bg-sky-500/15 text-sky-300 border-sky-500/25" },
  smartrecruiters: { label: "SmartRecruiters", color: "bg-orange-500/15 text-orange-300 border-orange-500/25" },
  workday:         { label: "Workday",         color: "bg-blue-500/15 text-blue-300 border-blue-500/25" },
  workable:        { label: "Workable",        color: "bg-teal-500/15 text-teal-300 border-teal-500/25" },
  recruitee:       { label: "Recruitee",       color: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/25" },
  arbeitnow:       { label: "Arbeitnow",       color: "bg-rose-500/15 text-rose-300 border-rose-500/25" },
  aggregator:      { label: "Aggregator",      color: "bg-slate-700/60 text-slate-300 border-slate-600/50" },
};

const WORK_MODE_STYLES: Record<string, string> = {
  remote:       "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  hybrid:       "bg-amber-500/10 text-amber-400 border-amber-500/20",
  on_site:      "bg-sky-500/10 text-sky-400 border-sky-500/20",
  not_disclosed:"bg-slate-800 text-slate-500 border-slate-700",
};

const WORK_MODE_LABELS: Record<string, string> = {
  remote:       "Remote",
  hybrid:       "Hybrid",
  on_site:      "On-site",
  not_disclosed:"Flexible",
};

const EMP_TYPE_LABELS: Record<string, string> = {
  full_time:    "Full-time",
  part_time:    "Part-time",
  contract:     "Contract",
  internship:   "Internship",
  not_disclosed:"",
};

export function JobCard({ job, onSelect }: JobCardProps) {
  // Determine date source: prefer real publication_date from ATS, fallback to first_seen_at
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
    : "Competitive / Industry Standard";

  return (
    <div
      className="group relative glass-card rounded-2xl flex flex-col justify-between overflow-hidden
                 border border-slate-800/60 hover:border-indigo-500/40 transition-all duration-300
                 hover:shadow-lg hover:shadow-indigo-900/20 hover:-translate-y-0.5"
    >
      {/* Subtle top accent line on hover */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/0 to-transparent
                      group-hover:via-indigo-500/60 transition-all duration-300" />

      <div className="p-5 sm:p-6 flex flex-col gap-3">
        {/* Top row: Platform badge + work mode badge + freshness */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${platformCfg.color}`}>
              {platformCfg.label}
            </span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${workModeStyle}`}>
              {workModeLabel}
            </span>
            {empTypeLabel && (
              <span className="text-[11px] text-slate-400 bg-slate-800/70 px-2 py-0.5 rounded-full border border-slate-700/50 flex items-center gap-1">
                <Briefcase className="w-2.5 h-2.5" />
                {empTypeLabel}
              </span>
            )}
            {job.location_category === "india_office" && (
              <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span>🇮🇳</span>
                <span>India Office</span>
              </span>
            )}
            {job.location_category === "remote_india" && (
              <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span>🇮🇳</span>
                <span>Remote (India)</span>
              </span>
            )}
            {job.location_category === "apac_worldwide" && (
              <span className="text-[10px] font-semibold text-sky-300 bg-sky-500/10 border border-sky-500/25 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span>🌏</span>
                <span>APAC / Global</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 shrink-0 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            <span>Verified</span>
          </div>
        </div>

        {/* Job Title */}
        <h3
          onClick={() => onSelect(job)}
          className="text-base sm:text-lg font-bold text-white group-hover:text-indigo-300
                     transition-colors cursor-pointer line-clamp-2 leading-snug"
        >
          {job.title}
        </h3>

        {/* Company & Location */}
        <div className="flex flex-col gap-1.5 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-500" />
            <span className="font-semibold text-slate-200 truncate">{job.company_name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-500" />
            <span className="truncate">{job.location_display}</span>
          </div>
        </div>

        {/* Salary chip */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10
                        border border-emerald-500/20 text-emerald-300 text-xs font-semibold w-fit">
          <Banknote className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{salaryDisplay}</span>
        </div>

        {/* Registration Dates: only show if we have real data */}
        {(firstDateFormatted || lastDateFormatted) && (
          <div className="pt-2.5 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-400 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
              <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold tracking-wider">{firstDateLabel}</span>
                <span className="font-bold text-slate-200 text-xs">{firstDateFormatted || "—"}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold tracking-wider">Deadline</span>
                <span className={`font-bold text-xs ${lastDateFormatted ? "text-amber-300" : "text-slate-500"}`}>
                  {lastDateFormatted || "Open until filled"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="px-5 sm:px-6 pb-4 sm:pb-5 pt-2 flex items-center justify-between gap-3 border-t border-slate-800/40">
        <div className="text-[11px] text-slate-500 font-medium truncate">
          Official ATS Posting
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelect(job)}
            className="text-xs font-semibold text-slate-400 hover:text-white px-2.5 py-1.5
                       rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            Details
          </button>
          <a
            href={job.application_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg
                       bg-indigo-600 hover:bg-indigo-500 text-white
                       shadow-sm shadow-indigo-700/40 transition-all cursor-pointer whitespace-nowrap
                       hover:shadow-indigo-500/50 hover:shadow-md"
          >
            Apply
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
