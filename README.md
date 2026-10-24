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


---

## 🤖 Fetch.ai Agentverse & ASI:One Integration (Fetch-A-Thon 3.0)

Rozgar Radar features an autonomous AI Agent built with the Fetch.ai `uagents` framework and official **Agent Chat Protocol (ACP v0.3.0)** for the *"ASI:One Agent Challenge – From Intent to Action"*.

- **Agent Name**: `rozgar_radar_copilot`
- **Agent Address**: `agent1qgq8slegxr8rvl7hdxlsrhkfaraumhx43sw5v0yau9ufs9e2f0gfqx9hwm3`
- **Protocol**: `AgentChatProtocol:0.3.0` (ACP)

### 1. Run the Agent (Windows PowerShell)

In your project root terminal, run:

```powershell
# Run the ACP uAgent in Mailbox mode
$env:AGENTVERSE_MAILBOX="true"
.\.venv\Scripts\python backend/agent/run_agent.py
```

Or set `AGENTVERSE_MAILBOX=true` in your `.env` file and simply run:

```powershell
.\.venv\Scripts\python backend/agent/run_agent.py
```

Expected startup output:
```text
=================================================================
🇮🇳 Rozgar Radar — ASI:One & Agentverse AI Agent
Fetch-A-Thon 3.0: 'From Intent to Action'
=================================================================

[Agent Initialized]
• Name:    rozgar_radar_copilot
• Address: agent1qgq8slegxr8rvl7hdxlsrhkfaraumhx43sw5v0yau9ufs9e2f0gfqx9hwm3
• Network: Fetch.ai Almanac / Agentverse

INFO:     [rozgar_radar_copilot]: Agent inspector available at https://agentverse.ai/inspect/?uri=http%3A//127.0.0.1%3A8001&address=agent1qgq8slegxr8rvl7hdxlsrhkfaraumhx43sw5v0yau9ufs9e2f0gfqx9hwm3
INFO:     [rozgar_radar_copilot]: Starting server on http://0.0.0.0:8001
```

### 2. Connect via Agentverse Inspector & Provision Mailbox

1. Start the agent using the command above.
2. In your browser (logged into [agentverse.ai](https://agentverse.ai)), open the **Inspector URL**:
   ```
   https://agentverse.ai/inspect/?uri=http%3A//127.0.0.1%3A8001&address=agent1qgq8slegxr8rvl7hdxlsrhkfaraumhx43sw5v0yau9ufs9e2f0gfqx9hwm3
   ```
3. The Agent Inspector will communicate with your local agent via CORS on `http://127.0.0.1:8001`.
4. Click **"Connect"** or **"Setup Mailbox"** to register your agent address and link the mailbox.

### 3. Verify Discovery in ASI:One (`asi1.ai`)

1. Open **[asi1.ai](https://asi1.ai)** and log in.
2. In the Search bar, search for your agent by address:
   ```text
   agent1qgq8slegxr8rvl7hdxlsrhkfaraumhx43sw5v0yau9ufs9e2f0gfqx9hwm3
   ```
   or by name: `rozgar_radar_copilot`.
3. Start a chat and test career actions:
   - *"Find remote React developer jobs in Bengaluru and match my profile."*
   - *"Check my eligibility for the senior backend developer opening."*
   - *"Tailor my resume and calculate my ATS score."*
4. Click the **Share** button in the top right corner to obtain your **Public Shared Chat URL** for Fetch-A-Thon submission.
