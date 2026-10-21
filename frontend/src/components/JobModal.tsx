"use client";

import { useState } from "react";
import { JobListing } from "@/types/job";
import { X, ExternalLink, MapPin, ShieldCheck, Banknote, Clock, Briefcase, Globe, Calendar, Bookmark, BookmarkCheck, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { saveJob } from "@/lib/api";

interface JobModalProps {
  job: JobListing | null;
  onClose: () => void;
}

const PLATFORM_COLORS: Record<string, string> = {
  greenhouse:      "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  lever:           "bg-violet-500/15 text-violet-300 border-violet-500/25",
  ashby:           "bg-sky-500/15 text-sky-300 border-sky-500/25",
  smartrecruiters: "bg-orange-500/15 text-orange-300 border-orange-500/25",
  workday:         "bg-blue-500/15 text-blue-300 border-blue-500/25",
  workable:        "bg-teal-500/15 text-teal-300 border-teal-500/25",
  recruitee:       "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/25",
  arbeitnow:       "bg-rose-500/15 text-rose-300 border-rose-500/25",
  aggregator:      "bg-slate-700/60 text-slate-300 border-slate-600/50",
};

const WORK_MODE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  on_site: "On-site",
  not_disclosed: "Flexible",
};

const WORK_MODE_STYLES: Record<string, string> = {
  remote:       "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  hybrid:       "bg-amber-500/10 text-amber-400 border-amber-500/20",
  on_site:      "bg-sky-500/10 text-sky-400 border-sky-500/20",
  not_disclosed:"bg-slate-800 text-slate-400 border-slate-700",
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
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!job) return null;

  const handleToggleSave = async () => {
    if (!token) {
      alert("Please sign in to save and track jobs.");
      return;
    }
    setSaving(true);
    try {
      await saveJob({ job_id: job.id, status: "saved" }, token);
      setIsSaved(true);
    } catch (e) {
      console.error(e);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-2xl glass-panel bg-slate-900/95 border border-slate-700/80
                      rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Gradient accent top */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500" />

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${platformStyle}`}>
                {platformLabel}
              </span>
              <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${workModeStyle}`}>
                {workModeLabel}
              </span>
              {job.employment_type !== "not_disclosed" && (
                <span className="text-[11px] text-slate-400 bg-slate-800/70 px-2.5 py-0.5 rounded-full border border-slate-700/50">
                  {empTypeLabel}
                </span>
              )}
              {job.location_category === "india_office" && (
                <span className="text-[11px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span>🇮🇳</span>
                  <span>India Office</span>
                </span>
              )}
              {job.location_category === "remote_india" && (
                <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span>🇮🇳</span>
                  <span>Remote (India Eligible)</span>
                </span>
              )}
              {job.location_category === "apac_worldwide" && (
                <span className="text-[11px] font-semibold text-sky-300 bg-sky-500/15 border border-sky-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span>🌏</span>
                  <span>APAC / Worldwide (Verified)</span>
                </span>
              )}
              {job.location_category === "international_only" && (
                <span className="text-[11px] font-medium text-slate-400 bg-slate-800/60 border border-slate-700 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span>🌍</span>
                  <span>International Only</span>
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold text-white leading-snug mb-2">
              {job.title}
            </h2>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="font-bold text-indigo-300">{job.company_name}</span>
              <span className="flex items-center gap-1 text-slate-400 text-xs">
                <MapPin className="w-3.5 h-3.5" />
                {job.location_display}
              </span>
              {hasSalary && (
                <span className="flex items-center gap-1 text-emerald-400 font-semibold text-xs">
                  <Banknote className="w-3.5 h-3.5" />
                  {job.salary_display}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-slate-300 text-sm leading-relaxed">
          {/* Source attribution row */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs flex-wrap">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Source: <strong className="text-white">{job.source_name || job.source_id}</strong>
                {platform !== "aggregator" && <span className="text-slate-400"> (ATS Direct Feed)</span>}
              </span>
            </div>
            <div className="flex items-center gap-3 text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Verified {lastChecked}
              </span>
            </div>
          </div>

          {/* Registration & Compensation Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-medium">{pubDateLabel}:</span>
                <span className="font-bold text-slate-200">{pubDateFormatted}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Deadline:</span>
                <span className={`font-bold ${job.application_deadline ? "text-amber-300" : "text-slate-500"}`}>
                  {job.application_deadline ? new Date(job.application_deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Open until filled"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Salary / CTC:</span>
                <span className="font-bold text-emerald-300">
                  {job.salary_display && job.salary_display !== "Not disclosed" ? job.salary_display : "Competitive / Industry Standard"}
                </span>
              </div>
            </div>
          </div>

          {/* Job description */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Job Description & Details
            </h4>
            {job.description ? (
              <div
                className="prose prose-invert max-w-none prose-sm prose-p:leading-relaxed
                           prose-headings:text-white prose-headings:font-semibold
                           prose-li:text-slate-300 prose-strong:text-white"
                dangerouslySetInnerHTML={{ __html: job.description }}
              />
            ) : job.description_plain ? (
              <p className="whitespace-pre-line text-slate-300">{job.description_plain}</p>
            ) : (
              <p className="text-slate-500 italic text-sm">
                No detailed description is included in this feed.
                View the complete listing on the company&apos;s official career page.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Always verify credentials independently before applying.
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white
                         rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleToggleSave}
              disabled={saving}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all ${
                isSaved
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                  : "bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200"
              }`}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
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
              className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500
                         text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-700/30
                         transition-all cursor-pointer hover:shadow-indigo-500/50 hover:shadow-lg"
            >
              <Globe className="w-3.5 h-3.5" />
              Apply on Official Site
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
