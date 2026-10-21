# System Architecture & Technical Specifications

## 1. System Overview

The Job Aggregation System is organized into three decoupled services:
1. **`services/job_ingestion/`**: Data ingestion engine responsible for fetching jobs from external ATS platforms and APIs, normalizing them into a canonical schema, executing layered deduplication, tracking freshness, and handling scheduling with retries and concurrency guards.
2. **`backend/`**: High-performance FastAPI application providing structured REST APIs for job searching, faceted filtering, pagination, source registry management, admin-protected synchronization triggers, and serving the embeddable JavaScript widget.
3. **`frontend/`**: Modern Next.js (App Router) + TypeScript + Tailwind CSS application featuring a responsive job board, rich search/filters, source provenance labels, direct original apply links, an embed generator modal, and an administrative source health dashboard.

## 2. Ingestion Pipeline & Connector Architecture

```
[External Sources]
   ├── Greenhouse API (GET /boards/{company}/jobs)
   ├── Lever API (GET /postings/{company}?mode=json)
   ├── Ashby API (GET /job-board/{company})
   └── Aggregator / Partner Feeds
         │
         ▼
[BaseJobConnector Interface]
   ├── fetch_raw_listings() (Async HTTP, timeouts, backoff retries, rate limits)
   └── parse_and_normalize()
         │
         ▼
[Normalization Engine]
   └── Maps raw payload to CommonJobModel (Title, Location, Work Mode, Salary, URLs)
         │
         ▼
[Layered Deduplication Engine]
   ├── Tier 1: Canonical Application URL Match
   ├── Tier 2: Source + Provider Job ID Match
   └── Tier 3: Company + Normalized Title + Normalized Location Fingerprint
         │
         ▼
[Freshness & Expiry Engine]
   ├── First Seen, Last Seen, Last Checked Timestamps
   └── Status: Active, Potentially Expired, Link Failed, Source Unavailable, Needs Review
         │
         ▼
[Database Persistence] (PostgreSQL / Supabase or SQLite with Indexes)
```

## 3. Easy Integration Capabilities ("Kisi Bhi Website Me Easily Integrate")

To fulfill the requirement for seamless embedding into any website, the platform provides three integration modes:

### Mode A: Standalone JavaScript Widget (`<script>`)
Any external site (WordPress, Webflow, Squarespace, Shopify, or plain HTML) can embed the job board with two lines of code:
```html
<div id="hirepulse-jobs-widget" data-theme="dark" data-limit="10"></div>
<script src="https://your-api-domain.com/static/widget.js" async></script>
```

### Mode B: Responsive iFrame
Embed the clean, isolated `/embed` view anywhere:
```html
<iframe src="https://your-frontend-domain.com/embed" width="100%" height="750" frameborder="0"></iframe>
```

### Mode C: Headless REST API with Open CORS
Any frontend application (React, Next.js, Vue, mobile apps) can consume the JSON API directly:
```javascript
const res = await fetch("https://your-api-domain.com/api/v1/jobs?keyword=developer&location=Remote");
const data = await res.json();
```
