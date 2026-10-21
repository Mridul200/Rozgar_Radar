"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchUserProfile, updateUserProfile } from "@/lib/api";
import { UserProfile } from "@/types/user";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  User as UserIcon,
  MapPin,
  Briefcase,
  Code2,
  GraduationCap,
  DollarSign,
  Bell,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [currentCity, setCurrentCity] = useState("");
  const [currentState, setCurrentState] = useState("");
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [preferredRoles, setPreferredRoles] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [roleInput, setRoleInput] = useState("");
  const [locInput, setLocInput] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("1-3_years");
  const [yearsExperience, setYearsExperience] = useState<number>(3);
  const [education, setEducation] = useState("");
  const [workModes, setWorkModes] = useState<string[]>(["remote", "hybrid"]);
  const [minSalary, setMinSalary] = useState<number>(1500000);
  const [resumeText, setResumeText] = useState("");
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }

    if (token) {
      setLoading(true);
      fetchUserProfile(token)
        .then((p) => {
          setProfile(p);
          setCurrentCity(p.current_city || "");
          setCurrentState(p.current_state || "");
          setPreferredLocations(p.preferred_locations || []);
          setPreferredRoles(p.preferred_roles || []);
          setSkills(p.skills || []);
          setExperienceLevel(p.experience_level || "1-3_years");
          setYearsExperience(p.years_experience || 0);
          setEducation(p.education || "");
          setWorkModes(p.work_modes || ["remote", "hybrid"]);
          setMinSalary(p.min_salary || 1200000);
          setResumeText(p.resume_text || "");
          setEmailAlertsEnabled(p.email_alerts_enabled ?? true);
        })
        .catch((err) => {
          setErrorMsg("Failed to load profile.");
          console.error(err);
        })
        .finally(() => setLoading(false));
    }
  }, [authLoading, user, token, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const updated = await updateUserProfile(
        {
          current_city: currentCity,
          current_state: currentState,
          preferred_locations: preferredLocations,
          preferred_roles: preferredRoles,
          skills: skills,
          experience_level: experienceLevel,
          years_experience: yearsExperience,
          education: education,
          work_modes: workModes,
          min_salary: minSalary,
          resume_text: resumeText,
          email_alerts_enabled: emailAlertsEnabled,
        },
        token
      );
      setProfile(updated);
      setSuccessMsg("Profile updated successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
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

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <UserIcon className="w-7 h-7 text-cyan-400" />
              Candidate Profile & Preferences
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Your profile guides the automated eligibility matching engine and email alerts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Verified Candidate Account
            </span>
          </div>
        </div>

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

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section: Basic Info */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <UserIcon className="w-4 h-4 text-cyan-400" />
              Basic Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  disabled
                  value={user?.full_name || ""}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-sm text-slate-300 opacity-80 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ""}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-sm text-slate-300 opacity-80 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Current City</label>
                <input
                  type="text"
                  value={currentCity}
                  onChange={(e) => setCurrentCity(e.target.value)}
                  placeholder="e.g. Bengaluru, Hyderabad"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Current State</label>
                <input
                  type="text"
                  value={currentState}
                  onChange={(e) => setCurrentState(e.target.value)}
                  placeholder="e.g. Karnataka, Maharashtra"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Roles & Locations */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Briefcase className="w-4 h-4 text-cyan-400" />
              Target Roles & Locations
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Target Job Titles / Roles
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {preferredRoles.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                  >
                    {r}
                    <button
                      type="button"
                      onClick={() => removeTag(r, preferredRoles, setPreferredRoles)}
                      className="hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(roleInput, preferredRoles, setPreferredRoles);
                      setRoleInput("");
                    }
                  }}
                  placeholder="Type a role (e.g. Backend Lead) and press Enter..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    addTag(roleInput, preferredRoles, setPreferredRoles);
                    setRoleInput("");
                  }}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white"
                >
                  Add
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Preferred Job Locations
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {preferredLocations.map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                  >
                    <MapPin className="w-3 h-3 opacity-70" />
                    {loc}
                    <button
                      type="button"
                      onClick={() => removeTag(loc, preferredLocations, setPreferredLocations)}
                      className="hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={locInput}
                  onChange={(e) => setLocInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(locInput, preferredLocations, setPreferredLocations);
                      setLocInput("");
                    }
                  }}
                  placeholder="Type city or remote and press Enter..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    addTag(locInput, preferredLocations, setPreferredLocations);
                    setLocInput("");
                  }}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Section: Technical Skills */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Code2 className="w-4 h-4 text-cyan-400" />
              Technical Skills & Experience
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Skills</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => removeTag(s, skills, setSkills)}
                      className="hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(skillInput, skills, setSkills);
                      setSkillInput("");
                    }
                  }}
                  placeholder="Add skill (e.g. Next.js, Docker, PostgreSQL) and press Enter..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    addTag(skillInput, skills, setSkills);
                    setSkillInput("");
                  }}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Experience Level</label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="fresher">Fresher (0 yrs)</option>
                  <option value="1-3_years">1-3 Years</option>
                  <option value="3-5_years">3-5 Years</option>
                  <option value="5+_years">5+ Years</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Total Years</label>
                <input
                  type="number"
                  step={0.5}
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Education</label>
                <input
                  type="text"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="Degree, College"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Work Mode & Salary */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <DollarSign className="w-4 h-4 text-cyan-400" />
              Compensation & Preferences
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Minimum Expected CTC (INR)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step={50000}
                    value={minSalary}
                    onChange={(e) => setMinSalary(parseInt(e.target.value) || 0)}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-xs text-cyan-400 font-semibold">
                    ≈ {(minSalary / 100000).toFixed(1)} LPA
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Work Modes</label>
                <div className="flex gap-2">
                  {["remote", "hybrid", "on_site"].map((mode) => {
                    const sel = workModes.includes(mode);
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          if (sel) setWorkModes(workModes.filter((m) => m !== mode));
                          else setWorkModes([...workModes, mode]);
                        }}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize border transition-all ${
                          sel
                            ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {mode.replace("_", "-")} {sel && "✓"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Resume Text */}
            <div className="pt-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Saved Resume Summary / Plain Text
              </label>
              <textarea
                rows={5}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume content for automatic ATS matching against discovered jobs..."
                className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Alert Toggle */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="text-sm font-medium text-white">Daily Email Job Alerts</div>
                  <div className="text-xs text-slate-400">Receive morning digests of newly matching eligible jobs</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={emailAlertsEnabled}
                onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}
