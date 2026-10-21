"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, RefreshCw, CheckCircle2 } from "lucide-react";
import { fetchSyncStatus, SyncStatusData } from "@/lib/api";

interface SyncCountdownBannerProps {
  onRefreshFeed: () => void;
  isRefreshingFeed?: boolean;
}

export function SyncCountdownBanner({ onRefreshFeed, isRefreshingFeed = false }: SyncCountdownBannerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(12 * 3600);
  const [nextSyncTime, setNextSyncTime] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isSyncRunning, setIsSyncRunning] = useState(false);
  const [manualSpin, setManualSpin] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const data: SyncStatusData = await fetchSyncStatus();
      setSecondsRemaining(data.seconds_remaining);
      setNextSyncTime(data.next_sync_at);
      setLastSyncTime(data.last_sync_at);
      setIsSyncRunning(data.is_sync_running);
    } catch (err) {
      // Fallback: 12 hours
      setSecondsRemaining((prev) => (prev > 0 ? prev : 12 * 3600));
    }
  }, []);

  useEffect(() => {
    loadStatus();
    // Poll sync status every 60 seconds
    const statusInterval = setInterval(loadStatus, 60000);
    return () => clearInterval(statusInterval);
  }, [loadStatus]);

  // Second-by-second countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Timer reached 0! Trigger automatic API re-fetch
          onRefreshFeed();
          setJustRefreshed(true);
          setTimeout(() => setJustRefreshed(false), 5000);
          loadStatus();
          return 12 * 3600; // Reset for next 12-hour cycle
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onRefreshFeed, loadStatus]);

  const handleManualRefresh = async () => {
    setManualSpin(true);
    onRefreshFeed();
    await loadStatus();
    setJustRefreshed(true);
    setTimeout(() => {
      setManualSpin(false);
      setTimeout(() => setJustRefreshed(false), 3000);
    }, 1000);
  };

  // Format seconds into HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return {
      h: String(hours).padStart(2, "0"),
      m: String(minutes).padStart(2, "0"),
      s: String(seconds).padStart(2, "0"),
    };
  };

  const { h, m, s } = formatTime(secondsRemaining);

  return (
    <div className="relative glass-panel rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-indigo-950/40 p-3.5 sm:p-4 mb-6 shadow-lg shadow-indigo-950/20 overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        {/* Left: Info & Cadence */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                12-Hour Automated Sync Cadence
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium">
                Auto-Refresh Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Feed automatically fetches and refreshes fresh listings from official ATS APIs every 12 hours.
              {lastSyncTime && (
                <span className="text-slate-500 hidden md:inline">
                  {" "}&bull; Last synced: {new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Live Countdown Clock & Manual Refresh Button */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Ticking Digital Clock */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-indigo-500/30 rounded-xl px-3 py-1.5 shadow-inner">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mr-1">Next Sync In:</span>
            <div className="flex items-baseline font-mono text-sm sm:text-base font-extrabold text-white">
              <span className="text-indigo-400">{h}</span>
              <span className="text-slate-500 px-0.5">:</span>
              <span className="text-sky-400">{m}</span>
              <span className="text-slate-500 px-0.5">:</span>
              <span className="text-emerald-400">{s}</span>
            </div>
          </div>

          {/* Quick Manual Refresh button */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshingFeed || manualSpin}
            title="Refresh job feed now"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 disabled:opacity-50 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(isRefreshingFeed || manualSpin) ? "animate-spin text-white" : ""}`} />
            <span className="hidden sm:inline">Refresh Now</span>
          </button>
        </div>
      </div>

      {justRefreshed && (
        <div className="mt-2 pt-2 border-t border-indigo-500/15 flex items-center justify-center gap-1.5 text-xs text-emerald-400 animate-fadeIn">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Job feed successfully refreshed with the latest ATS data!</span>
        </div>
      )}
    </div>
  );
}
