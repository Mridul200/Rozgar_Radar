"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  analyzeATS,
  fetchUserResumes,
  fetchJobs,
  fetchATSHistory,
  deleteATSHistoryItem,
  importResume,
} from "@/lib/api";
import {
  ATSAnalysisResult,
  ResumeRecord,
  ATSAnalysisHistoryItem,
  FormattingWarning,
  PrioritizedImprovement,
} from "@/types/user";
import { JobListing } from "@/types/job";
import { AppSidebarLayout } from "@/components/layout/AppSidebarLayout";
import {
  CheckCircle2,
  AlertCircle,
  FileText,
  Briefcase,
  Sparkles,
  Loader2,
  ChevronRight,
  TrendingUp,
  Percent,
  ListFilter,
  Check,
  X,
  ShieldAlert,
  ArrowRight,
  Upload,
  History,
  FileCode,
  Layers,
  Award,
  ExternalLink,
  Trash2,
  RefreshCw,
  Search,
  Building2,
  HelpCircle,
  Sliders,
  ChevronDown,
} from "lucide-react";

function ATSCheckerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isLoading: authLoading } = useAuth();

  // Active Tab: "checker" or "history"
  const [activeTab, setActiveTab] = useState<"checker" | "history">("checker");

  // Saved Resumes & Live Jobs
  const [savedResumes, setSavedResumes] = useState<ResumeRecord[]>([]);
  const [liveJobs, setLiveJobs] = useState<JobListing[]>([]);

  // Input Selection
  const [resumeMode, setResumeMode] = useState<"builder" | "upload" | "text">("builder");
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [resumeText, setResumeText] = useState("");

  // Target Job Information
  const [targetRole, setTargetRole] = useState("Full Stack Software Engineer");
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  // Analysis State
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ATSAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // History State
  const [historyList, setHistoryList] = useState<ATSAnalysisHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Upload parsing state
  const [isParsingUpload, setIsParsingUpload] = useState(false);

  // 1. Auth Guard & Initial Data Loading
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login?redirect=/ats-checker");
      return;
    }

    if (token) {
      fetchUserResumes(token)
        .then((list) => {
          setSavedResumes(list);
          const resumeIdParam = searchParams.get("resumeId");
          if (resumeIdParam) {
            setSelectedResumeId(resumeIdParam);
            setResumeMode("builder");
          } else if (list.length > 0) {
            setSelectedResumeId(list[0].id);
          }
        })
        .catch(console.error);

      loadHistory();
    }

    fetchJobs({ page_size: 15, sort_by: "verified" })
      .then((data) => setLiveJobs(data.items || []))
      .catch(console.error);
  }, [token, user, authLoading, router, searchParams]);

  const loadHistory = async () => {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const hist = await fetchATSHistory(token);
      setHistoryList(hist);
    } catch (err) {
      console.error("Error loading ATS history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // 2. Job Selection Handler
  const handleSelectJob = (jobId: string) => {
    setSelectedJobId(jobId);
    const found = liveJobs.find((j) => j.id === jobId);
    if (found) {
      setTargetRole(found.title);
      setCompanyName(found.company_name || "");
      setJobDescription(
        `${found.title} at ${found.company_name}\nLocation: ${found.location_raw}\nRequirements:\n${
          found.description_plain || found.description || ""
        }`
      );
    }
  };

  // 3. File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsParsingUpload(true);
    setErrorMsg(null);

    try {
      const res = await importResume(file, token);
      if (res.success && res.raw_text) {
        setResumeText(res.raw_text);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to parse uploaded resume document.");
    } finally {
      setIsParsingUpload(false);
    }
  };

  // 4. Perform ATS Analysis
  const handleAnalyze = async () => {
    setAnalyzing(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const payload: any = {
        target_role: targetRole.trim() || "Software Engineer",
        company_name: companyName.trim(),
        job_description: jobDescription.trim(),
      };

      if (resumeMode === "builder" && selectedResumeId) {
        payload.resume_id = selectedResumeId;
      } else {
        if (!resumeText.trim()) {
          throw new Error("Please upload a resume or paste your resume text to analyze.");
        }
        payload.resume_text = resumeText;
      }

      if (selectedJobId) {
        payload.job_id = selectedJobId;
      }

      const res = await analyzeATS(payload, token);
      setResult(res);

      // Refresh history in background
      if (token) {
        loadHistory();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "ATS analysis failed. Please verify resume content and requirements.");
    } finally {
      setAnalyzing(false);
    }
  };

  // 5. Delete History Item
  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this analysis record?")) return;
    try {
      await deleteATSHistoryItem(id, token);
      setHistoryList((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert("Failed to delete record.");
    }
  };

  // Subscore Helper
  const getSubscoreStatus = (score: number) => {
    if (score >= 80) return { label: "Strong", color: "text-emerald-500", bg: "bg-emerald-500" };
    if (score >= 60) return { label: "Moderate", color: "text-amber-500", bg: "bg-amber-500" };
    return { label: "Needs Work", color: "text-rose-500", bg: "bg-rose-500" };
  };

  if (authLoading || !user) {
    return (
      <AppSidebarLayout>
        <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Opening ATS Scorer...</p>
        </div>
      </AppSidebarLayout>
    );
  }

  return (
    <AppSidebarLayout>
      <div className="min-h-screen bg-background text-foreground pb-20">
        {/* ============================================================== */}
        {/* HEADER                                                         */}
        {/* ============================================================== */}
        <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md px-4 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">ATS Scorer & Match Engine</h1>
                <p className="text-xs text-muted-foreground">
                  Algorithmic Parseability, Keyword Gap Analysis & Role Fit
                </p>
              </div>
            </div>

            {/* Tab Toggle */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border text-xs">
              <button
                onClick={() => setActiveTab("checker")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  activeTab === "checker"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Analyzer</span>
              </button>
              {token && (
                <button
                  onClick={() => setActiveTab("history")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    activeTab === "history"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Past Reports ({historyList.length})</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ============================================================== */}
        {/* TAB 1: CHECKER & COMPATIBILITY ENGINE                          */}
        {/* ============================================================== */}
        {activeTab === "checker" && (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
            {/* Input Card Container */}
            <div className="p-6 rounded-2xl bg-card border border-border space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h2 className="text-base font-bold">1. Select Target Job & Resume</h2>
                  <p className="text-xs text-muted-foreground">
                    Compare your resume against any real-world job description using our 5-pillar ATS formula.
                  </p>
                </div>

                {/* Resume Mode Toggle */}
                <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs">
                  <button
                    onClick={() => setResumeMode("builder")}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      resumeMode === "builder" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    From Resume Builder
                  </button>
                  <button
                    onClick={() => setResumeMode("upload")}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      resumeMode === "upload" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    Upload PDF / DOCX
                  </button>
                  <button
                    onClick={() => setResumeMode("text")}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      resumeMode === "text" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    Paste Text
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                {/* -------------------------------------------------------- */}
                {/* COLUMN A: RESUME INPUT                                   */}
                {/* -------------------------------------------------------- */}
                <div className="space-y-4">
                  <span className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary" />
                    Source Resume
                  </span>

                  {/* Mode 1: From Saved Resumes */}
                  {resumeMode === "builder" && (
                    <div className="space-y-3">
                      {savedResumes.length > 0 ? (
                        <div className="space-y-2">
                          <label className="font-semibold text-muted-foreground">
                            Choose from your saved resumes:
                          </label>
                          <select
                            value={selectedResumeId}
                            onChange={(e) => setSelectedResumeId(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground font-medium outline-none focus:border-primary"
                          >
                            {savedResumes.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.title} ({r.content_json?.professionalTitle || "General"})
                              </option>
                            ))}
                          </select>

                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                            <span>Selected template: {savedResumes.find((r) => r.id === selectedResumeId)?.template || "classic"}</span>
                            <Link
                              href={`/resume-builder?edit=${selectedResumeId}`}
                              className="text-primary hover:underline font-semibold"
                            >
                              Edit in Builder &rarr;
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 rounded-xl border border-dashed border-border text-center space-y-2 bg-muted/20">
                          <p className="text-muted-foreground">No saved resumes found in your account.</p>
                          <Link
                            href="/resume-builder"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            Build your first resume &rarr;
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode 2: Upload File */}
                  {resumeMode === "upload" && (
                    <div className="space-y-3">
                      <div className="border-2 border-dashed border-border rounded-xl p-6 text-center space-y-2 bg-background hover:border-primary/50 transition-colors">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                        <input
                          type="file"
                          id="atsFileUpload"
                          accept=".pdf,.docx,.txt"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="atsFileUpload"
                          className="inline-block font-semibold text-primary cursor-pointer hover:underline"
                        >
                          {uploadedFileName || "Choose PDF or DOCX resume"}
                        </label>
                        <p className="text-[11px] text-muted-foreground">
                          Extracted plain text will be analyzed against JD keywords
                        </p>
                      </div>

                      {isParsingUpload && (
                        <div className="flex items-center gap-2 text-primary text-xs justify-center py-1">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Extracting text and structure...</span>
                        </div>
                      )}

                      {resumeText && !isParsingUpload && (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-between">
                          <span className="font-semibold text-[11px]">
                            ✓ Text extracted ({resumeText.split(/\s+/).length} words ready)
                          </span>
                          <button
                            onClick={() => setResumeText("")}
                            className="text-muted-foreground hover:text-foreground text-[10px]"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode 3: Raw Text */}
                  {resumeMode === "text" && (
                    <div className="space-y-1.5">
                      <label className="font-semibold text-muted-foreground">
                        Paste plain resume text:
                      </label>
                      <textarea
                        rows={8}
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        placeholder="Paste your work experience, technical skills, summary, and projects..."
                        className="w-full p-3 rounded-xl bg-background border border-border text-foreground font-mono text-[11px] leading-relaxed outline-none focus:border-primary"
                      />
                    </div>
                  )}
                </div>

                {/* -------------------------------------------------------- */}
                {/* COLUMN B: TARGET JOB DESCRIPTION                         */}
                {/* -------------------------------------------------------- */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-primary" />
                      Target Job Description
                    </span>

                    {liveJobs.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground">Quick pick:</span>
                        <select
                          value={selectedJobId}
                          onChange={(e) => handleSelectJob(e.target.value)}
                          className="px-2 py-1 rounded bg-muted border border-border text-[11px] text-foreground outline-none max-w-[160px] truncate"
                        >
                          <option value="">Choose live job...</option>
                          {liveJobs.map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.title} ({j.company_name})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground">Target Role Title</label>
                      <input
                        type="text"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        placeholder="e.g. Senior Backend Engineer"
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground outline-none focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground">Company Name (Optional)</label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Google / Microsoft / Startup"
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-muted-foreground">
                      Job Description & Requirements
                    </label>
                    <textarea
                      rows={6}
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the job requirements, responsibilities, and required technical skills..."
                      className="w-full p-3 rounded-xl bg-background border border-border text-foreground leading-relaxed outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2 flex items-center justify-end">
                <button
                  disabled={analyzing || isParsingUpload}
                  onClick={handleAnalyze}
                  className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Computing 5-Pillar Score...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze ATS Compatibility</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ============================================================ */}
            {/* 2. RESULTS & TRANSPARENT BREAKDOWN                           */}
            {/* ============================================================ */}
            {result && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* Hero Score Card */}
                <div className="p-8 rounded-2xl bg-card border border-border flex flex-col md:flex-row items-center justify-between gap-8">
                  {/* Score Dial */}
                  <div className="flex items-center gap-6">
                    <div className="relative w-28 h-28 rounded-full border-4 border-border flex flex-col items-center justify-center bg-background shadow-inner">
                      <span className="text-3xl font-extrabold tracking-tight text-foreground">
                        {result.overall_score}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                        / 100 ATS
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            result.match_level === "High"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : result.match_level === "Moderate"
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                          }`}
                        >
                          {result.match_level} Match
                        </span>
                      </div>
                      <h3 className="text-xl font-bold tracking-tight">
                        Compatibility with {result.target_role || targetRole}
                      </h3>
                      <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
                        {result.role_alignment_notes}
                      </p>
                    </div>
                  </div>

                  {/* Bridge to Resume Builder */}
                  {result.resume_id && (
                    <Link
                      href={`/resume-builder?edit=${result.resume_id}`}
                      className="px-5 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary font-bold text-xs hover:bg-primary/20 transition-all flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Fix Gaps in Resume Builder &rarr;
                    </Link>
                  )}
                </div>

                {/* 5-Category Transparent Breakdown */}
                {result.subscores && (
                  <div className="space-y-4">
                    <h3 className="text-base font-bold tracking-tight">Scoring Formula Breakdown</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
                      {[
                        {
                          title: "Keywords & Skills",
                          weight: "40%",
                          score: result.subscores.keyword_match,
                          desc: "Direct & synonymous skill verification",
                        },
                        {
                          title: "Experience Relevance",
                          weight: "20%",
                          score: result.subscores.experience_relevance,
                          desc: "Role seniority & tenure alignment",
                        },
                        {
                          title: "Completeness",
                          weight: "15%",
                          score: result.subscores.section_completeness,
                          desc: "Core standard structural sections",
                        },
                        {
                          title: "Formatting & Layout",
                          weight: "15%",
                          score: result.subscores.formatting_compatibility,
                          desc: "Single-column parseability & density",
                        },
                        {
                          title: "Content Quality",
                          weight: "10%",
                          score: result.subscores.content_quality,
                          desc: "Metrics, numbers & active action verbs",
                        },
                      ].map((sub, i) => {
                        const status = getSubscoreStatus(sub.score);
                        return (
                          <div
                            key={i}
                            className="p-4 rounded-xl bg-card border border-border space-y-2 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                                <span>Weight: {sub.weight}</span>
                                <span className={status.color}>{status.label}</span>
                              </div>
                              <h4 className="font-bold text-foreground mt-1">{sub.title}</h4>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                                {sub.desc}
                              </p>
                            </div>

                            <div className="pt-3 space-y-1">
                              <div className="flex justify-between items-baseline font-bold text-sm">
                                <span>{sub.score}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${status.bg}`}
                                  style={{ width: `${sub.score}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Keyword & Verified Synonym Analysis */}
                {result.keyword_analysis && (
                  <div className="p-6 rounded-2xl bg-card border border-border space-y-5 text-xs">
                    <div className="border-b border-border pb-3">
                      <h3 className="text-base font-bold">Keyword & Skill Gap Analysis</h3>
                      <p className="text-muted-foreground">
                        Identifies exact matches, missing requirements, and verified technical synonyms.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Matched Required Skills */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <h4 className="font-bold text-foreground">
                            Required Skills Matched ({result.keyword_analysis.required_matched.length})
                          </h4>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {result.keyword_analysis.required_matched.length > 0 ? (
                            result.keyword_analysis.required_matched.map((s, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium"
                              >
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground">No direct required matches detected.</span>
                          )}
                        </div>
                      </div>

                      {/* Missing Required Skills */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-500" />
                          <h4 className="font-bold text-foreground">
                            Missing Required Skills ({result.keyword_analysis.required_missing.length})
                          </h4>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {result.keyword_analysis.required_missing.length > 0 ? (
                            result.keyword_analysis.required_missing.map((s, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 font-medium"
                              >
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-emerald-500 font-semibold">
                              ✓ All core technical requirements found!
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Verified Synonyms Detected */}
                    {result.keyword_analysis.synonym_matches &&
                      result.keyword_analysis.synonym_matches.length > 0 && (
                        <div className="pt-3 border-t border-border space-y-2">
                          <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
                            Verified ATS Synonyms Recognized:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {result.keyword_analysis.synonym_matches.map((syn, idx) => (
                              <div
                                key={idx}
                                className="px-2.5 py-1 rounded bg-muted border border-border text-[11px] text-muted-foreground"
                              >
                                Target: <strong className="text-foreground">{syn.original_jd_term}</strong> → Matched as{" "}
                                <strong className="text-primary">{syn.resume_matched_variant}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Evidence Snippets */}
                {result.evidence_snippets && result.evidence_snippets.length > 0 && (
                  <div className="p-6 rounded-2xl bg-card border border-border space-y-3 text-xs">
                    <h3 className="text-base font-bold">Evidence Snippets Found in Resume</h3>
                    <p className="text-muted-foreground">
                      Lines extracted from your resume where relevant keywords and qualifications were verified.
                    </p>
                    <div className="space-y-2 pt-1">
                      {result.evidence_snippets.map((snip, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-background border border-border text-foreground font-mono text-[11px] leading-relaxed"
                        >
                          &gt; {snip}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Formatting Warnings & Compatibility Checks */}
                {result.formatting_warnings && result.formatting_warnings.length > 0 && (
                  <div className="p-6 rounded-2xl bg-card border border-border space-y-4 text-xs">
                    <h3 className="text-base font-bold">Formatting & Parser Compatibility Notices</h3>
                    <div className="space-y-3">
                      {result.formatting_warnings.map((warn, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl border space-y-1 ${
                            warn.severity === "risk"
                              ? "bg-rose-500/5 border-rose-500/20 text-rose-500"
                              : "bg-muted/50 border-border text-foreground"
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span>{warn.title}</span>
                            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-background">
                              {warn.severity === "risk" ? "Risk Flag" : "Notice"}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-[11px]">{warn.detail}</p>
                          <p className="text-foreground font-semibold text-[11px] pt-1">
                            Recommended Action: {warn.fix}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prioritized Improvements & Action Items */}
                {result.prioritized_improvements && result.prioritized_improvements.length > 0 && (
                  <div className="p-6 rounded-2xl bg-card border border-border space-y-4 text-xs">
                    <h3 className="text-base font-bold">Prioritized Action Items</h3>
                    <div className="space-y-3">
                      {result.prioritized_improvements.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border border-border bg-background flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                  item.priority === "high"
                                    ? "bg-rose-500/10 text-rose-500"
                                    : item.priority === "medium"
                                    ? "bg-amber-500/10 text-amber-500"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {item.priority} Priority
                              </span>
                              <span className="font-semibold text-muted-foreground">
                                Category: {item.category}
                              </span>
                            </div>
                            <h4 className="font-bold text-foreground text-sm">{item.recommendation}</h4>
                            <p className="text-muted-foreground text-[11px]">{item.reason}</p>
                          </div>

                          {/* Fix in Resume Builder CTA */}
                          {result.resume_id && (
                            <Link
                              href={`/resume-builder?edit=${result.resume_id}`}
                              className="px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs whitespace-nowrap transition-colors flex items-center gap-1.5"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Fix with AI
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Algorithmic Disclaimer */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Disclaimer: </span>
                  {result.disclaimer}
                </div>
              </div>
            )}
          </main>
        )}

        {/* ============================================================== */}
        {/* TAB 2: ANALYSIS HISTORY                                        */}
        {/* ============================================================== */}
        {activeTab === "history" && (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Past ATS Evaluations</h2>
                <p className="text-xs text-muted-foreground">
                  History of all scans and match analyses performed in your account.
                </p>
              </div>

              <button
                onClick={loadHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-muted text-muted-foreground"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>

            {historyLoading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs">Loading analysis history...</p>
              </div>
            ) : historyList.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-3">
                <History className="w-8 h-8 text-muted-foreground mx-auto" />
                <h4 className="font-semibold text-sm">No analysis history found</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Run an ATS scan against any role or saved resume to track your compatibility progression.
                </p>
                <button
                  onClick={() => setActiveTab("checker")}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs inline-block"
                >
                  Start New Scan
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {historyList.map((item) => {
                  const date = new Date(item.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setResult(item.report);
                        setActiveTab("checker");
                      }}
                      className="group bg-card border border-border hover:border-primary/50 rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all hover:shadow-lg relative"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="space-y-1">
                            <h4 className="font-bold text-base group-hover:text-primary transition-colors line-clamp-1">
                              {item.target_role || "Software Engineer"}
                            </h4>
                            <p className="text-xs text-muted-foreground font-medium">
                              {item.company_name ? `at ${item.company_name}` : "General Requirements"}
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-xl font-black text-foreground">
                              {item.overall_score}
                            </span>
                            <span className="text-[10px] text-muted-foreground block uppercase font-semibold">
                              / 100
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground mt-2 line-clamp-1">
                          Resume: <span className="text-foreground">{item.resume_title || "Uploaded Document"}</span>
                        </p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                        <span className="text-[11px]">{date}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleDeleteHistory(item.id, e)}
                            className="p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-primary font-semibold text-[11px] group-hover:underline">
                            View Report &rarr;
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        )}
      </div>
    </AppSidebarLayout>
  );
}


export default function ATSCheckerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <ATSCheckerContent />
    </Suspense>
  );
}
