"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { analyzeATS, fetchUserResumes, fetchJobs } from "@/lib/api";
import { ATSAnalysisResult, ResumeRecord } from "@/types/user";
import { JobListing } from "@/types/job";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
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
  ArrowRight
} from "lucide-react";

export default function ATSCheckerPage() {
  const { user, token } = useAuth();

  const [savedResumes, setSavedResumes] = useState<ResumeRecord[]>([]);
  const [liveJobs, setLiveJobs] = useState<JobListing[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [resumeText, setResumeText] = useState("");
  const [targetRole, setTargetRole] = useState("Full Stack Engineer");
  const [jobDescription, setJobDescription] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ATSAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Load saved resumes if logged in
    if (token) {
      fetchUserResumes(token)
        .then((list) => {
          setSavedResumes(list);
          if (list.length > 0) {
            setSelectedResumeId(list[0].id);
          }
        })
        .catch(console.error);
    }

    // Load sample live jobs for easy testing
    fetchJobs({ page_size: 10, sort_by: "verified" })
      .then((data) => setLiveJobs(data.items || []))
      .catch(console.error);
  }, [token]);

  const handleSelectJob = (jobId: string) => {
    setSelectedJobId(jobId);
    const found = liveJobs.find((j) => j.id === jobId);
    if (found) {
      setTargetRole(found.title);
      setJobDescription(
        `${found.title} at ${found.company_name}\nLocation: ${found.location_raw}\nRequirements:\n${found.description_plain || ""}`
      );
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const payload: any = {
        target_role: targetRole,
        job_description: jobDescription,
      };

      if (selectedResumeId && selectedResumeId !== "custom") {
        payload.resume_id = selectedResumeId;
      } else {
        payload.resume_text = resumeText;
      }

      if (selectedJobId) {
        payload.job_id = selectedJobId;
      }

      const res = await analyzeATS(payload, token);
      setResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || "ATS analysis failed. Please provide resume content.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Applicant Tracking System (ATS) Parser & Readiness
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ATS Resume Readiness Analyzer
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Evaluate your resume against real employer job listings to identify missing technical keywords, structural issues, and quantify your interview qualification odds.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2 animate-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Inputs Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Card 1: Resume Input */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-sm uppercase tracking-wider text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                1. Select or Paste Resume
              </h2>
              {savedResumes.length > 0 && (
                <span className="text-[11px] text-cyan-400">{savedResumes.length} saved</span>
              )}
            </div>

            {savedResumes.length > 0 && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Use Saved Resume</label>
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  {savedResumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.template})
                    </option>
                  ))}
                  <option value="custom">-- Paste Custom Text Below --</option>
                </select>
              </div>
            )}

            {(selectedResumeId === "custom" || savedResumes.length === 0) && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Resume Content (Text / Skills / Experience)
                </label>
                <textarea
                  rows={8}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your resume work history, technical skills, and project accomplishments..."
                  className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500 leading-relaxed"
                />
              </div>
            )}
          </div>

          {/* Card 2: Target Job Description */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-sm uppercase tracking-wider text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                2. Target Job Description
              </h2>
              <span className="text-[11px] text-slate-400">Match against opening</span>
            </div>

            {liveJobs.length > 0 && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Pick From Live Database Jobs</label>
                <select
                  value={selectedJobId}
                  onChange={(e) => handleSelectJob(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- Choose a live opening or paste custom JD --</option>
                  {liveJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} @ {j.company_name} ({j.location_raw || "India"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-400 mb-1">Target Role Title</label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Backend Engineer"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Job Description Requirements</label>
              <textarea
                rows={5}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the employer's job description, requirements, and required skills..."
                className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500 leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Action Trigger */}
        <div className="flex justify-center mb-10">
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-cyan-500 via-indigo-600 to-cyan-500 hover:from-cyan-400 hover:to-indigo-500 shadow-xl shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Parsing Resume & Job Specification...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Analyze ATS Readiness Score
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-8 animate-in">
            {/* Score Overview Banner */}
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                {/* Overall Score */}
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-tr from-cyan-400 to-indigo-400">
                    {result.overall_score}
                  </div>
                  <span className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                    Readiness Score
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full mt-2 font-bold ${
                    result.match_level === "High"
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : result.match_level === "Moderate"
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                      : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                  }`}>
                    {result.match_level} Alignment
                  </span>
                </div>

                {/* Submetrics */}
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1">Keyword Coverage</span>
                    <div className="text-2xl font-bold text-white">{result.keyword_coverage_percent}%</div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${result.keyword_coverage_percent}%` }} />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1">Readability & Structure</span>
                    <div className="text-2xl font-bold text-white">{result.readability_score}%</div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${result.readability_score}%` }} />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1">Role Alignment</span>
                    <div className="text-2xl font-bold text-white">{result.experience_score}%</div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${result.experience_score}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{result.disclaimer}</span>
              </div>
            </div>

            {/* Skills Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Matched Skills */}
              <div className="glass-card rounded-2xl p-6 border border-slate-800">
                <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2 mb-3">
                  <Check className="w-4 h-4" />
                  Matched Skills & Keywords ({result.matched_skills.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.matched_skills.map((sk) => (
                    <span key={sk} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                      ✓ {sk}
                    </span>
                  ))}
                  {result.matched_skills.length === 0 && (
                    <span className="text-xs text-slate-500 italic">No skills matched directly.</span>
                  )}
                </div>
              </div>

              {/* Missing Skills */}
              <div className="glass-card rounded-2xl p-6 border border-slate-800">
                <h3 className="font-bold text-sm text-rose-400 flex items-center gap-2 mb-3">
                  <X className="w-4 h-4" />
                  Recommended Keywords to Add ({result.missing_skills.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.missing_skills.map((sk) => (
                    <span key={sk} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-300 border border-rose-500/25">
                      + {sk}
                    </span>
                  ))}
                  {result.missing_skills.length === 0 && (
                    <span className="text-xs text-emerald-400 font-medium">All core target skills covered!</span>
                  )}
                </div>
              </div>
            </div>

            {/* Formatting Observations & Actionable Suggestions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Formatting */}
              <div className="glass-card rounded-2xl p-6 border border-slate-800">
                <h3 className="font-bold text-sm text-white flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Formatting & Readability Observations
                </h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  {result.formatting_observations.map((obs, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                      <span>{obs}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actionable Suggestions */}
              <div className="glass-card rounded-2xl p-6 border border-slate-800">
                <h3 className="font-bold text-sm text-white flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Actionable Improvement Suggestions
                </h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  {result.actionable_suggestions.map((sug, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                      <span>{sug}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Evidence Snippets */}
            {result.evidence_snippets && result.evidence_snippets.length > 0 && (
              <div className="glass-card rounded-2xl p-6 border border-slate-800">
                <h3 className="font-bold text-sm text-white flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  Extracted Evidence Snippets
                </h3>
                <div className="space-y-2">
                  {result.evidence_snippets.map((snip, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300 font-mono italic">
                      &quot;{snip}&quot;
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
