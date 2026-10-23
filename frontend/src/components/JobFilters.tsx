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
    !indiaFeedOnly ||
    (selectedSortBy && selectedSortBy !== "verified")
  );

  return (
    <div className="w-full bg-card p-4 rounded-2xl border border-border shadow-xs mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
      {/* Work Mode & India Feed Toggle Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* India Feed Highlight Switch */}
        <button
          onClick={onToggleIndiaFeed}
          className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
            indiaFeedOnly
              ? "bg-[#087F68] text-white shadow-xs"
              : "bg-muted border border-border text-foreground hover:border-[#087F68]/40"
          }`}
          title="Filter for India Office, Remote India, and verified APAC/Worldwide feeds"
        >
          <span>🇮🇳</span>
          <span>India-Focused Feed</span>
          {filterOptions?.india_eligible_count !== undefined && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/20 text-white font-bold">
              {filterOptions.india_eligible_count}
            </span>
          )}
        </button>

        <div className="h-4 w-px bg-border hidden sm:block" />

        <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
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
              className={`text-xs font-medium px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                isActive
                  ? "bg-primary text-white shadow-xs font-semibold"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground border border-border"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Dropdown Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Company Dropdown */}
        <div className="relative">
          <select
            value={selectedCompany}
            onChange={(e) => onCompanyChange(e.target.value)}
            className="text-xs bg-background border border-border text-foreground rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer font-medium"
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
            className="text-xs bg-background border border-border text-foreground rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer font-medium"
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
            className="text-xs bg-background border border-border text-foreground rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer font-medium"
          >
            <option value="">All ATS Sources</option>
            {filterOptions?.sources.map((src) => (
              <option key={src.id} value={src.id}>
                {src.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By Dropdown */}
        <div className="relative">
          <select
            value={selectedSortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="text-xs bg-background border border-border text-foreground rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer font-medium"
          >
            <option value="verified">Verified Priority</option>
            <option value="newest">Most Recent</option>
            <option value="salary_desc">Highest Salary</option>
            <option value="company">Company Name</option>
          </select>
        </div>

        {/* Reset Button */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer"
            title="Reset all filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default JobFilters;
