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
  Sparkles,
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
      company: company,
      employment_type: employmentType,
      source_id: sourceId,
      sort_by: sortBy,
      india_feed: indiaFeed,
      location_category: locationCategory,
      page: currentPage,
      page_size: 15,
    })
      .then((data) => {
        if (!isCancelled) {
          setJobs(data.items || []);
          setTotalJobs(data.total || 0);
          setTotalPages(data.total_pages || 1);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err.message || "Failed to load jobs");
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [
    keyword,
    location,
    workMode,
    company,
    employmentType,
    sourceId,
    sortBy,
    indiaFeed,
    locationCategory,
    currentPage,
  ]);

  const handleSearch = (newKeyword: string, newLocation: string) => {
    setKeyword(newKeyword);
    setLocation(newLocation);
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Verified Multi-Source Ingestion Pipeline
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Explore Verified Tech Jobs
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Direct official career openings across Greenhouse, Lever, Ashby, and India tech hubs with zero duplicate spam.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-card border border-border text-foreground shadow-sm">
            {totalJobs.toLocaleString()} Active Listings
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar
          key={`${keyword}|${location}`}
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
      <div className="flex items-center justify-between my-6 text-xs text-muted-foreground">
        <span>
          Showing <strong className="text-foreground font-semibold">{jobs.length}</strong> of <strong className="text-foreground font-semibold">{totalJobs.toLocaleString()}</strong> listings
          {indiaFeed && " • India-Eligible"}
        </span>
        <span>Page {currentPage} of {totalPages}</span>
      </div>

      {/* Job Grid / Loader / Error */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-card border border-border animate-pulse p-6 shadow-sm" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-destructive/10 border border-destructive/20 text-center">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={handleResetFilters}
            className="mt-3 text-xs font-semibold underline text-primary cursor-pointer"
          >
            Reset Filters & Try Again
          </button>
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-12 rounded-2xl bg-card border border-border text-center shadow-sm">
          <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">No matching openings found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords, location filter, or toggling the India-focused feed.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onSelect={(j) => setSelectedJob(j)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-8 pb-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted disabled:opacity-40 transition-colors shadow-sm cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-semibold px-4 py-2 rounded-xl bg-card border border-border text-foreground shadow-sm">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted disabled:opacity-40 transition-colors shadow-sm cursor-pointer"
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
        <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
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
