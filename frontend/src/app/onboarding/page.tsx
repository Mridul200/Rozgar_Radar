"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { updateUserProfile, fetchUserProfile, updateAutomationConfig } from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Sparkles,
  MapPin,
  Briefcase,
  Code2,
  GraduationCap,
  DollarSign,
  FileText,
  Bell,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Building2
} from "lucide-react";

const POPULAR_LOCATIONS = [
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Mumbai",
  "Delhi NCR",
  "Chennai",
  "Remote India",
  "APAC/Worldwide"
];

const POPULAR_ROLES = [
  "Full Stack Engineer",
  "Backend Developer",
  "Frontend Engineer",
  "Python Developer",
  "DevOps / Cloud Engineer",
  "AI / Machine Learning Engineer",
  "Data Engineer",
  "Software Engineer"
];

const POPULAR_SKILLS = [
  "Python", "JavaScript", "TypeScript", "React", "Next.js", "Node.js",
  "FastAPI", "SQL", "PostgreSQL", "Docker", "Kubernetes", "AWS",
  "Git", "REST APIs", "GraphQL", "Tailwind CSS", "Microservices"
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form State
  const [currentCity, setCurrentCity] = useState("Bengaluru");
  const [currentState, setCurrentState] = useState("Karnataka");
  const [preferredLocations, setPreferredLocations] = useState<string[]>(["Bengaluru", "Remote India"]);
  const [preferredRoles, setPreferredRoles] = useState<string[]>(["Full Stack Engineer"]);
  const [skills, setSkills] = useState<string[]>(["Python", "React", "TypeScript", "FastAPI"]);
  const [customSkillInput, setCustomSkillInput] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("1-3_years");
  const [yearsExperience, setYearsExperience] = useState<number>(3);
  const [education, setEducation] = useState("B.Tech / B.E. Computer Science");
  const [workModes, setWorkModes] = useState<string[]>(["remote", "hybrid"]);
  const [employmentTypes, setEmploymentTypes] = useState<string[]>(["full_time"]);
  const [minSalary, setMinSalary] = useState<number>(1500000); // 15 LPA
  const [resumeText, setResumeText] = useState("");
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [authLoading, user, router]);

  const toggleItem = (list: string[], item: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (list.includes(item)) {
      setter(list.filter((x) => x !== item));
    } else {
      setter([...list, item]);
    }
  };

  const addCustomSkill = () => {
    if (customSkillInput.trim() && !skills.includes(customSkillInput.trim())) {
      setSkills([...skills, customSkillInput.trim()]);
      setCustomSkillInput("");
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // 1. Save profile
      await updateUserProfile(
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
          employment_types: employmentTypes,
          min_salary: minSalary,
          resume_text: resumeText,
          email_alerts_enabled: emailAlertsEnabled,
          onboarding_completed: true,
        },
        token
      );

      // 2. Initialize automation preferences with chosen roles & skills
      await updateAutomationConfig(
        {
          is_active: emailAlertsEnabled,
          preferred_titles: preferredRoles,
          preferred_locations: preferredLocations,
          preferred_skills: skills,
          work_modes: workModes,
          experience_level: experienceLevel,
          min_salary: minSalary,
        },
        token
      );

      router.push("/dashboard");
    } catch (err) {
      console.error("Error saving onboarding:", err);
      // Still proceed to dashboard if profile saved
      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Step {step} of 4: {step === 1 ? "Target Role & Location" : step === 2 ? "Skills & Background" : step === 3 ? "Work & Compensation" : "Resume & Alerts"}</span>
            <span className="font-semibold text-cyan-400">{step * 25}% Completed</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-indigo-600 transition-all duration-300"
              style={{ width: `${step * 25}%` }}
            />
          </div>
        </div>

        {/* Wizard Container */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-6 animate-in">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Briefcase className="w-6 h-6 text-cyan-400" />
                  What role are you targeting?
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  We use this to classify eligible opportunities across top verified tech feeds.
                </p>
              </div>

              {/* Roles */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Select Target Roles
                </label>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_ROLES.map((role) => {
                    const selected = preferredRoles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleItem(preferredRoles, role, setPreferredRoles)}
                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                          selected
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10"
                            : "bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        {role} {selected && "✓"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Locations */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Preferred Hubs & Remote
                </label>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_LOCATIONS.map((loc) => {
                    const selected = preferredLocations.includes(loc);
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => toggleItem(preferredLocations, loc, setPreferredLocations)}
                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                          selected
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                            : "bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5 inline mr-1 opacity-70" />
                        {loc} {selected && "✓"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Current City</label>
                  <input
                    type="text"
                    value={currentCity}
                    onChange={(e) => setCurrentCity(e.target.value)}
                    placeholder="e.g. Bengaluru"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Current State</label>
                  <input
                    type="text"
                    value={currentState}
                    onChange={(e) => setCurrentState(e.target.value)}
                    placeholder="e.g. Karnataka"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6 animate-in">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Code2 className="w-6 h-6 text-cyan-400" />
                  Your Skills & Experience
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Our matching engine compares your skill graph against ATS requirements.
                </p>
              </div>

              {/* Skills */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Select Core Technical Skills
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {POPULAR_SKILLS.map((sk) => {
                    const selected = skills.includes(sk);
                    return (
                      <button
                        key={sk}
                        type="button"
                        onClick={() => toggleItem(skills, sk, setSkills)}
                        className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                          selected
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                            : "bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        {sk} {selected && "✓"}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSkillInput}
                    onChange={(e) => setCustomSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSkill(); } }}
                    placeholder="Add custom skill (e.g. Rust, Kafka, PyTorch)..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={addCustomSkill}
                    className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 text-white hover:bg-slate-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Experience Level & Education */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Experience Level</label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="fresher">Fresher / Graduate (0 years)</option>
                    <option value="1-3_years">Early Career (1 - 3 years)</option>
                    <option value="3-5_years">Mid-Senior (3 - 5 years)</option>
                    <option value="5+_years">Senior / Lead (5+ years)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Years of Experience</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    step={0.5}
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Highest Education</label>
                <input
                  type="text"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="e.g. B.Tech / B.E. Computer Science, MCA, M.Tech"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-6 animate-in">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-cyan-400" />
                  Work Modes & Compensation
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Specify your ideal setup and baseline salary expectations.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Work Mode Preference
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "remote", label: "Remote", desc: "Work from anywhere in India" },
                    { id: "hybrid", label: "Hybrid", desc: "Mix of office and home" },
                    { id: "on_site", label: "On-Site", desc: "Direct office presence" },
                  ].map((mode) => {
                    const selected = workModes.includes(mode.id);
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => toggleItem(workModes, mode.id, setWorkModes)}
                        className={`p-3.5 rounded-xl text-left border transition-all ${
                          selected
                            ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                            : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <div className="font-semibold text-sm">{mode.label} {selected && "✓"}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{mode.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Employment Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "full_time", label: "Full Time" },
                    { id: "contract", label: "Contract / C2H" },
                    { id: "internship", label: "Internship" },
                  ].map((t) => {
                    const selected = employmentTypes.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleItem(employmentTypes, t.id, setEmploymentTypes)}
                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                          selected
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                            : "bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        {t.label} {selected && "✓"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Minimum Desired CTC (Annual INR)
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      step={50000}
                      value={minSalary}
                      onChange={(e) => setMinSalary(parseInt(e.target.value) || 0)}
                      className="w-full pl-8 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-cyan-400">
                    ≈ {(minSalary / 100000).toFixed(1)} LPA
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-6 animate-in">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <FileText className="w-6 h-6 text-cyan-400" />
                  Resume & Daily Automation
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Paste your resume text to enable instant ATS matching and activate daily verified job alerts.
                </p>
              </div>

              {/* Resume Text */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Paste Resume Plain Text (or summary)
                </label>
                <textarea
                  rows={6}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your resume bullet points, work history, skills, and projects here... (You can also build one from scratch in the AI Resume Builder)"
                  className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed"
                />
              </div>

              {/* Alert Toggle */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 border border-cyan-500/20 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Bell className="w-4 h-4 text-cyan-400" />
                    Automated Daily Eligible Job Digest
                  </div>
                  <p className="text-xs text-slate-400">
                    Receive newly discovered, deduplicated jobs matching your {preferredRoles.join(", ") || "role"} preferences every morning.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlertsEnabled}
                  onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                  className="w-5 h-5 accent-cyan-500 rounded mt-1 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-800/80 mt-8">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous Step
              </button>
            ) : <div />}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-lg shadow-cyan-500/25 transition-all"
              >
                Next Step
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={handleFinish}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Activating Agent...
                  </>
                ) : (
                  <>
                    Complete & Enter Dashboard
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
