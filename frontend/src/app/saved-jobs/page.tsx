"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchSavedJobs, updateSavedJob, removeSavedJob } from "@/lib/api";
import { SavedJobItem } from "@/types/user";
import { AppSidebarLayout } from "@/components/layout/AppSidebarLayout";
import {
  BookmarkCheck,
  Building2,
  MapPin,
  ExternalLink,
  Trash2,
  Calendar,
  AlertCircle,
  Loader2,
  Briefcase,
  CheckCircle2,
  Clock,
  Edit3,
  Save
} from "lucide-react";

const STATUSES: { id: "saved" | "applied" | "interviewing" | "offered" | "rejected"; label: string; color: string }[] = [
  { id: "saved", label: "Bookmarked", color: "bg-slate-800 text-slate-300 border-slate-700" },
  { id: "applied", label: "Applied", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  { id: "interviewing", label: "Interviewing", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  { id: "offered", label: "Offer Received", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  { id: "rejected", label: "Archived", color: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
];

export default function SavedJobsPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();

  const [savedJobs, setSavedJobs] = useState<SavedJobItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<any>("saved");
  const [savingAction, setSavingAction] = useState(false);

  const loadData = () => {
    if (!token) return;
    setLoading(true);
    fetchSavedJobs(activeFilter === "all" ? undefined : activeFilter, token)
      .then(setSavedJobs)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }
    if (token) {
      loadData();
    }
  }, [authLoading, user, token, activeFilter, router]);

  const handleUpdate = async (id: string) => {
    if (!token) return;
    setSavingAction(true);
    try {
      await updateSavedJob(id, { status: editStatus, notes: editNotes }, token);
      setEditingId(null);
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingAction(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!confirm("Remove this job from your tracker?")) return;
    try {
      await removeSavedJob(id, token);
      setSavedJobs(savedJobs.filter((j) => j.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (job: SavedJobItem) => {
    setEditingId(job.id);
    setEditNotes(job.notes || "");
    setEditStatus(job.status);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <AppSidebarLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-400 mb-2">
              <BookmarkCheck className="w-3.5 h-3.5" />
              Application Tracker & Pipeline
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Saved Jobs & Applications
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Track hiring stages, interview notes, and application dates for your target opportunities.
            </p>
          </div>

          <Link
            href="/jobs"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-md shadow-cyan-500/25 transition-all self-start"
          >
            <Briefcase className="w-4 h-4" />
            Discover More Jobs
          </Link>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === "all"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            All Items ({savedJobs.length})
          </button>
          {STATUSES.map((st) => (
            <button
              key={st.id}
              onClick={() => setActiveFilter(st.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === st.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* List of Tracked Jobs */}
        {savedJobs.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 border border-slate-800 text-center max-w-md mx-auto my-12">
            <BookmarkCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="font-bold text-base text-white">No jobs in this column</h3>
            <p className="text-xs text-slate-400 mt-1 mb-5">
              Browse through verified listings and bookmark jobs you want to apply or track.
            </p>
            <Link
              href="/jobs"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors shadow-md shadow-cyan-600/30"
            >
              Browse Openings
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {savedJobs.map((item) => {
              const isEditing = editingId === item.id;
              const statusCfg = STATUSES.find((s) => s.id === item.status) || STATUSES[0];

              return (
                <div
                  key={item.id}
                  className="glass-card rounded-2xl p-5 sm:p-6 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                      {item.is_india_eligible && (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          India Verified
                        </span>
                      )}
                      {item.applied_at && (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Applied {new Date(item.applied_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white hover:text-cyan-400 transition-colors">
                      {item.job_title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        {item.company_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {item.location_raw || "Not specified"}
                      </span>
                      {item.work_mode && (
                        <span className="capitalize px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
                          {item.work_mode}
                        </span>
                      )}
                    </div>

                    {/* Notes Display or Editor */}
                    {isEditing ? (
                      <div className="pt-2 space-y-2 max-w-xl animate-in">
                        <div className="flex gap-2">
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                          >
                            {STATUSES.map((s) => (
                              <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                        <textarea
                          rows={2}
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Interview dates, recruiter notes, salary discussed..."
                          className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdate(item.id)}
                            disabled={savingAction}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1"
                          >
                            <Save className="w-3 h-3" /> Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : item.notes ? (
                      <div className="pt-1 text-xs text-slate-400 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/80 max-w-xl">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">Notes</span>
                        {item.notes}
                      </div>
                    ) : null}
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800 shrink-0">
                    {!isEditing && (
                      <button
                        onClick={() => startEdit(item)}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
                        title="Edit notes & status"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {item.application_url && (
                      <a
                        href={item.application_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm shadow-indigo-700/30 transition-all"
                      >
                        Official Apply
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppSidebarLayout>
  );
}
