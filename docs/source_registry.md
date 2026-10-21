# Source Registry Documentation

This document records the initial inventory of job sources compiled from `AI_Job_Platform_Job_Data_Sources.pdf`.

## 1. Compliance & Permission Principles
Every data source integrated into the system is cataloged with an explicit permission status:
- **`approved`**: Permitted public API or authorized feed.
- **`not_reviewed`**: Candidate source identified, but technical and legal terms are pending review.
- **`restricted`**: Provider strictly forbids scraping/harvesting or requires a formal commercial partnership.
- **`unavailable`**: Career endpoint or API is deprecated, inaccessible, or no longer operational.

> **Production Rule:** Only sources in `approved` status with verified endpoints are enabled for live automated ingestion.

---

## 2. ATS & Direct Employer Platforms

| Source ID | Company / Board | ATS Platform | Verified Endpoint | Access Method | Status | Notes |
|---|---|---|---|---|---|---|
| `greenhouse_figma` | Figma | Greenhouse | `https://boards-api.greenhouse.io/v1/boards/figma/jobs` | Public GET API | `approved` | Returns ~140 active roles with full HTML content. |
| `greenhouse_cloudflare` | Cloudflare | Greenhouse | `https://boards-api.greenhouse.io/v1/boards/cloudflare/jobs` | Public GET API | `approved` | Returns ~430 global roles including India. |
| `greenhouse_canonical` | Canonical | Greenhouse | `https://boards-api.greenhouse.io/v1/boards/canonical/jobs` | Public GET API | `approved` | Returns ~300 remote/global tech roles. |
| `greenhouse_reddit` | Reddit | Greenhouse | `https://boards-api.greenhouse.io/v1/boards/reddit/jobs` | Public GET API | `approved` | Returns ~150 engineering and product roles. |
| `lever_spotify` | Spotify | Lever | `https://api.lever.co/v0/postings/spotify?mode=json` | Public GET API | `approved` | Returns ~80 verified global postings. |
| `lever_kpler` | Kpler | Lever | `https://api.lever.co/v0/postings/kpler?mode=json` | Public GET API | `approved` | Returns ~100 verified postings. |
| `ashby_ramp` | Ramp | Ashby | `https://api.ashbyhq.com/posting-api/job-board/ramp` | Public GET API | `approved` | Returns ~160 verified postings. |
| `ashby_linear` | Linear | Ashby | `https://api.ashbyhq.com/posting-api/job-board/linear` | Public GET API | `approved` | Returns ~28 high-demand tech roles. |

---

## 3. Aggregators & Job Portals (From Source Inventory)

| Provider | Access Route | Auth Requirement | Status | Integration Guidance |
|---|---|---|---|---|
| **Adzuna** | Official REST API | `app_id` + `app_key` | `approved` (when key set) / `not_reviewed` | Requires developer portal account. Supports India (`in`) country code. |
| **Jooble** | Official Partner API | API key | `not_reviewed` | Requires commercial key and partner approval. |
| **Careerjet** | Search API | API key | `not_reviewed` | Requires partner registration. |
| **JSearch** | RapidAPI | RapidAPI Key | `not_reviewed` | Third-party proxy; subject to quota & subscription. |
| **NCS (India)** | Government Portal | Official Feed | `not_reviewed` | Requires official memorandum/feed agreement. |
| **LinkedIn Jobs** | Web Portal | Restricted | `restricted` | Anti-scraping controls. Only official LinkedIn Talent Solutions API permitted. |
| **Naukri** | Indian Portal | Restricted | `restricted` | Requires official enterprise Recruiter API partnership. |
| **Indeed India** | Job Portal | Publisher API | `restricted` | Requires approved Publisher Program membership. |
| **Wellfound** | Startup Portal | GraphQL / API | `not_reviewed` | Requires official partner token. |
| **Apna** | Indian Frontline | Official App | `not_reviewed` | Needs enterprise agreement. |

---

## 4. Rate Limiting and Ethical Scraping Policy
- Respect HTTP `429` (Too Many Requests) with exponential backoff.
- Minimum 1.0 second delay between requests to the same origin.
- Include a transparent, descriptive `User-Agent` header: `HirePulseJobAggregator/1.0 (+https://yourdomain.com/bot-info)`.
- Respect `robots.txt` directives.
- Never bypass authentication, CAPTCHAs, or access controls.
