"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  fetchAutomationConfig,
  updateAutomationConfig,
  fetchAutomationPreview,
  fetchAutomationLogs,
  triggerAutomationDigest,
  sendAutomationTestEmail
} from "@/lib/api";
import { AutomationConfig, AutomationLogItem } from "@/types/user";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Clock,
  Mail,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  MapPin,
  Briefcase,
  History,
  Sliders,
  Send,
  ExternalLink,
  Zap,
  Play,
  Pause
} from "lucide-react";

export default function AutomationPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();

  const [config, setConfig] = useState<AutomationConfig | null>(null);
  const [logs, setLogs] = useState<AutomationLogItem[]>([]);
  const [preview, setPreview] = useState<{ total_matches: number; threshold: number; sample_jobs: any[]; email_provider_configured?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [triggerResult, setTriggerResult] = useState<any | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [isActive, setIsActive] = useState(true);
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [modalEmail, setModalEmail] = useState("");
  const [modalAction, setModalAction] = useState<"digest" | "test">("digest");

  const [preferredTitles, setPreferredTitles] = useState<string[]>([]);
  const [titleInput, setTitleInput] = useState("");
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [locInput, setLocInput] = useState("");
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [workModes, setWorkModes] = useState<string[]>(["remote", "hybrid"]);
  const [deliveryTime, setDeliveryTime] = useState("09:00");
  const [minMatchScore, setMinMatchScore] = useState<number>(65);
  const [deliveryFrequency, setDeliveryFrequency] = useState<"daily" | "weekly">("daily");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [minSalaryLpa, setMinSalaryLpa] = useState("");

  const loadData = () => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      fetchAutomationConfig(token),
      fetchAutomationPreview(token).catch(() => null),
      fetchAutomationLogs(token).catch(() => []),
    ])
      .then(([cfg, prev, lg]) => {
        setConfig(cfg);
        setIsActive(cfg.is_active);
        setDeliveryEmail(cfg.notification_email || user?.email || "");
        setPreferredTitles(cfg.preferred_titles || []);
        setPreferredLocations(cfg.preferred_locations || []);
        setPreferredSkills(cfg.preferred_skills || []);
        setWorkModes(cfg.work_modes || ["remote", "hybrid"]);
        setDeliveryTime(cfg.delivery_time || "09:00");
        setMinMatchScore(cfg.min_match_score || 65);
        setDeliveryFrequency(cfg.delivery_frequency === "weekly" ? "weekly" : "daily");
        setExperienceLevel(cfg.experience_level || "");
        setMinSalaryLpa(cfg.min_salary ? String(Math.round((cfg.min_salary / 100000) * 10) / 10) : "");
        if (prev) setPreview(prev);
        if (lg) setLogs(lg);
      })
      .catch((err) => {
        console.error("Error loading automation data:", err);
        setErrorMsg("Failed to load automation settings.");
      })
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
  }, [authLoading, user, token, router]);

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const updated = await updateAutomationConfig(
        {
          is_active: isActive,
          notification_email: deliveryEmail.trim() || undefined,
          preferred_titles: preferredTitles,
          preferred_locations: preferredLocations,
          preferred_skills: preferredSkills,
          work_modes: workModes,
          experience_level: experienceLevel || undefined,
          min_salary: minSalaryLpa ? Number(minSalaryLpa) * 100000 : undefined,
          delivery_frequency: deliveryFrequency,
          delivery_time: deliveryTime,
          min_match_score: minMatchScore,
        },
        token
      );
      setConfig(updated);
      setSuccessMsg("Automation preferences & delivery email updated successfully!");
      // Refresh preview
      const freshPreview = await fetchAutomationPreview(token);
      setPreview(freshPreview);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update automation.");
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerRun = async (isTest: boolean = false, targetEmail?: string) => {
    const emailToUse = (targetEmail || deliveryEmail || user?.email || "").trim();
    setTriggering(true);
    setTriggerResult(null);
    setErrorMsg(null);
    try {
      const res = await triggerAutomationDigest(isTest, token, emailToUse || undefined);
      setTriggerResult(res);
      if (res.email_sent) {
        setSuccessMsg(`Delivered real digest email with ${res.jobs_delivered} jobs to ${res.recipient_email}! Check your inbox.`);
      } else if (isTest) {
        setSuccessMsg(`Simulation run complete. Found ${res.jobs_found} matching jobs.`);
      }
      if (emailToUse) {
        setDeliveryEmail(emailToUse);
      }
      // Refresh logs
      const freshLogs = await fetchAutomationLogs(token);
      setLogs(freshLogs);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to trigger automation run.");
    } finally {
      setTriggering(false);
      setEmailModalOpen(false);
    }
  };

  const handleSendTestEmail = async (targetEmail?: string) => {
    const emailToUse = (targetEmail || deliveryEmail || user?.email || "").trim();
    setSendingTest(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await sendAutomationTestEmail(emailToUse || undefined, token);
      setSuccessMsg(`✔ Verification test email sent to ${res.recipient}! Check your inbox.`);
      if (emailToUse) {
        setDeliveryEmail(emailToUse);
      }
      // Refresh logs
      const freshLogs = await fetchAutomationLogs(token);
      setLogs(freshLogs);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send test email. Please verify SMTP setup.");
    } finally {
      setSendingTest(false);
      setEmailModalOpen(false);
    }
  };

  const openConfirmModal = (action: "digest" | "test") => {
    setModalAction(action);
    setModalEmail(deliveryEmail || user?.email || "");
    setEmailModalOpen(true);
  };

  const addTag = (val: string, list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    const trimmed = val.trim();
    if (trimmed && !list.includes(trimmed)) {
      setter([...list, trimmed]);
    }
  };

  const removeTag = (item: string, list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(list.filter((x) => x !== item));
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-400 mb-2">
              <Zap className="w-3.5 h-3.5" />
              Automated Eligibility Digest Engine &bull; Gmail SMTP Active
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Daily Job Alerts & Automation
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Receive newly discovered, deduplicated tech opportunities that match your eligibility criteria straight to your inbox ({user?.email || "your registered email"}).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => openConfirmModal("test")}
              disabled={sendingTest || triggering}
              title="Sends a test email to verify SMTP connection"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 transition-all shadow-sm disabled:opacity-50"
            >
              {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5 text-emerald-400" />}
              Send Test Email
            </button>
            <button
              onClick={() => openConfirmModal("digest")}
              disabled={triggering}
              title="Prompts for email and dispatches live digest with your top matches"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20 border border-blue-500 transition-all disabled:opacity-50"
            >
              {triggering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
              Send Live Digest Now
            </button>
            <button
              onClick={() => handleTriggerRun(true)}
              disabled={triggering}
              title="Runs matching algorithm without sending an email"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-all disabled:opacity-50"
            >
              {triggering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-cyan-400" />}
              Dry Run
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Save Schedule
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2 animate-in">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2 animate-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Trigger Result Card */}
        {triggerResult && (
          <div className="mb-8 p-6 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-white animate-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-base">Test Digest Execution Complete</h3>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-medium">
                {triggerResult.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              {triggerResult.message} Processed against current database index. Recipient: <strong className="text-cyan-400">{triggerResult.recipient_email}</strong>.
            </p>

            {triggerResult.delivered_jobs && triggerResult.delivered_jobs.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {triggerResult.delivered_jobs.map((j: any) => (
                  <div key={j.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-white truncate">{j.title}</div>
                      <span className="text-cyan-400 font-bold shrink-0">{j.match_score}% Match</span>
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">{j.company_name} • {j.location_raw}</div>
                    <div className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {j.match_reasons?.join(" • ")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* System Status Banner */}
        <div className="mb-8 p-4 rounded-2xl bg-slate-900/70 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isActive ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
            <div>
              <div className="font-semibold text-white">Automation Engine</div>
              <div className="text-slate-400">{isActive ? "Active (Daily 12h Syncs)" : "Paused"}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="font-semibold text-white">{deliveryFrequency === "weekly" ? "Weekly" : "Daily"} Dispatch Window</div>
              <div className="text-slate-400">{deliveryTime} IST (Next: {config?.next_run_at ? new Date(config.next_run_at).toLocaleString() : "Scheduled"})</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-indigo-400" />
            <div>
              <div className="font-semibold text-white">Email Dispatch Service</div>
              <div className="text-slate-400">
                {config?.email_provider_configured ? "SMTP Provider Connected" : "Local Digest / Preview Mode"}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Column 1 & 2: Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Toggle Card */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">Daily Digest Status</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  When active, your agent aggregates newly ingested matching jobs and dispatches a summary.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextActive = !isActive;
                  setIsActive(nextActive);
                  if (nextActive) {
                    openConfirmModal("digest");
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {isActive ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                {isActive ? "ACTIVE" : "PAUSED"}
              </button>
            </div>

            {/* Delivery Email Card */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <Mail className="w-4 h-4 text-cyan-400" />
                    Target Delivery Email
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Job alerts and daily digests will be dispatched to this specific email address.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openConfirmModal("digest")}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition-all"
                >
                  Send Now
                </button>
              </div>

              <div className="relative">
                <input
                  type="email"
                  value={deliveryEmail}
                  onChange={(e) => setDeliveryEmail(e.target.value)}
                  placeholder="Enter recipient email (e.g. name@gmail.com)..."
                  className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500 transition-all font-mono"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="absolute right-1.5 top-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            {/* Targeting Preferences */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-5">
              <h3 className="font-bold text-base text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Alert Matching Filters
              </h3>

              {/* Roles */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Target Roles
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {preferredTitles.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      {t}
                      <button type="button" onClick={() => removeTag(t, preferredTitles, setPreferredTitles)} className="hover:text-white">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(titleInput, preferredTitles, setPreferredTitles); setTitleInput(""); } }}
                    placeholder="Add target role (e.g. Senior Backend Engineer)..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button type="button" onClick={() => { addTag(titleInput, preferredTitles, setPreferredTitles); setTitleInput(""); }} className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-white">Add</button>
                </div>
              </div>

              {/* Locations */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Preferred Cities & Regions
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {preferredLocations.map((loc) => (
                    <span key={loc} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      <MapPin className="w-3 h-3 opacity-70" />
                      {loc}
                      <button type="button" onClick={() => removeTag(loc, preferredLocations, setPreferredLocations)} className="hover:text-white">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={locInput}
                    onChange={(e) => setLocInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(locInput, preferredLocations, setPreferredLocations); setLocInput(""); } }}
                    placeholder="Add location (e.g. Bengaluru, Remote India)..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button type="button" onClick={() => { addTag(locInput, preferredLocations, setPreferredLocations); setLocInput(""); }} className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-white">Add</button>
                </div>
              </div>

              {/* Skills */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Key Skills for Eligibility Scoring
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {preferredSkills.map((sk) => (
                    <span key={sk} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {sk}
                      <button type="button" onClick={() => removeTag(sk, preferredSkills, setPreferredSkills)} className="hover:text-white">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(skillInput, preferredSkills, setPreferredSkills); setSkillInput(""); } }}
                    placeholder="Add skill (e.g. Python, Docker, React)..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button type="button" onClick={() => { addTag(skillInput, preferredSkills, setPreferredSkills); setSkillInput(""); }} className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-white">Add</button>
                </div>
              </div>

              {/* Timing & Score Threshold */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Delivery Time
                  </label>
                  <input
                    type="time"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Timezone: Asia/Kolkata (IST)</span>
                  <select
                    value={deliveryFrequency}
                    onChange={(e) => setDeliveryFrequency(e.target.value as "daily" | "weekly")}
                    className="w-full mt-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="daily">Every day</option>
                    <option value="weekly">Once a week</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-slate-300">Min Match Score</label>
                    <span className="text-xs font-bold text-cyan-400">{minMatchScore}%</span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={90}
                    step={5}
                    value={minMatchScore}
                    onChange={(e) => setMinMatchScore(parseInt(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Higher threshold filters for tighter skill alignment</span>
                </div>
              </div>

              {/* Experience & Salary Expectations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Experience Level</label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">No preference</option>
                    <option value="fresher">Fresher / Entry level</option>
                    <option value="1-3_years">1 – 3 years</option>
                    <option value="3-5_years">3 – 5 years</option>
                    <option value="5+_years">5+ years</option>
                  </select>
                  <span className="text-[11px] text-slate-500 mt-1 block">Boosts jobs aligned with your seniority</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Minimum CTC (LPA)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={minSalaryLpa}
                    onChange={(e) => setMinSalaryLpa(e.target.value)}
                    placeholder="e.g. 12"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Jobs below this are deprioritized in digests</span>
                </div>
              </div>
            </div>

            {/* Execution History */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-cyan-400" />
                Recent Automation Logs
              </h3>

              {logs.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No automated runs recorded yet. Use &quot;Run Now&quot; above to simulate a dispatch.</p>
              ) : (
                <div className="space-y-2.5">
                  {logs.map((lg) => (
                    <div key={lg.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${lg.status === "success" ? "bg-emerald-400" : "bg-amber-400"}`} />
                          {lg.status === "success" ? "Dispatched Digest" : "No Qualifying Listings"}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Found {lg.jobs_found} matching • Sent {lg.jobs_sent} jobs
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 text-right">
                        {new Date(lg.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Live Preview of Matching Jobs */}
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-slate-800">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-base text-white">Live Matching Preview</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {preview?.total_matches || 0} jobs qualify under {minMatchScore}% threshold
                  </p>
                </div>
                <span className="text-xs font-bold text-cyan-400 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                  Preview
                </span>
              </div>

              {!preview || preview.sample_jobs?.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No jobs currently exceed {minMatchScore}% threshold. Try lowering the threshold or broadening roles.
                </div>
              ) : (
                <div className="space-y-3">
                  {preview.sample_jobs.map((job: any) => (
                    <div key={job.job_id} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs hover:border-slate-700 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-white line-clamp-1">{job.title}</div>
                        <span className="text-cyan-400 font-bold shrink-0">{job.match_score}%</span>
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">{job.company_name}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-2">
                        <span className="truncate">{job.location_raw || "India"}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-medium">{job.eligibility_confidence || "Likely match"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Email Confirmation / Destination Modal */}
        {emailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in">
            <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {modalAction === "digest" ? "Confirm Delivery Email" : "Send Verification Email"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {modalAction === "digest"
                      ? "Where should we deliver your job alert digest?"
                      : "Enter the email address to receive the test message."}
                  </p>
                </div>
              </div>

              <div className="space-y-4 my-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Recipient Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={modalEmail}
                      onChange={(e) => setModalEmail(e.target.value)}
                      placeholder="e.g. yourname@gmail.com"
                      autoFocus
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono shadow-inner"
                    />
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    💡 This email will also be saved for all upcoming automated daily digests.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(false)}
                  disabled={triggering || sendingTest}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (modalAction === "digest") {
                      handleTriggerRun(false, modalEmail);
                    } else {
                      handleSendTestEmail(modalEmail);
                    }
                  }}
                  disabled={!modalEmail.trim() || triggering || sendingTest}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50"
                >
                  {(triggering || sendingTest) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {modalAction === "digest" ? "Send Digest Now 🚀" : "Send Test Email 🚀"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
