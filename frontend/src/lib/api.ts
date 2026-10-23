import {
  JobListResponse,
  JobFilterOptions,
  JobListing,
  SourceStatusSummary,
  SyncLogItem
} from "@/types/job";
import {
  User,
  UserProfile,
  SavedJobItem,
  AutomationConfig,
  AutomationLogItem,
  ResumeRecord,
  ResumeData,
  ATSAnalysisResult,
  ATSAnalysisHistoryItem,
  ResumeSuggestResponse,
  ResumeImportResponse
} from "@/types/user";

const RAW_API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").trim();
const API_BASE = RAW_API_URL.endsWith("/api/v1")
  ? RAW_API_URL
  : `${RAW_API_URL.replace(/\/+$/, "")}/api/v1`;

function getAuthHeader(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else if (typeof window !== "undefined") {
    const saved = localStorage.getItem("hirepulse_auth_token");
    if (saved) {
      headers["Authorization"] = `Bearer ${saved}`;
    }
  }
  return headers;
}

/* ===========================
   JOB SEARCH & FILTERS
   =========================== */

export interface FetchJobsParams {
  keyword?: string;
  company?: string;
  location?: string;
  work_mode?: string;
  employment_type?: string;
  department?: string;
  experience_level?: string;
  min_salary?: number;
  posted_within_days?: number;
  source_id?: string;
  platform?: string;
  sort_by?: string;
  india_feed?: boolean;
  location_category?: string;
  page?: number;
  page_size?: number;
}

export async function fetchJobs(params: FetchJobsParams = {}): Promise<JobListResponse> {
  const query = new URLSearchParams();
  if (params.keyword) query.set("keyword", params.keyword);
  if (params.company) query.set("company", params.company);
  if (params.location) query.set("location", params.location);
  if (params.work_mode) query.set("work_mode", params.work_mode);
  if (params.employment_type) query.set("employment_type", params.employment_type);
  if (params.department) query.set("department", params.department);
  if (params.experience_level) query.set("experience_level", params.experience_level);
  if (params.min_salary && params.min_salary > 0) query.set("min_salary", params.min_salary.toString());
  if (params.posted_within_days && params.posted_within_days > 0) query.set("posted_within_days", params.posted_within_days.toString());
  if (params.source_id) query.set("source_id", params.source_id);
  if (params.platform) query.set("platform", params.platform);
  if (params.sort_by) query.set("sort_by", params.sort_by);
  if (params.india_feed !== undefined) query.set("india_feed", params.india_feed ? "true" : "false");
  if (params.location_category) query.set("location_category", params.location_category);
  if (params.page) query.set("page", params.page.toString());
  if (params.page_size) query.set("page_size", params.page_size.toString());

  const res = await fetch(`${API_BASE}/jobs?${query.toString()}`, { cache: "no-store", headers: { "Cache-Control": "no-cache, no-store, must-revalidate", Pragma: "no-cache" } });
  if (!res.ok) {
    throw new Error(`Failed to fetch jobs: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchFilterOptions(): Promise<JobFilterOptions> {
  const res = await fetch(`${API_BASE}/jobs/filters`, { cache: "no-store", headers: { "Cache-Control": "no-cache, no-store, must-revalidate", Pragma: "no-cache" } });
  if (!res.ok) {
    throw new Error(`Failed to fetch filters: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchJobById(id: string): Promise<JobListing> {
  const res = await fetch(`${API_BASE}/jobs/${id}`, { cache: "no-store", headers: { "Cache-Control": "no-cache, no-store, must-revalidate", Pragma: "no-cache" } });
  if (!res.ok) {
    throw new Error(`Job not found: ${res.statusText}`);
  }
  return res.json();
}

/* ===========================
   AUTHENTICATION & USER
   =========================== */

export async function registerUser(data: { email: string; password: string; full_name: string }): Promise<{ access_token: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Registration failed");
  }
  return res.json();
}

export async function loginUser(data: { email: string; password: string }): Promise<{ access_token: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Invalid credentials");
  }
  return res.json();
}

export async function fetchMe(token?: string | null): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { ...getAuthHeader(token) },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to load user profile");
  }
  return res.json();
}

/* ===========================
   USER PROFILE
   =========================== */

