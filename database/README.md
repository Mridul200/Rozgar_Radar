# Database Layer

This directory centralizes all database files, schemas, exports, and migration utilities for the HirePulse Job Aggregator platform.

## Contents

- **`jobs.db`**: Primary SQLite database containing normalized job listings, registered ATS job sources, sync history logs, candidate profiles, and notification preferences.
- **`supabase_schema.sql`**: Production PostgreSQL / Supabase SQL schema definitions, constraints, indexes, and full-text search setup.
- **`export_database.py`**: Export utility script to dump job listings into CSV and JSON formats.
- **`jobs.csv`**: Tabular CSV export of all indexed job listings.
- **`jobs.json`**: Structured JSON export of active job listings.

## Database Schemas

### Key Tables
1. **`job_listings`**: Stores aggregated job postings across Greenhouse, Lever, Ashby, SmartRecruiters, Workable, Recruitee, Workday, and NCS. Includes title, company, location, salary range, deadlines, freshness status, and India eligibility flags.
2. **`job_sources`**: Registry of tracked company career portals, ATS platforms, endpoint configurations, and synchronization health status.
3. **`sync_logs`**: Historical audit log recording every sync run, count of jobs fetched, inserted, updated, and error traces.
4. **`users` & `user_profiles`**: Authentication records, career preferences, target roles, preferred locations, and resume profiles.
5. **`saved_jobs`**: Candidate bookmarks and application tracking.
6. **`email_delivery_preferences` & `email_delivery_logs`**: Automated daily/weekly email digest schedules, delivery timestamps, and dispatch logs.

## Connecting to Database

- **SQLite (Default / Local)**:
  ```env
  DATABASE_URL=sqlite:///database/jobs.db
  ```
- **Supabase (PostgreSQL / Cloud)**:
  Execute `supabase_schema.sql` in the Supabase SQL Editor, then configure:
  ```env
  DATABASE_URL=postgresql+psycopg://postgres.<ref>:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
  ```
