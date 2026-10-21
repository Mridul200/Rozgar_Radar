"use client";

import { useState } from "react";
import { X, Check, Copy, Code2, Globe, FileCode, Terminal } from "lucide-react";

interface EmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmbedModal({ isOpen, onClose }: EmbedModalProps) {
  const [activeTab, setActiveTab] = useState<"widget" | "iframe" | "react" | "api">("widget");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const backendUrl = typeof window !== "undefined" ? window.location.origin.replace(":3000", ":8000") : "http://localhost:8000";
  const frontendUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  const widgetSnippet = `<!-- 1. Place this container where you want the job board to appear -->
<div id="hirepulse-jobs-widget" 
     data-api="${backendUrl}/api/v1" 
     data-theme="dark" 
     data-limit="8">
</div>

<!-- 2. Include the universal embed script -->
<script src="${backendUrl}/static/widget.js" async></script>`;

  const iframeSnippet = `<!-- Responsive iFrame Embed -->
<iframe 
  src="${frontendUrl}/embed" 
  width="100%" 
  height="750px" 
  style="border: none; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15);" 
  title="Job Board" 
  loading="lazy">
</iframe>`;

  const reactSnippet = `import { useState, useEffect } from "react";

export function EmbeddedJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("${backendUrl}/api/v1/jobs?page_size=6")
      .then(res => res.json())
      .then(data => {
        setJobs(data.items);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading verified jobs...</div>;

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {jobs.map(job => (
        <div key={job.id} style={{ border: '1px solid #334155', padding: '16px', borderRadius: '8px' }}>
          <h4>{job.title}</h4>
          <p>{job.company_name} • {job.location_display}</p>
          <a href={job.application_url} target="_blank" rel="noreferrer">
            Apply on {job.source_name} &rarr;
          </a>
        </div>
      ))}
    </div>
  );
}`;

  const apiSnippet = `# Fetch live jobs with keyword and remote filter
curl -X GET "${backendUrl}/api/v1/jobs?keyword=engineer&work_mode=remote&page=1&page_size=10" \\
     -H "Accept: application/json"`;

  const getActiveCode = () => {
    switch (activeTab) {
      case "widget":
        return widgetSnippet;
      case "iframe":
        return iframeSnippet;
      case "react":
        return reactSnippet;
      case "api":
        return apiSnippet;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl glass-panel bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Code2 className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-bold text-white">
                Integrate into Any Website
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Easily embed live, verified job listings into WordPress, Webflow, Shopify, React, or static HTML.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="px-6 pt-4 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto">
          {[
            { id: "widget", label: "JS Widget (HTML / CMS)", icon: Globe },
            { id: "iframe", label: "Responsive iFrame", icon: FileCode },
            { id: "react", label: "React / Next.js", icon: Code2 },
            { id: "api", label: "REST API (cURL)", icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 text-xs font-semibold px-4 py-2.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Code preview & Copy action */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {activeTab === "widget" && "HTML Snippet (Drop into your page)"}
              {activeTab === "iframe" && "iFrame HTML Tag"}
              {activeTab === "react" && "React Component Code"}
              {activeTab === "api" && "Terminal Command"}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto max-h-64 select-all leading-relaxed">
            {getActiveCode()}
          </pre>

          <div className="mt-4 p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-xs text-slate-400 leading-relaxed">
            <strong className="text-slate-300">Cross-Origin Enabled:</strong> The backend API has full CORS support enabled (<code className="text-indigo-300">Access-Control-Allow-Origin: *</code>), meaning requests will never be blocked by browser origin policies.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