export async function fetchUserProfile(token?: string | null): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/profile`, {
    headers: { ...getAuthHeader(token) },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch profile");
  }
  return res.json();
}

export async function updateUserProfile(data: Partial<UserProfile>, token?: string | null): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(token),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update profile");
  }
  return res.json();
}

/* ===========================
   SAVED JOBS & TRACKER
   =========================== */

export async function fetchSavedJobs(statusFilter?: string, token?: string | null): Promise<SavedJobItem[]> {
  const url = statusFilter
    ? `${API_BASE}/saved-jobs?status_filter=${encodeURIComponent(statusFilter)}`
    : `${API_BASE}/saved-jobs`;

  const res = await fetch(url, {
    headers: { ...getAuthHeader(token) },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch saved jobs");
  }
  return res.json();
}

export async function checkJobSaved(jobId: string, token?: string | null): Promise<SavedJobItem | null> {
  const res = await fetch(`${API_BASE}/saved-jobs?job_id=${encodeURIComponent(jobId)}`, {
    headers: { ...getAuthHeader(token) },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to check saved job status");
  }
  const items: SavedJobItem[] = await res.json();
  return items.length > 0 ? items[0] : null;
}

export async function saveJob(data: { job_id: string; status?: string; notes?: string }, token?: string | null): Promise<SavedJobItem> {
  const res = await fetch(`${API_BASE}/saved-jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(token),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to save job");
  }
  return res.json();
}

