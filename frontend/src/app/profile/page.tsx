"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchUserProfile, updateUserProfile } from "@/lib/api";
import { UserProfile } from "@/types/user";
import { AppSidebarLayout } from "@/components/layout/AppSidebarLayout";
import {
  User as UserIcon,
  MapPin,
  Briefcase,
  Code2,
  DollarSign,
  Bell,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
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
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppSidebarLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
              <UserIcon className="w-7 h-7 text-primary" />
              Candidate Profile & Preferences
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your profile guides the automated eligibility matching engine and email alerts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
              Verified Candidate Account
            </span>
          </div>
        </div>

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2 animate-in">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2 animate-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section: Basic Info */}
          <div className="rounded-2xl p-6 border border-border bg-card space-y-4 shadow-xs">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <UserIcon className="w-4 h-4 text-primary" />
              Basic Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Full Name</label>
                <input
                  type="text"
                  disabled
                  value={user?.full_name || ""}
                  className="w-full px-3.5 py-2 rounded-xl bg-muted border border-border text-sm text-muted-foreground opacity-80 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ""}
                  className="w-full px-3.5 py-2 rounded-xl bg-muted border border-border text-sm text-muted-foreground opacity-80 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Current City</label>
                <input
                  type="text"
                  value={currentCity}
                  onChange={(e) => setCurrentCity(e.target.value)}
                  placeholder="e.g. Bengaluru, Hyderabad"
                  className="w-full px-3.5 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Current State</label>
                <input
                  type="text"
                  value={currentState}
                  onChange={(e) => setCurrentState(e.target.value)}
                  placeholder="e.g. Karnataka, Maharashtra"
                  className="w-full px-3.5 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Section: Roles & Locations */}
          <div className="rounded-2xl p-6 border border-border bg-card space-y-4 shadow-xs">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <Briefcase className="w-4 h-4 text-primary" />
              Target Roles & Locations
            </h2>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Target Job Titles / Roles
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {preferredRoles.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-primary/15 text-primary border border-primary/30"
                  >
                    {r}
                    <button
                      type="button"
                      onClick={() => removeTag(r, preferredRoles, setPreferredRoles)}
                      className="hover:opacity-75 cursor-pointer"
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
                  className="flex-1 px-3.5 py-2 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => {
                    addTag(roleInput, preferredRoles, setPreferredRoles);
                    setRoleInput("");
                  }}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Preferred Job Locations
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {preferredLocations.map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[#21A67A]/15 text-[#21A67A] border border-[#21A67A]/30"
                  >
                    <MapPin className="w-3 h-3 opacity-70" />
                    {loc}
                    <button
                      type="button"
                      onClick={() => removeTag(loc, preferredLocations, setPreferredLocations)}
                      className="hover:opacity-75 cursor-pointer"
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
                  className="flex-1 px-3.5 py-2 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => {
                    addTag(locInput, preferredLocations, setPreferredLocations);
                    setLocInput("");
                  }}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Section: Technical Skills */}
          <div className="rounded-2xl p-6 border border-border bg-card space-y-4 shadow-xs">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <Code2 className="w-4 h-4 text-primary" />
              Technical Skills & Experience
            </h2>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Skills</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-primary/15 text-primary border border-primary/30"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => removeTag(s, skills, setSkills)}
                      className="hover:opacity-75 cursor-pointer"
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
                  className="flex-1 px-3.5 py-2 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => {
                    addTag(skillInput, skills, setSkills);
                    setSkillInput("");
                  }}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Experience Level</label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="fresher">Fresher (0 yrs)</option>
                  <option value="1-3_years">1-3 Years</option>
                  <option value="3-5_years">3-5 Years</option>
                  <option value="5+_years">5+ Years</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Total Years</label>
                <input
                  type="number"
                  step={0.5}
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Education</label>
                <input
                  type="text"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="Degree, College"
                  className="w-full px-3.5 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Section: Work Mode & Salary */}
          <div className="rounded-2xl p-6 border border-border bg-card space-y-4 shadow-xs">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <DollarSign className="w-4 h-4 text-primary" />
              Compensation & Preferences
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Minimum Expected CTC (INR)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step={50000}
                    value={minSalary}
                    onChange={(e) => setMinSalary(parseInt(e.target.value) || 0)}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                  <span className="text-xs text-primary font-semibold">
                    ≈ {(minSalary / 100000).toFixed(1)} LPA
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Work Modes</label>
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
                        className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize border transition-all cursor-pointer ${
                          sel
                            ? "bg-primary/15 border-primary/40 text-primary font-bold"
                            : "bg-card border-border text-muted-foreground hover:text-foreground"
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
              <label className="block text-xs font-medium text-foreground mb-1">
                Saved Resume Summary / Plain Text
              </label>
              <textarea
                rows={5}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume content for automatic ATS matching against discovered jobs..."
                className="w-full p-3.5 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>

            {/* Alert Toggle */}
            <div className="p-4 rounded-xl bg-muted/60 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-sm font-medium text-foreground">Daily Email Job Alerts</div>
                  <div className="text-xs text-muted-foreground">Receive morning digests of newly matching eligible jobs</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={emailAlertsEnabled}
                onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                className="w-5 h-5 accent-primary rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white bg-primary hover:bg-[--primary-hover] shadow-sm transition-all disabled:opacity-50 cursor-pointer"
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
      </div>
    </AppSidebarLayout>
  );
}
