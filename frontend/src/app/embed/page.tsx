"use client";

import { useState, useEffect } from "react";
import { fetchJobs } from "@/lib/api";
import { JobListing } from "@/types/job";
import { JobModal } from "@/components/JobModal";
import { Search, MapPin, ExternalLink, Loader2, Globe } from "lucide-react";

export default function EmbedPage() {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    fetchJobs({
      keyword,
      work_mode: workMode,
      page: 1,
      page_size: 10,
    })
      .then((data) => {
        if (!isCancelled) {
          setJobs(data.items);
          setTotalJobs(data.total);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [keyword, workMode]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Compact Header */}
        <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Verified Job Vacancies</span>
              <span className="text-xs font-normal text-slate-400">({totalJobs} live)</span>
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
            Direct ATS Feed
          </span>
        </div>

        {/* Compact Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search roles, skills, companies..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1">
            {[
              { label: "All", value: "" },
              { label: "Remote", value: "remote" },
              { label: "Hybrid", value: "hybrid" },
              { label: "On-site", value: "on_site" },
            ].map((m) => (
              <button
                key={m.value}
                onClick={() => setWorkMode(m.value)}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium cursor-pointer transition-colors ${
                  workMode === m.value
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Job Cards */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="text-xs">Loading listings...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No matching openings found.
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-indigo-500/40 transition-all flex items-center justify-between gap-4 flex-wrap"
              >
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300">
                      {job.source_name || job.source_id}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {{"remote":"Remote","hybrid":"Hybrid","on_site":"On-site","not_disclosed":"Flexible"}[job.work_mode] ?? job.work_mode}
                    </span>
                    {job.salary_display !== "Not disclosed" && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold">
                        {job.salary_display}
                      </span>
                    )}

                  </div>
                  <h4
                    onClick={() => setSelectedJob(job)}
                    className="text-sm font-bold text-white hover:text-indigo-400 cursor-pointer transition-colors"
                  >
                    {job.title}
                  </h4>
                  <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                    <span className="text-slate-300 font-medium">{job.company_name}</span>
                    <span>•</span>
                    <span>📍 {job.location_display}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedJob(job)}
                    className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Details
                  </button>
                  <a
                    href={job.application_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors whitespace-nowrap"
                  >
                    <span>Apply</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <JobModal job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
}
