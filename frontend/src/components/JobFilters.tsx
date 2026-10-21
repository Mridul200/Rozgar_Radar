"use client";

import { JobFilterOptions } from "@/types/job";
import { Filter, RotateCcw, Briefcase, Building2, Globe2 } from "lucide-react";

interface JobFiltersProps {
  filterOptions: JobFilterOptions | null;
  selectedWorkMode: string;
  selectedCompany: string;
  selectedEmploymentType: string;
  selectedSourceId: string;
  selectedSortBy: string;
  selectedLocationCategory: string;
  indiaFeedOnly: boolean;
  onWorkModeChange: (mode: string) => void;
  onCompanyChange: (company: string) => void;
  onEmploymentTypeChange: (type: string) => void;
  onSourceChange: (sourceId: string) => void;
  onSortByChange: (sortBy: string) => void;
  onLocationCategoryChange: (category: string) => void;
  onToggleIndiaFeed: () => void;
  onReset: () => void;
}

export function JobFilters({
  filterOptions,
  selectedWorkMode,
  selectedCompany,
  selectedEmploymentType,
  selectedSourceId,
  selectedSortBy,
  selectedLocationCategory,
  indiaFeedOnly,
  onWorkModeChange,
  onCompanyChange,
  onEmploymentTypeChange,
  onSourceChange,
  onSortByChange,
  onLocationCategoryChange,
  onToggleIndiaFeed,
  onReset,
}: JobFiltersProps) {
  const hasActiveFilters = Boolean(
    selectedWorkMode ||
    selectedCompany ||
    selectedEmploymentType ||
    selectedSourceId ||
    selectedLocationCategory ||
    indiaFeedOnly ||
    (selectedSortBy && selectedSortBy !== "verified")
  );

  return (
    <div className="w-full glass-panel p-4 rounded-xl border border-slate-800/80 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Work Mode & India Feed Toggle Pills */}
      <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
        {/* India Feed Highlight Switch */}
        <button
          onClick={onToggleIndiaFeed}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
            indiaFeedOnly
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400"
              : "bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:border-emerald-500/50"
          }`}
          title="Filter for India Office, Remote India, and verified APAC/Worldwide feeds"
        >
          <span>🇮🇳</span>
          <span>India-Focused Feed</span>
          {filterOptions?.india_eligible_count !== undefined && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-950/60 font-bold border border-emerald-500/30">
              {filterOptions.india_eligible_count}
            </span>
          )}
        </button>

        <div className="h-4 w-px bg-slate-800 hidden sm:block" />

        <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
          <Globe2 className="w-3.5 h-3.5" />
          Work Mode:
        </span>
        {[
          { label: "All", value: "" },
          { label: "Remote", value: "remote" },
          { label: "Hybrid", value: "hybrid" },
          { label: "On-site", value: "on_site" },
        ].map((item) => {
          const isActive = selectedWorkMode === item.value;
          return (
            <button
              key={item.value}
              onClick={() => onWorkModeChange(item.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                  : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Dropdown Filters */}
      <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
        {/* Company Dropdown */}
        <div className="relative">
          <select
            value={selectedCompany}
            onChange={(e) => onCompanyChange(e.target.value)}
            className="text-xs bg-slate-900 border border-slate-700/80 text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="">All Companies</option>
            {filterOptions?.companies.map((comp) => (
              <option key={comp} value={comp}>
                {comp}
              </option>
            ))}
          </select>
        </div>

        {/* Employment Type */}
        <div className="relative">
          <select
            value={selectedEmploymentType}
            onChange={(e) => onEmploymentTypeChange(e.target.value)}
            className="text-xs bg-slate-900 border border-slate-700/80 text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
        </div>

        {/* Source Dropdown */}
        <div className="relative">
          <select
            value={selectedSourceId}
            onChange={(e) => onSourceChange(e.target.value)}
            className="text-xs bg-slate-900 border border-slate-700/80 text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="">All Sources</option>
            {filterOptions?.sources.map((src) => (
              <option key={src.id} value={src.id}>
                {src.name}
              </option>
            ))}
          </select>
        </div>

        {/* Location Scope Dropdown */}
        <div className="relative">
          <select
            value={selectedLocationCategory}
            onChange={(e) => onLocationCategoryChange(e.target.value)}
            className="text-xs bg-slate-900 border border-emerald-700/60 text-emerald-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-400 cursor-pointer"
          >
            <option value="">All Locations</option>
            <option value="india_office">🇮🇳 India Office</option>
            <option value="remote_india">🇮🇳 Remote (India Eligible)</option>
            <option value="apac_worldwide">🌏 APAC / Worldwide (Verified)</option>
            <option value="international_only">🌍 International Only</option>
          </select>
        </div>

        {/* Sort By Dropdown */}
        <div className="relative">
          <select
            value={selectedSortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="text-xs bg-slate-900 border border-indigo-700/60 text-indigo-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-400 cursor-pointer"
          >
            <option value="verified">Sort: ATS Verified First</option>
            <option value="newest">Sort: Newest First</option>
            <option value="salary_desc">Sort: Highest Salary</option>
            <option value="company">Sort: Company (A-Z)</option>
            <option value="title">Sort: Title (A-Z)</option>
          </select>
        </div>

        {/* Reset button */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 transition-colors cursor-pointer"
            title="Reset filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
