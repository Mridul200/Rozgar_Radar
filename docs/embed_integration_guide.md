# Website Integration Guide: How to Embed the Job Board into Any Website

This platform is engineered to be **headless and embed-ready**, enabling you to integrate real-time job listings into **any website** (WordPress, Webflow, Squarespace, Shopify, React, Next.js, Vue, or static HTML).

---

## Method 1: Drop-in JavaScript Widget (Recommended for No-Code & HTML sites)

Simply paste this HTML snippet wherever you want the job board to appear on your website:

```html
<!-- 1. The container where the jobs will render -->
<div id="hirepulse-jobs-widget"
     data-api="http://localhost:8000/api/v1"
     data-theme="dark"
     data-limit="8"
     data-company=""
     data-location="">
</div>

<!-- 2. The embed script -->
<script src="http://localhost:8000/static/widget.js" async></script>
```

### Customizable Widget Attributes:
| Attribute | Example | Description |
|---|---|---|
| `data-api` | `https://api.yourdomain.com/api/v1` | URL of the backend API |
| `data-theme` | `dark` or `light` | Visual theme matching your website |
| `data-limit` | `10` | Number of jobs to display per page |
| `data-company` | `Figma` | Filter to a specific company (optional) |
| `data-location`| `Remote` | Filter to a specific location (optional) |
| `data-work-mode`| `remote` | Show only remote jobs (optional) |

The widget automatically:
- Renders responsive job cards.
- Provides an instant keyword search bar.
- Includes work mode and location filter pills.
- Links candidates directly to the verified original application URL.
- Preserves source attribution badges.
- Applies clean, scoped styling that will not conflict with your site's existing CSS.

---

## Method 2: Responsive iFrame Embed

If your CMS or website builder (Wix, Squarespace, Notion, Notion Site) restricts custom JavaScript, use the responsive iFrame:

```html
<iframe
  src="http://localhost:3000/embed?theme=dark"
  width="100%"
  height="750px"
  style="border: none; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15);"
  title="Job Listings"
  loading="lazy"
></iframe>
```

---

## Method 3: Headless REST API (For Custom Web & Mobile Apps)

If you are building with React, Next.js, Vue, Svelte, Flutter, or iOS/Android, consume our CORS-enabled REST API:

### Fetch Jobs
```http
GET /api/v1/jobs?keyword=engineer&work_mode=remote&page=1&page_size=20
```

### Response Example:
```json
{
  "total": 45,
  "page": 1,
  "page_size": 20,
  "total_pages": 3,
  "items": [
    {
      "id": "job_9a8b7c6d",
      "title": "Senior Frontend Engineer",
      "company_name": "Figma",
      "location": "San Francisco, CA / Remote",
      "work_mode": "remote",
      "employment_type": "full_time",
      "salary_text": "Not disclosed",
      "source_name": "Figma (Greenhouse)",
      "application_url": "https://boards.greenhouse.io/figma/jobs/5426468004",
      "freshness_status": "active",
      "first_seen_at": "2026-10-20T11:00:00Z",
      "last_checked_at": "2026-10-20T11:30:00Z"
    }
  ]
}
```

### React / Next.js Component Snippet:
```tsx
import { useState, useEffect } from "react";

export function EmbeddedJobList() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/api/v1/jobs?limit=5")
      .then(res => res.json())
      .then(data => {
        setJobs(data.items);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading jobs...</div>;

  return (
    <div className="grid gap-4">
      {jobs.map(job => (
        <div key={job.id} className="p-4 rounded-lg border bg-card">
          <h3 className="font-semibold">{job.title}</h3>
          <p className="text-sm text-muted-foreground">{job.company_name} • {job.location}</p>
          <a href={job.application_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Apply on {job.source_name} &rarr;
          </a>
        </div>
      ))}
    </div>
  );
}
```
