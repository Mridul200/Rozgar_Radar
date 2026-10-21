import React from "react";
import Link from "next/link";
import { Sparkles, ShieldCheck, Heart, Zap, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/90 text-slate-400 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        {/* Brand */}
        <div className="space-y-3 md:col-span-1">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.jpg"
              alt="Rozgar Radar Logo"
              className="w-8 h-8 rounded-lg object-contain bg-white border border-slate-700/60 p-0.5"
            />
            <span className="font-bold text-base tracking-tight text-white">Rozgar Radar</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Rozgar Radar – Find Jobs. Build Your Future. Discover verified opportunities, automate daily eligibility email digests, build ATS resumes, and accelerate your tech career.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-cyan-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Direct Official ATS Application Links</span>
          </div>
        </div>

        {/* Product Links */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">AI Career Suite</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/jobs" className="hover:text-cyan-400 transition-colors">
                Explore Verified Jobs
              </Link>
            </li>
            <li>
              <Link href="/automation" className="hover:text-cyan-400 transition-colors">
                Daily Email Alerts
              </Link>
            </li>
            <li>
              <Link href="/resume-builder" className="hover:text-cyan-400 transition-colors">
                AI Resume Builder
              </Link>
            </li>
            <li>
              <Link href="/ats-checker" className="hover:text-cyan-400 transition-colors">
                ATS Readiness Analyzer
              </Link>
            </li>
            <li>
              <Link href="/saved-jobs" className="hover:text-cyan-400 transition-colors">
                Application Tracker
              </Link>
            </li>
          </ul>
        </div>

        {/* India Hubs & Direct ATS */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">Top Hubs & Platforms</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/jobs?location=Bengaluru&india_feed=true" className="hover:text-cyan-400 transition-colors">
                Bengaluru Tech Openings
              </Link>
            </li>
            <li>
              <Link href="/jobs?location=Hyderabad&india_feed=true" className="hover:text-cyan-400 transition-colors">
                Hyderabad Opportunities
              </Link>
            </li>
            <li>
              <Link href="/jobs?work_mode=remote&india_feed=true" className="hover:text-cyan-400 transition-colors">
                Remote India Positions
              </Link>
            </li>
            <li>
              <Link href="/jobs?location=Pune&india_feed=true" className="hover:text-cyan-400 transition-colors">
                Pune & Mumbai Tech Roles
              </Link>
            </li>
            <li>
              <Link href="/admin/sources" className="hover:text-cyan-400 transition-colors flex items-center gap-1">
                ATS Registry & Ingestion Health
                <ExternalLink className="w-3 h-3 opacity-70" />
              </Link>
            </li>
          </ul>
        </div>

        {/* Trust & Transparency */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">System & Trust</h4>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-xs mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Ingestion Engine Active
              </div>
              <p className="text-[11px] text-slate-400">
                12-Hour automated sync against Greenhouse, Lever, Ashby, and verified direct corporate feeds.
              </p>
            </div>
            <p className="text-[11px] text-slate-500">
              Candidate privacy guaranteed. Resume data and alert preferences are strictly private and never sold to third parties.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <p>© 2026 HirePulse AI. Built for India&apos;s high-impact tech professionals.</p>
        <div className="flex items-center gap-6">
          <Link href="/jobs" className="hover:text-slate-400 transition-colors">All Jobs</Link>
          <Link href="/automation" className="hover:text-slate-400 transition-colors">Alerts</Link>
          <Link href="/resume-builder" className="hover:text-slate-400 transition-colors">Resume</Link>
          <Link href="/ats-checker" className="hover:text-slate-400 transition-colors">ATS Checker</Link>
        </div>
      </div>
    </footer>
  );
}
