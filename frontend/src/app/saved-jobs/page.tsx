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
  Loader2,
  Briefcase,
  Edit3,
  Save,
} from "lucide-react";

const STATUSES: { id: "saved" | "applied" | "interviewing" | "offered" | "rejected"; label: string; color: string }[] = [
  { id: "saved", label: "Bookmarked", color: "bg-muted text-foreground border-border" },
  { id: "applied", label: "Applied", color: "bg-primary/15 text-primary border-primary/30" },
  { id: "interviewing", label: "Interviewing", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  { id: "offered", label: "Offer Received", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  { id: "rejected", label: "Archived", color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" },
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
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppSidebarLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-2">
              <BookmarkCheck className="w-3.5 h-3.5" />
              Application Tracker & Pipeline
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Saved Jobs & Applications
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Track hiring stages, interview notes, and application dates for your target opportunities.
            </p>
          </div>

          <Link
            href="/jobs"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-white bg-primary hover:bg-[--primary-hover] shadow-sm transition-all self-start"
          >
            <Briefcase className="w-4 h-4" />
            Discover More Jobs
          </Link>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === "all"
                ? "bg-primary text-white border border-primary shadow-xs"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All Items ({savedJobs.length})
          </button>
          {STATUSES.map((st) => (
            <button
              key={st.id}
              onClick={() => setActiveFilter(st.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === st.id
                  ? "bg-primary text-white border border-primary shadow-xs"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* List of Tracked Jobs */}
        {savedJobs.length === 0 ? (
          <div className="rounded-2xl p-12 border border-border bg-card text-center max-w-md mx-auto my-12 shadow-xs">
            <BookmarkCheck className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="font-bold text-base text-foreground">No jobs in this column</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-5">
              Browse through verified listings and bookmark jobs you want to apply or track.
            </p>
            <Link
              href="/jobs"
              className="px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-primary hover:bg-[--primary-hover] transition-colors shadow-sm"
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
                  className="rounded-2xl p-5 sm:p-6 border border-border bg-card hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                      {item.is_india_eligible && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          India Verified
                        </span>
                      )}
                      {item.applied_at && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Applied {new Date(item.applied_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-foreground hover:text-primary transition-colors">
                      {item.job_title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        {item.company_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        {item.location_raw || "Not specified"}
                      </span>
                      {item.work_mode && (
                        <span className="capitalize px-2 py-0.5 rounded-md bg-muted border border-border text-[11px]">
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
                            className="px-3 py-1.5 rounded-xl bg-card border border-border text-xs text-foreground outline-none"
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
                          className="w-full p-2.5 rounded-xl bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdate(item.id)}
                            disabled={savingAction}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-[--primary-hover] text-white flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Save className="w-3 h-3" /> Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : item.notes ? (
                      <div className="pt-1 text-xs text-muted-foreground bg-muted/50 p-2.5 rounded-xl border border-border max-w-xl">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-0.5">Notes</span>
                        {item.notes}
                      </div>
                    ) : null}
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border shrink-0">
                    {!isEditing && (
                      <button
                        onClick={() => startEdit(item)}
                        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border transition-colors cursor-pointer"
                        title="Edit notes & status"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {item.application_url && (
                      <a
                        href={item.application_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-[--primary-hover] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
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