export async function updateSavedJob(
  id: string,
  data: { status?: string; notes?: string; applied_at?: string },
  token?: string | null
): Promise<SavedJobItem> {
  const res = await fetch(`${API_BASE}/saved-jobs/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(token),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update job status");
  }
  return res.json();
}

export async function removeSavedJob(id: string, token?: string | null): Promise<void> {
  const res = await fetch(`${API_BASE}/saved-jobs/${id}`, {
    method: "DELETE",
    headers: { ...getAuthHeader(token) },
  });
  if (!res.ok) {
    throw new Error("Failed to remove saved job");
  }
}

/* ===========================
   DAILY JOB AUTOMATION
   =========================== */

export async function fetchAutomationConfig(token?: string | null): Promise<AutomationConfig> {
  const res = await fetch(`${API_BASE}/automation`, {
    headers: { ...getAuthHeader(token) },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch automation settings");
  }
  return res.json();
}

export async function updateAutomationConfig(data: Partial<AutomationConfig>, token?: string | null): Promise<AutomationConfig> {
  const res = await fetch(`${API_BASE}/automation`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(token),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update automation settings");
  }
  return res.json();
}

export async function fetchAutomationPreview(token?: string | null): Promise<{ total_matches: number; threshold: number; sample_jobs: any[] }> {
  const res = await fetch(`${API_BASE}/automation/preview`, {
    headers: { ...getAuthHeader(token) },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch automation preview");
  }
  return res.json();
}

export async function triggerAutomationDigest(isTest: boolean = false, token?: string | null, targetEmail?: string): Promise<any> {
  let url = `${API_BASE}/automation/trigger?is_test=${isTest}`;
  if (targetEmail) {
    url += `&target_email=${encodeURIComponent(targetEmail.trim())}`;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { ...getAuthHeader(token) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to trigger automation digest");
  }
  return res.json();
}

export async function sendAutomationTestEmail(targetEmail?: string, token?: string | null): Promise<any> {
  const url = targetEmail 
    ? `${API_BASE}/automation/test-email?target_email=${encodeURIComponent(targetEmail)}` 
    : `${API_BASE}/automation/test-email`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...getAuthHeader(token) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to send test email");
  }
  return res.json();
}

export async function fetchAutomationLogs(token?: string | null): Promise<AutomationLogItem[]> {
  const res = await fetch(`${API_BASE}/automation/logs?limit=15`, {
    headers: { ...getAuthHeader(token) },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch automation logs");
  }
  return res.json();
}

/* ===========================
   RESUME BUILDER & ATS CHECKER
   =========================== */

export async function fetchUserResumes(token?: string | null): Promise<ResumeRecord[]> {
  const res = await fetch(`${API_BASE}/resumes`, {
    headers: { ...getAuthHeader(token) },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch resumes");
  }
  return res.json();
}

export async function saveResume(
  data: { id?: string; title: string; template: string; content_json: ResumeData },
  token?: string | null
): Promise<ResumeRecord> {
  const method = data.id ? "PUT" : "POST";
  const url = data.id ? `${API_BASE}/resumes/${data.id}` : `${API_BASE}/resumes`;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(token),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to save resume");
  }
  return res.json();
}

export async function deleteResume(id: string, token?: string | null): Promise<void> {
  const res = await fetch(`${API_BASE}/resumes/${id}`, {
    method: "DELETE",
    headers: { ...getAuthHeader(token) },
  });
  if (!res.ok) {
    throw new Error("Failed to delete resume");
  }
}

export async function duplicateResume(id: string, token?: string | null): Promise<ResumeRecord> {
  const res = await fetch(`${API_BASE}/resumes/${id}/duplicate`, {
    method: "POST",
    headers: { ...getAuthHeader(token) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to duplicate resume");
  }
  return res.json();
}

export async function importResume(file: File, token?: string | null): Promise<ResumeImportResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/resumes/import`, {
    method: "POST",
    headers: { ...getAuthHeader(token) },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to parse resume document");
  }
  return res.json();
}

export async function suggestResumeAI(
  task: "summary" | "bullets" | "project" | "enhance" | "tailor",
  context: Record<string, any>,
  token?: string | null
): Promise<ResumeSuggestResponse> {
  const res = await fetch(`${API_BASE}/resumes/ai/suggest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(token),
    },
    body: JSON.stringify({ task, context }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "AI suggestion failed");
  }
  return res.json();
}

export async function exportResumePdf(
  id: string,
  template?: string,
  token?: string | null
): Promise<Blob> {
  const q = template ? `?template=${encodeURIComponent(template)}` : "";
  const res = await fetch(`${API_BASE}/resumes/${id}/export/pdf${q}`, { cache: "no-store",
    headers: { ...getAuthHeader(token) },
  });
  if (!res.ok) {
    throw new Error("Failed to export PDF resume");
  }
  return res.blob();
}

export async function exportResumeDocx(
  id: string,
  token?: string | null
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/resumes/${id}/export/docx`, { cache: "no-store",
    headers: { ...getAuthHeader(token) },
  });
  if (!res.ok) {
    throw new Error("Failed to export DOCX resume");
  }
  return res.blob();
}

export async function fetchATSHistory(token?: string | null): Promise<ATSAnalysisHistoryItem[]> {
  const res = await fetch(`${API_BASE}/resumes/ats/history`, {
    headers: { ...getAuthHeader(token) },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch ATS history");
  }
  return res.json();
}

export async function deleteATSHistoryItem(id: string, token?: string | null): Promise<void> {
  const res = await fetch(`${API_BASE}/resumes/ats/history/${id}`, {
    method: "DELETE",
    headers: { ...getAuthHeader(token) },
  });
  if (!res.ok) {
    throw new Error("Failed to delete ATS history item");
  }
}

export async function analyzeATS(
  data: {
    resume_text?: string;
    resume_id?: string;
    job_id?: string;
    job_description?: string;
    target_role?: string;
    company_name?: string;
  },
  token?: string | null
): Promise<ATSAnalysisResult> {
  const res = await fetch(`${API_BASE}/resumes/analyze-ats`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(token),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "ATS analysis failed");
  }
  return res.json();
}

/* ===========================
   SOURCES & ADMIN SYNC
   =========================== */

export async function fetchSources(): Promise<SourceStatusSummary[]> {
  const res = await fetch(`${API_BASE}/sources`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch sources: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchSyncLogs(): Promise<SyncLogItem[]> {
  const res = await fetch(`${API_BASE}/sync/logs?limit=20`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch sync logs: ${res.statusText}`);
  }
  return res.json();
}

export async function triggerProtectedSync(sourceId?: string, adminKey?: string): Promise<any> {
  const url = sourceId 
    ? `${API_BASE}/sync?source_id=${encodeURIComponent(sourceId)}`
    : `${API_BASE}/sync`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (adminKey) {
    headers["X-Admin-Key"] = adminKey;
  }

  const res = await fetch(url, { method: "POST", headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Sync trigger failed with status ${res.status}`);
  }
  return res.json();
}

export interface SyncStatusData {
  is_sync_running: boolean;
  cadence_hours: number;
  cadence_seconds: number;
  last_sync_at: string | null;
  next_sync_at: string;
  seconds_remaining: number;
}

export async function fetchSyncStatus(): Promise<SyncStatusData> {
  const res = await fetch(`${API_BASE}/sync/status`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch sync status: ${res.statusText}`);
  }
  return res.json();
}
