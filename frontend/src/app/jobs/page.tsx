"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { AppSidebarLayout } from "@/components/layout/AppSidebarLayout";
import { Footer } from "@/components/layout/Footer";
import { SearchBar } from "@/components/SearchBar";
import { JobFilters } from "@/components/JobFilters";
import { JobCard } from "@/components/JobCard";
import { JobModal } from "@/components/JobModal";
import { fetchJobs, fetchFilterOptions } from "@/lib/api";
import { JobListing, JobFilterOptions } from "@/types/job";
import { useAuth } from "@/lib/auth-context";
import {
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Sparkles
} from "lucide-react";

export default function JobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [company, setCompany] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [sortBy, setSortBy] = useState("verified");
  const [indiaFeed, setIndiaFeed] = useState(true);
  const [locationCategory, setLocationCategory] = useState("");
  const [filterOptions, setFilterOptions] = useState<JobFilterOptions | null>(null);

  // Modals state
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);

  useEffect(() => {
    fetchFilterOptions()
      .then(setFilterOptions)
      .catch((err) => console.error("Error loading filter options:", err));
  }, []);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    fetchJobs({
      keyword,
      location,
      work_mode: workMode,
      company,
      employment_type: employmentType,
      source_id: sourceId,
      sort_by: sortBy,
      india_feed: indiaFeed ? true : undefined,
      location_category: locationCategory || undefined,
      page: currentPage,
      page_size: 15,
    })
      .then((data) => {
        if (!isCancelled) {
          setJobs(data.items);
          setTotalJobs(data.total);
          setTotalPages(data.total_pages);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err.message || "Failed to load jobs");
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [keyword, location, workMode, company, employmentType, sourceId, sortBy, indiaFeed, locationCategory, currentPage]);

  const handleSearch = (kw: string, loc: string) => {
    setKeyword(kw);
    setLocation(loc);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setKeyword("");
    setLocation("");
    setWorkMode("");
    setCompany("");
    setEmploymentType("");
    setSourceId("");
    setSortBy("verified");
    setIndiaFeed(true);
    setLocationCategory("");
    setCurrentPage(1);
  };

  const pageBody = (
    <div className="max-w-7xl w-full mx-auto space-y-6">
        {/* Page Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-400 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Verified Multi-Source Ingestion Pipeline
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Explore Verified Tech Jobs
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Direct official career openings across Greenhouse, Lever, Ashby, and India tech hubs with zero duplicate spam.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
              {totalJobs.toLocaleString()} Active Listings
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar
            initialKeyword={keyword}
            initialLocation={location}
            onSearch={handleSearch}
          />
        </div>

        {/* Filters */}
        <JobFilters
          filterOptions={filterOptions}
          selectedWorkMode={workMode}
          selectedCompany={company}
          selectedEmploymentType={employmentType}
          selectedSourceId={sourceId}
          selectedSortBy={sortBy}
          selectedLocationCategory={locationCategory}
          indiaFeedOnly={indiaFeed}
          onWorkModeChange={(m) => { setWorkMode(m); setCurrentPage(1); }}
          onCompanyChange={(c) => { setCompany(c); setCurrentPage(1); }}
          onEmploymentTypeChange={(t) => { setEmploymentType(t); setCurrentPage(1); }}
          onSourceChange={(s) => { setSourceId(s); setCurrentPage(1); }}
          onSortByChange={(s) => { setSortBy(s); setCurrentPage(1); }}
          onLocationCategoryChange={(cat) => { setLocationCategory(cat); setCurrentPage(1); }}
          onToggleIndiaFeed={() => { setIndiaFeed((prev) => !prev); setCurrentPage(1); }}
          onReset={handleResetFilters}
        />

        {/* Results Info */}
        <div className="flex items-center justify-between my-6 text-xs text-slate-400">
          <span>
            Showing <strong className="text-white">{jobs.length}</strong> of <strong className="text-white">{totalJobs.toLocaleString()}</strong> listings
            {indiaFeed && " • India-Eligible"}
          </span>
          <span>Page {currentPage} of {totalPages}</span>
        </div>

        {/* Job Grid / Loader / Error */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse p-6" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-rose-300">Unable to load jobs</h3>
            <p className="text-xs text-rose-400 mt-1">{error}</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center max-w-md mx-auto my-8">
            <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No matching jobs found</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Try adjusting your keywords, locations, or clearing your active filters.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} onSelect={(j) => setSelectedJob(j)} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-4 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

    </div>
  );

  return (
    <>
      {user ? (
        <AppSidebarLayout>{pageBody}</AppSidebarLayout>
      ) : (
        <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {pageBody}
          </main>
          <Footer />
        </div>
      )}

      {selectedJob && (
        <JobModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </>
  );
}