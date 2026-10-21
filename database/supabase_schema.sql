-- ==============================================================================
-- HirePulse Job Hunting Platform - Supabase PostgreSQL Schema
-- Project: sscjavqdyydxmrjltvgs
-- Execute this script in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Job Sources Table
CREATE TABLE IF NOT EXISTS public.job_sources (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    source_type VARCHAR(32) NOT NULL,
    ats_platform VARCHAR(32),
    official_domain VARCHAR(128),
    career_page_url TEXT,
    api_endpoint TEXT,
    board_identifier VARCHAR(128),
    access_method VARCHAR(32) NOT NULL,
    permission_status VARCHAR(32) DEFAULT 'not_reviewed' NOT NULL,
    auth_requirement VARCHAR(32) DEFAULT 'none' NOT NULL,
    rate_limit_notes TEXT,
    last_sync_at TIMESTAMPTZ,
    last_successful_sync_at TIMESTAMPTZ,
    sync_status VARCHAR(32) DEFAULT 'idle' NOT NULL,
    last_error TEXT,
    coverage_notes TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_job_sources_ats_platform ON public.job_sources(ats_platform);
CREATE INDEX IF NOT EXISTS idx_job_sources_status ON public.job_sources(permission_status);

-- 3. Job Listings Table
CREATE TABLE IF NOT EXISTS public.job_listings (
    id VARCHAR(64) PRIMARY KEY,
    source_id VARCHAR(64) REFERENCES public.job_sources(id) ON DELETE CASCADE NOT NULL,
    provider_job_id VARCHAR(128),
    title VARCHAR(256) NOT NULL,
    normalized_title VARCHAR(256) NOT NULL,
    company_name VARCHAR(128) NOT NULL,
    company_domain VARCHAR(128),
    location_raw VARCHAR(256),
    city VARCHAR(128),
    country VARCHAR(64),
    location_category VARCHAR(32) DEFAULT 'international_only' NOT NULL,
    is_india_eligible BOOLEAN DEFAULT FALSE NOT NULL,
    location_eligibility_reason VARCHAR(256),
    work_mode VARCHAR(32) DEFAULT 'not_disclosed' NOT NULL,
    employment_type VARCHAR(32) DEFAULT 'not_disclosed' NOT NULL,
    department VARCHAR(128),
    description TEXT,
    description_plain TEXT,
    salary_min NUMERIC(12, 2),
    salary_max NUMERIC(12, 2),
    salary_currency VARCHAR(8),
    salary_pay_period VARCHAR(16),
    required_qualifications TEXT,
    application_url TEXT NOT NULL,
    canonical_url TEXT NOT NULL,
    publication_date TIMESTAMPTZ,
    application_deadline TIMESTAMPTZ,
    first_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_checked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    freshness_status VARCHAR(32) DEFAULT 'active' NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_source_id ON public.job_listings(source_id);
CREATE INDEX IF NOT EXISTS idx_jobs_title ON public.job_listings(title);
CREATE INDEX IF NOT EXISTS idx_jobs_company_name ON public.job_listings(company_name);
CREATE INDEX IF NOT EXISTS idx_jobs_city ON public.job_listings(city);
CREATE INDEX IF NOT EXISTS idx_jobs_is_india ON public.job_listings(is_india_eligible);
CREATE INDEX IF NOT EXISTS idx_jobs_work_mode ON public.job_listings(work_mode);
CREATE INDEX IF NOT EXISTS idx_jobs_freshness ON public.job_listings(freshness_status);
CREATE INDEX IF NOT EXISTS idx_jobs_publication_date ON public.job_listings(publication_date DESC);

-- 4. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 5. User Profiles Table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id VARCHAR(36) REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    current_city VARCHAR(128),
    current_state VARCHAR(128),
    preferred_locations TEXT,
    preferred_roles TEXT,
    skills TEXT,
    experience_level VARCHAR(64),
    years_experience NUMERIC(4, 1),
    education VARCHAR(128),
    preferred_industries TEXT,
    employment_types TEXT,
    work_modes TEXT,
    min_salary NUMERIC(12, 2),
    resume_text TEXT,
    email_alerts_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- 6. Saved Jobs / Applications Tracker Table
CREATE TABLE IF NOT EXISTS public.saved_jobs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id VARCHAR(36) REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    job_id VARCHAR(64) REFERENCES public.job_listings(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(32) DEFAULT 'saved' NOT NULL,
    notes TEXT,
    applied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON public.saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id ON public.saved_jobs(job_id);

-- 7. Automation Config Table
CREATE TABLE IF NOT EXISTS public.automation_configs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id VARCHAR(36) REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    enabled BOOLEAN DEFAULT TRUE NOT NULL,
    digest_frequency VARCHAR(32) DEFAULT 'daily' NOT NULL,
    delivery_email VARCHAR(255),
    keywords TEXT,
    min_salary NUMERIC(12, 2),
    india_only BOOLEAN DEFAULT TRUE NOT NULL,
    auto_save_matches BOOLEAN DEFAULT FALSE NOT NULL,
    last_dispatched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_automation_configs_user_id ON public.automation_configs(user_id);

-- 8. Automation Logs Table
CREATE TABLE IF NOT EXISTS public.automation_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id VARCHAR(36) REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    jobs_matched INTEGER DEFAULT 0 NOT NULL,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_user_id ON public.automation_logs(user_id);

-- 9. Resumes Table
CREATE TABLE IF NOT EXISTS public.resumes (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id VARCHAR(36) REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    template VARCHAR(64) DEFAULT 'modern' NOT NULL,
    resume_data TEXT NOT NULL,
    ats_score INTEGER DEFAULT 0,
    ats_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON public.resumes(user_id);

-- 10. Sync Logs Table
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id VARCHAR(64) PRIMARY KEY,
    source_id VARCHAR(64) REFERENCES public.job_sources(id) ON DELETE CASCADE NOT NULL,
    trigger_type VARCHAR(32) DEFAULT 'scheduled' NOT NULL,
    status VARCHAR(32) DEFAULT 'running' NOT NULL,
    jobs_fetched INTEGER DEFAULT 0 NOT NULL,
    jobs_created INTEGER DEFAULT 0 NOT NULL,
    jobs_updated INTEGER DEFAULT 0 NOT NULL,
    duplicates_found INTEGER DEFAULT 0 NOT NULL,
    duration_ms INTEGER DEFAULT 0 NOT NULL,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_source_id ON public.sync_logs(source_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON public.sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON public.sync_logs(started_at DESC);

-- ==============================================================================
-- Row Level Security (RLS) & Public Access Policies
-- Enable read access to job listings for all users (anon & authenticated)
-- ==============================================================================
ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active jobs and sources (anon + authenticated)
CREATE POLICY "Public read active jobs" ON public.job_listings
    FOR SELECT USING (freshness_status = 'active');

CREATE POLICY "Public read job sources" ON public.job_sources
    FOR SELECT USING (is_active = TRUE);

-- Allow service_role to have full access (it bypasses RLS anyway, but explicit)
-- Note: service_role key bypasses RLS automatically in Supabase.
