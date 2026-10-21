export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  onboarding_completed?: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

export interface UserProfile {
  id?: string;
  user_id?: string;
  current_city?: string;
  current_state?: string;
  preferred_locations: string[];
  preferred_roles: string[];
  skills: string[];
  experience_level?: string;
  years_experience?: number;
  education?: string;
  preferred_industries: string[];
  employment_types: string[];
  work_modes: string[];
  min_salary?: number;
  resume_text?: string;
  notification_email?: string;
  email_alerts_enabled: boolean;
  onboarding_completed: boolean;
  updated_at?: string;
}

export interface SavedJobItem {
  id: string;
  user_id: string;
  job_id: string;
  status: "saved" | "applied" | "interviewing" | "offered" | "rejected";
  notes?: string;
  applied_at?: string;
  created_at: string;
  updated_at: string;
  job_title?: string;
  company_name?: string;
  location_raw?: string;
  work_mode?: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  application_url?: string;
  source_name?: string;
  is_india_eligible?: boolean;
}

export interface AutomationConfig {
  id?: string;
  user_id?: string;
  is_active: boolean;
  notification_email?: string;
  preferred_titles: string[];
  preferred_locations: string[];
  preferred_skills: string[];
  work_modes: string[];
  experience_level?: string;
  min_salary?: number;
  delivery_frequency: string;
  delivery_time: string;
  timezone: string;
  min_match_score: number;
  last_run_at?: string;
  next_run_at?: string;
  updated_at?: string;
  email_provider_configured?: boolean;
  scheduler_active?: boolean;
}

export interface AutomationLogItem {
  id: string;
  user_id: string;
  jobs_found: number;
  jobs_sent: number;
  status: "success" | "no_matches" | "failed";
  sent_job_ids: string[];
  error_message?: string;
  created_at: string;
}

export interface ExperienceItem {
  id: string;
  title: string;
  company: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  bullets?: string[];
}

export interface EducationItem {
  id: string;
  degree: string;
  school: string;
  location?: string;
  gradYear?: string;
  gpa?: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  link?: string;
  technologies?: string | string[];
  description?: string;
  bullets?: string[];
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer?: string;
  year?: string;
  link?: string;
}

export interface CustomSectionItem {
  id: string;
  title: string;
  content: string;
}

export interface ResumeData {
  fullName: string;
  professionalTitle?: string;
  title?: string;
  email: string;
  phone: string;
  location: string;
  website?: string;
  portfolio?: string;
  linkedin?: string;
  github?: string;
  otherLink?: string;
  summary: string;
  skills: string[] | {
    technical?: string[];
    tools?: string[];
    soft?: string[];
    other?: string[];
  };
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  customSections?: CustomSectionItem[];
}

export interface ResumeRecord {
  id: string;
  user_id: string;
  title: string;
  template: "classic" | "modern" | "minimal" | "technical" | string;
  content_json: ResumeData;
  created_at: string;
  updated_at: string;
}

export interface SkillMatchItem {
  skill: string;
  found: boolean;
  category: "technical" | "soft" | "domain" | "tool";
}

export interface FormattingWarning {
  title: string;
  severity: "risk" | "info";
  confidence: "high" | "medium" | "low";
  detail: string;
  fix: string;
}

export interface PrioritizedImprovement {
  priority: "high" | "medium" | "optional";
  category: string;
  recommendation: string;
  reason: string;
  can_fix_with_ai: boolean;
  target_section: string;
}

export interface ATSAnalysisResult {
  overall_score: number;
  match_level: "High" | "Moderate" | "Needs Improvement";
  matched_skills: string[];
  missing_skills: string[];
  skill_breakdown: SkillMatchItem[];
  experience_score: number;
  readability_score: number;
  keyword_coverage_percent: number;
  formatting_observations: string[];
  actionable_suggestions: string[];
  evidence_snippets: string[];
  role_alignment_notes: string;
  disclaimer: string;
  subscores?: {
    keyword_match: number;
    experience_relevance: number;
    section_completeness: number;
    formatting_compatibility: number;
    content_quality: number;
  };
  keyword_analysis?: {
    required_matched: string[];
    required_missing: string[];
    preferred_matched: string[];
    preferred_missing: string[];
    synonym_matches: Array<{ original_jd_term: string; resume_matched_variant: string }>;
  };
  formatting_warnings?: FormattingWarning[];
  prioritized_improvements?: PrioritizedImprovement[];
  analysis_id?: string;
  resume_id?: string;
  resume_title?: string;
  target_role?: string;
  company_name?: string;
}

export interface ATSAnalysisHistoryItem {
  id: string;
  user_id: string;
  resume_id?: string;
  resume_title?: string;
  target_role?: string;
  company_name?: string;
  overall_score: number;
  category_scores: Record<string, any>;
  report: ATSAnalysisResult;
  created_at: string;
}

export interface ResumeSuggestResponse {
  original: string;
  suggested: string;
  variations: string[];
  bullets: string[];
  explanation: string;
}

export interface ResumeImportResponse {
  success: boolean;
  raw_text: string;
  parsed_data: Partial<ResumeData>;
  warnings: string[];
}
