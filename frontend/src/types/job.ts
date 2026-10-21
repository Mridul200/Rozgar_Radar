export interface JobListing {
  id: string;
  source_id: string;
  provider_job_id?: string;
  title: string;
  company_name: string;
  company_domain?: string;
  location_raw?: string;
  city?: string;
  country?: string;
  work_mode: "remote" | "hybrid" | "on_site" | "not_disclosed" | string;
  employment_type: "full_time" | "part_time" | "contract" | "internship" | "not_disclosed" | string;
  department?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_pay_period?: string;
  salary_display: string;
  location_display: string;
  application_url: string;
  canonical_url?: string;
  publication_date?: string;
  application_deadline?: string;
  first_seen_at: string;
  last_seen_at: string;
  last_checked_at: string;
  freshness_status: "active" | "potentially_expired" | "link_failed" | "source_unavailable" | "needs_review" | string;
  is_duplicate: boolean;
  source_name?: string;
  platform?: string;
  description?: string;
  description_plain?: string;
  required_qualifications?: string;
  location_category?: "india_office" | "remote_india" | "apac_worldwide" | "international_only" | string;
  is_india_eligible?: boolean;
  location_eligibility_reason?: string;
  location_badge?: string;
}


export interface JobListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: JobListing[];
}

export interface JobFilterOptions {
  companies: string[];
  locations: string[];
  work_modes: string[];
  employment_types: string[];
  departments?: string[];
  platforms?: string[];
  sources: { id: string; name: string }[];
  location_categories?: string[];
  india_eligible_count?: number;
  total_active_jobs?: number;
}

export interface SourceStatusSummary {
  id: string;
  name: string;
  source_type: string;
  ats_platform?: string;
  permission_status: "approved" | "permission_required" | "not_reviewed" | "restricted" | "unavailable" | string;
  sync_status: "idle" | "running" | "success" | "failed" | string;
  last_sync_at?: string;
  last_successful_sync_at?: string;
  last_error?: string;
  is_active: boolean;
  total_jobs: number;
  india_jobs: number;
}

export interface SyncLogItem {
  id: string;
  source_id: string;
  trigger_type: string;
  status: string;
  jobs_fetched: number;
  jobs_created: number;
  jobs_updated: number;
  duplicates_found: number;
  duration_ms: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}
