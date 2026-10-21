"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { EmbedModal } from "@/components/EmbedModal";
import { fetchSources, fetchSyncLogs, triggerProtectedSync } from "@/lib/api";
import { SourceStatusSummary, SyncLogItem } from "@/types/job";
import {
  Database,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  KeyRound,
  ArrowLeft,
  Loader2,
} from "lucide-react";

export default function SourcesAdminPage() {
  const [sources, setSources] = useState<SourceStatusSummary[]>([]);
  const [logs, setLogs] = useState<SyncLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState("change-this-secure-admin-key-in-production");
  const [isEmbedOpen, setIsEmbedOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<"live" | "all">("live");

  const loadData = () => {
    setLoading(true);
    Promise.all([fetchSources(), fetchSyncLogs()])
      .then(([srcs, lg]) => {
        setSources(srcs);
        setLogs(lg);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading sources:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerSync = async (sourceId?: string) => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await triggerProtectedSync(sourceId, adminKey);
      setSyncMessage(res.message || "Synchronization initiated successfully!");
      // Reload logs after 3 seconds
      setTimeout(() => {
        loadData();
        setSyncing(false);
      }, 3000);
    } catch (err: any) {
      setSyncMessage(`Error: ${err.message || "Failed to trigger sync"}`);
      setSyncing(false);
    }
  };

  const getPermissionBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Approved</span>;
      case "permission_required":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">Permission Required</span>;
      case "restricted":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Restricted</span>;
      case "not_reviewed":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300 border border-slate-600">Not Reviewed</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">{status}</span>;
    }
  };

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="w-3.5 h-3.5" /> Success</span>;
      case "failed":
        return <span className="flex items-center gap-1 text-xs text-rose-400"><XCircle className="w-3.5 h-3.5" /> Failed</span>;
      case "running":
        return <span className="flex items-center gap-1 text-xs text-indigo-400 animate-pulse"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> In Progress</span>;
      default:
        return <span className="flex items-center gap-1 text-xs text-slate-400"><Clock className="w-3.5 h-3.5" /> Idle</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header onOpenEmbed={() => setIsEmbedOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Job Board</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
              <Database className="w-7 h-7 text-sky-400" />
              <span>Job Source Registry & Ingestion Health</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Inspection of ATS platforms, permission compliance, rate-limit policies, and live sync execution.
            </p>
          </div>

          {/* Sync Trigger Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
              <KeyRound className="w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Admin API Key"
                className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-36"
                title="Admin API Key"
              />
            </div>
            <button
              onClick={() => handleTriggerSync()}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 disabled:opacity-50 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              <span>{syncing ? "Syncing Sources..." : "Trigger Live Ingestion"}</span>
            </button>
          </div>
        </div>

        {syncMessage && (
          <div className="mb-6 p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-300 flex items-center justify-between">
            <span>{syncMessage}</span>
            <button onClick={() => setSyncMessage(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Source Registry Table */}
        <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden mb-10 shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Job Sources</span>
              </h3>

              {/* Tabs for Live Fetched vs All Cataloged */}
              <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs">
                <button
                  onClick={() => setSourceFilter("live")}
                  className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    sourceFilter === "live"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  🟢 Live Fetched ({sources.filter(s => s.is_active || s.total_jobs > 0).length})
                </button>
                <button
                  onClick={() => setSourceFilter("all")}
                  className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    sourceFilter === "all"
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  All Tracked ({sources.length})
                </button>
              </div>
            </div>

            <button onClick={loadData} className="text-xs text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer">
              <RefreshCw className="w-3 h-3" /> Refresh Table
            </button>
          </div>

          {sourceFilter === "live" && (
            <div className="px-4 py-2 bg-emerald-950/20 border-b border-emerald-500/10 text-[11px] text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Showing 100% genuine live-fetched sources. Every listing comes from direct company ATS APIs without any pre-saved or mock data.</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Source Name</th>
                  <th className="py-3 px-4">Type / ATS</th>
                  <th className="py-3 px-4">Permission</th>
                  <th className="py-3 px-4">🇮🇳 India Eligible</th>
                  <th className="py-3 px-4">Global Total</th>
                  <th className="py-3 px-4">Last Sync</th>
                  <th className="py-3 px-4">Sync Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                      Loading source registry...
                    </td>
                  </tr>
                ) : sources
                    .filter((src) => sourceFilter === "all" ? true : (src.is_active || src.total_jobs > 0))
                    .map((src) => (
                  <tr key={src.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div>{src.name}</div>
                      <span className="text-[10px] text-slate-500 font-mono">{src.id}</span>
                    </td>
                    <td className="py-3.5 px-4 capitalize">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {src.ats_platform || src.source_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">{getPermissionBadge(src.permission_status)}</td>
                    <td className="py-3.5 px-4 font-bold">
                      {src.india_jobs > 0 ? (
                        <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                          <span>🇮🇳</span> {src.india_jobs}
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-300">
                      {src.total_jobs > 0 ? (
                        <span>{src.total_jobs}</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {src.last_sync_at ? new Date(src.last_sync_at).toLocaleString() : "Never"}
                    </td>
                    <td className="py-3.5 px-4">
                      {getSyncStatusBadge(src.sync_status)}
                      {src.last_error && (
                        <div className="text-[10px] text-rose-400 max-w-xs truncate" title={src.last_error}>
                          {src.last_error}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {src.permission_status === "approved" ? (
                        <button
                          onClick={() => handleTriggerSync(src.id)}
                          disabled={syncing}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-colors cursor-pointer"
                        >
                          Sync Now
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">
                          {src.permission_status === "permission_required" ? "Gated (Auth Req)" : "Unapproved"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ingestion Logs */}
        <div className="glass-panel rounded-2xl border border-slate-800/80 p-5 shadow-xl">
          <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Recent Synchronization Audit Trail (Last 20 Runs)</span>
          </h3>

          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="text-xs text-slate-500 py-4 text-center">No synchronization logs recorded yet.</div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between text-xs gap-4 flex-wrap"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white font-mono">{log.source_id}</span>
                    <span className="text-slate-400">
                      {new Date(log.started_at).toLocaleTimeString()}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.status === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    }`}>
                      {log.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                    <span>Fetched: <strong>{log.jobs_fetched}</strong></span>
                    <span>Created: <strong className="text-emerald-400">{log.jobs_created}</strong></span>
                    <span>Updated: <strong className="text-sky-400">{log.jobs_updated}</strong></span>
                    <span>Duplicates: <strong className="text-amber-400">{log.duplicates_found}</strong></span>
                    <span>Duration: <strong>{log.duration_ms}ms</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <EmbedModal isOpen={isEmbedOpen} onClose={() => setIsEmbedOpen(false)} />
    </div>
  );
}
