# Database Schema & Data Models

The database models are implemented using SQLAlchemy 2.0 with strict types, indexes, and foreign keys. The schema supports both PostgreSQL (Supabase) in production and SQLite in local development.

## 1. `job_sources` Table
Represents authorized platforms, company ATS endpoints, or aggregate providers.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String(64) | Primary Key | Unique slug, e.g. `greenhouse_figma`, `lever_spotify` |
| `name` | String(128) | NOT NULL | Human-readable name, e.g. `Figma (Greenhouse)` |
| `source_type` | String(32) | NOT NULL | `ats`, `aggregator`, `direct_career_page` |
| `ats_platform` | String(32) | Nullable | `greenhouse`, `lever`, `ashby`, `smartrecruiters`, etc. |
| `official_domain` | String(128) | Nullable | Verified domain, e.g. `figma.com` |
| `career_page_url` | Text | Nullable | Official career page URL |
| `api_endpoint` | Text | Nullable | Verified public API endpoint |
| `board_identifier` | String(128) | Nullable | ATS board slug or company token |
| `access_method` | String(32) | NOT NULL | `public_api`, `partner_feed`, `manual_review` |
| `permission_status` | String(32) | NOT NULL | `approved`, `not_reviewed`, `restricted`, `unavailable` |
| `auth_requirement` | String(32) | NOT NULL | `none`, `api_key`, `oauth` |
| `rate_limit_notes` | Text | Nullable | Documented rate limits |
| `last_sync_at` | DateTime | Nullable | Timestamp of last synchronization attempt |
| `last_successful_sync_at`| DateTime | Nullable | Timestamp of last error-free sync |
| `sync_status` | String(32) | Default `idle` | `idle`, `running`, `success`, `failed` |
| `last_error` | Text | Nullable | Error details if last sync failed |
| `coverage_notes` | Text | Nullable | Geographic or sector notes |
| `is_active` | Boolean | Default `True` | Enabled for scheduled crawling |
| `created_at` | DateTime | Default `NOW()` | Record creation timestamp |
| `updated_at` | DateTime | Default `NOW()` | Record update timestamp |

### Indexes
- `idx_sources_permission_status`: Filter active & approved sources.
- `idx_sources_ats_platform`: Grouping by ATS provider.

---

## 2. `job_listings` Table
Normalized job vacancies collected across all sources.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String(64) | Primary Key | UUID or canonical hash |
| `source_id` | String(64) | Foreign Key `job_sources.id` | Source provenance |
| `provider_job_id` | String(128) | Nullable | Original identifier given by ATS/provider |
| `title` | String(256) | NOT NULL | Job title as published |
| `normalized_title` | String(256) | NOT NULL | Lowercased, stripped, punctuation cleaned |
| `company_name` | String(128) | NOT NULL | Employer name |
| `company_domain` | String(128) | Nullable | Verified employer domain |
| `location_raw` | String(256) | Nullable | Raw location string from provider |
| `city` | String(128) | Nullable | Normalized city |
| `country` | String(64) | Nullable | Normalized country |
| `work_mode` | String(32) | Default `not_disclosed`| `remote`, `hybrid`, `on_site`, `not_disclosed` |
| `employment_type` | String(32) | Default `not_disclosed`| `full_time`, `part_time`, `contract`, `internship`, `not_disclosed` |
| `department` | String(128) | Nullable | Department / Team |
| `description` | Text | Nullable | Clean HTML or Markdown description |
| `description_plain` | Text | Nullable | Plain-text description for search |
| `salary_min` | Numeric | Nullable | Minimum salary if provided |
| `salary_max` | Numeric | Nullable | Maximum salary if provided |
| `salary_currency` | String(8) | Nullable | Currency code (USD, INR, EUR, etc.) |
| `salary_pay_period` | String(16) | Nullable | `yearly`, `monthly`, `hourly` |
| `required_qualifications` | JSON/Text | Nullable | Extracted qualification points |
| `application_url` | Text | NOT NULL | Direct link to original application page |
| `canonical_url` | Text | NOT NULL | Cleaned URL stripped of tracking params |
| `publication_date` | DateTime | Nullable | Published timestamp from source |
| `application_deadline` | DateTime | Nullable | Application deadline if supplied |
| `first_seen_at` | DateTime | Default `NOW()` | When system first collected this job |
| `last_seen_at` | DateTime | Default `NOW()` | When source last confirmed this job exists |
| `last_checked_at` | DateTime | Default `NOW()` | When our system last checked the listing |
| `freshness_status` | String(32) | Default `active` | `active`, `potentially_expired`, `link_failed`, `source_unavailable`, `needs_review` |
| `is_duplicate` | Boolean | Default `False` | True if marked duplicate of canonical record |
| `canonical_job_id` | String(64) | Nullable | Points to primary job record if duplicate |
| `dedup_fingerprint` | String(128) | Index | Hash of company + title + location |
| `raw_metadata` | JSON/Text | Nullable | Raw provider payload for auditability |
| `created_at` | DateTime | Default `NOW()` | Database creation timestamp |
| `updated_at` | DateTime | Default `NOW()` | Database update timestamp |

### Indexes & Performance
- `idx_job_canonical_url`: Fast lookup for URL-based duplicate detection.
- `idx_job_dedup_fingerprint`: Rapid composite hash matching.
- `idx_job_source_provider`: Composite index on `(source_id, provider_job_id)`.
- `idx_job_freshness_active`: Filter for active, non-duplicate listings.
- `idx_job_created_pub`: Sort by publication date / freshness.
- `idx_job_company`: Filter by company name.
- `idx_job_work_mode`: Filter by remote/hybrid/on-site.

---

## 3. `sync_logs` Table
Audit trail of every automated or manual synchronization run.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String(64) | Primary Key | UUID |
| `source_id` | String(64) | Foreign Key `job_sources.id` | Target source |
| `trigger_type` | String(32) | NOT NULL | `manual`, `scheduled` |
| `status` | String(32) | NOT NULL | `running`, `success`, `partial`, `failed` |
| `jobs_fetched` | Integer | Default 0 | Total raw records returned |
| `jobs_created` | Integer | Default 0 | New unique listings added |
| `jobs_updated` | Integer | Default 0 | Existing listings refreshed (last_seen updated) |
| `duplicates_found` | Integer | Default 0 | Duplicate occurrences identified |
| `duration_ms` | Integer | Default 0 | Execution duration in milliseconds |
| `error_message` | Text | Nullable | Error or exception traceback summary |
| `started_at` | DateTime | Default `NOW()` | Ingestion start time |
| `completed_at` | DateTime | Nullable | Ingestion completion time |
