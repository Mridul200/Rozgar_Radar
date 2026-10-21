# HirePulse — Multi-Source Job Aggregation System (Phase 1)

A production-minded, multi-source job aggregation platform that collects publicly available job listings from verified ATS platforms (Greenhouse, Lever, Ashby) and aggregators, normalizes them into a unified schema, performs layered deduplication, tracks listing freshness, and provides direct links to original application pages.

Built with **FastAPI**, **SQLAlchemy 2.0 / PostgreSQL (Supabase compatible)**, **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**.

Includes **universal embed capabilities** (JavaScript Widget, iFrame, REST API) so the job board can be integrated into **any website** in minutes.

---

## 🌟 Key Features

1. **Multi-Source Ingestion Pipeline**:
   - Modular connectors for **Greenhouse**, **Lever**, and **Ashby** job boards.
   - Robust error handling, backoff retries, rate limits, and structured sync logs.
   - Extensible connector interface (`BaseJobConnector`).

2. **Common Job Schema & Source Registry**:
   - Normalized salary ranges, employment types, work modes (`remote`, `hybrid`, `on_site`), locations, and application URLs.
   - Comprehensive registry tracking source health, permission statuses (`approved`, `not_reviewed`, `restricted`), and sync errors.

3. **Layered Deduplication & Freshness Engine**:
   - 3-tier duplicate detection: Canonical URL, Provider ID, and Composite Title+Company+Location Fingerprint.
   - Granular listing freshness tracking: `active`, `potentially_expired`, `link_failed`, `source_unavailable`, `needs_review`.

4. **Universal Integration (Easily Embed into Any Website)**:
   - **Standalone JavaScript Widget**: 2 lines of HTML to embed responsive job cards into WordPress, Webflow, Shopify, or any static site.
   - **Responsive iFrame**: Dedicated `/embed` route.
   - **CORS-enabled REST API**: Clean JSON endpoints ready for any web/mobile frontend.
   - **Interactive Integration Modal**: In-app code generator with 1-click copy for HTML, React, iFrame, and cURL.

5. **Modern Frontend Portal**:
   - Real-time search, faceted filters (company, location, work mode, employment type).
   - Source provenance badges and verified original application links.
   - Admin source health and synchronization dashboard.

---

## 📂 Project Structure

```
├── frontend/                 # Next.js 16+ App Router Web Portal & Embed System
│   ├── src/app/              # Routes: /, /jobs, /dashboard, /ats-checker, /automation, /embed
│   ├── src/components/       # Modular UI components, 3D Canvas, faceted filters, modals
│   ├── src/lib/              # API clients, Supabase auth client, utilities
│   └── public/               # Static assets & embeddable widget.js
│
├── backend/                  # FastAPI High-Performance Backend Engine
│   ├── app/                  # FastAPI core (REST API routers, auth, models, schemas, supabase)
│   ├── services/             # Background services (job ingestion, schedulers, email delivery)
│   │   ├── job_ingestion/    # Connectors (Workday, Greenhouse, Lever, Ashby, etc.), deduplication
│   │   ├── digest_scheduler.py # Automated periodic candidate job email digests
│   │   └── email_service.py  # SMTP notification & HTML email template engine
│   ├── static/               # Widget serving endpoint
│   └── requirements.txt      # Python dependencies
│
├── database/                 # Dedicated Database Management & Migrations
│   ├── jobs.db               # Primary SQLite database (10,000+ indexed jobs)
│   ├── supabase_schema.sql   # Cloud PostgreSQL / Supabase migration script
│   ├── export_database.py    # Export pipeline to CSV/JSON
│   ├── jobs.csv              # CSV database dump
│   ├── jobs.json             # JSON database dump
│   └── README.md             # Database schema and connection guide
│
├── ai/                       # AI & ATS Intelligence Subsystem
│   ├── ats_scorer.py         # ATS resume inspection, keyword extraction & heuristic engine
│   ├── job_matcher.py        # Candidate-to-job compatibility & recommendation scoring
│   ├── __init__.py           # Package exports
│   └── README.md             # AI algorithms & integration documentation
│
├── docs/                     # Documentation & Specifications
│   ├── architecture.md
│   ├── database_schema.md
│   ├── embed_integration_guide.md
│   └── AI_Job_Platform_Job_Data_Sources.pdf
│
└── tests/                    # Pytest test suite (44 passing tests)
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- (Optional) PostgreSQL database or Supabase project (defaults to local SQLite `jobs.db` if not set).

### 2. Backend Setup

```bash
# From project root
cd backend

# Create virtual environment (optional but recommended)
python -m venv .venv
# On Windows: .venv\Scripts\activate
# On Linux/macOS: source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend API docs will be available at: `http://localhost:8000/docs`

### 3. Run Initial Job Ingestion (CLI)

```bash
# Seed sources and fetch live jobs from approved ATS boards
python -m services.job_ingestion.scheduler --run-now
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
The frontend portal will be accessible at: `http://localhost:3000`
The embed route is at: `http://localhost:3000/embed`
The admin source registry is at: `http://localhost:3000/admin/sources`

---

## 🌐 Embedding in Any Website

See [docs/embed_integration_guide.md](file:///p:/JOB_HUNTING/docs/embed_integration_guide.md) for full instructions and examples.

Quick snippet:
```html
<div id="hirepulse-jobs-widget" data-api="http://localhost:8000/api/v1" data-theme="dark"></div>
<script src="http://localhost:8000/static/widget.js" async></script>
```

---

## 🧪 Running Automated Tests

```bash
pytest tests/ -v
```
