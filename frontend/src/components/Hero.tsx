"use client";

import { ShieldCheck, RefreshCw, Layers, Globe } from "lucide-react";

interface HeroProps {
  totalJobs: number;
  totalSources: number;
}

export function Hero({ totalJobs, totalSources }: HeroProps) {
  return (
    <section className="relative pt-12 pb-8 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-72 bg-gradient-to-r from-indigo-500/15 via-sky-500/10 to-indigo-500/15 blur-3xl -z-10 pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-medium text-slate-300 mb-6 shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live Multi-Source Aggregator Active</span>
          <span className="text-slate-500">•</span>
          <span className="text-indigo-400 font-semibold">100% Direct ATS Feeds</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4">
          Find Permitted Job Vacancies Across{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-indigo-300">
            Verified ATS Boards
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 mb-8 leading-relaxed">
          Aggregated directly from official company applicant tracking endpoints
          (Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Workable, Recruitee) with full source attribution, layered deduplication,
          and links to original application pages.
        </p>

        {/* Feature Badges / Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
          <div className="glass-panel p-4 rounded-xl flex items-center gap-3 text-left">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{totalJobs}</div>
              <div className="text-xs text-slate-400">Verified Openings</div>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl flex items-center gap-3 text-left">
            <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{totalSources}</div>
              <div className="text-xs text-slate-400">Connected ATS Sources</div>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl flex items-center gap-3 text-left">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">3-Tier</div>
              <div className="text-xs text-slate-400">Deduplication Active</div>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl flex items-center gap-3 text-left">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">12h</div>
              <div className="text-xs text-slate-400">Auto-Sync Cadence</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
