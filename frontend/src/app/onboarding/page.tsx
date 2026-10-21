"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { updateUserProfile, updateAutomationConfig } from "@/lib/api";
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
  Check,
  Plus,
  X,
  Compass,
  Laptop,
} from "lucide-react";

const POPULAR_LOCATIONS = [
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Mumbai",
  "Delhi NCR",
  "Chennai",
  "Remote India",
  "APAC/Worldwide",
];

const POPULAR_ROLES = [
  "Full Stack Engineer",
  "Backend Developer",
  "Frontend Engineer",
  "Python Developer",
  "DevOps / Cloud Engineer",
  "AI / Machine Learning Engineer",
  "Data Engineer",
  "Software Engineer",
];

const POPULAR_SKILLS = [
  "Python",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "FastAPI",
  "SQL",
  "PostgreSQL",
  "Docker",
  "Kubernetes",
  "AWS",
  "Git",
  "REST APIs",
  "Tailwind CSS",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form State
  const [currentCity, setCurrentCity] = useState("Bengaluru");
  const [currentState, setCurrentState] = useState("Karnataka");
  const [preferredLocations, setPreferredLocations] = useState<string[]>([
    "Bengaluru",
    "Remote India",
  ]);
  const [preferredRoles, setPreferredRoles] = useState<string[]>([
    "Full Stack Engineer",
  ]);
  const [skills, setSkills] = useState<string[]>([
    "Python",
    "React",
    "TypeScript",
    "FastAPI",
  ]);
  const [customSkillInput, setCustomSkillInput] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("1-3_years");
  const [yearsExperience, setYearsExperience] = useState<number>(3);
  const [education, setEducation] = useState("B.Tech / B.E. Computer Science");
  const [workModes, setWorkModes] = useState<string[]>(["remote", "hybrid"]);
  const [employmentTypes, setEmploymentTypes] = useState<string[]>([
    "full_time",
  ]);
  const [minSalary, setMinSalary] = useState<number>(1500000); // 15 LPA
  const [resumeText, setResumeText] = useState("");
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [authLoading, user, router]);

  const toggleItem = (
    list: string[],
    item: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
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
      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatSalaryLPA = (num: number) => {
    const lpa = num / 100000;
    return `₹${lpa.toFixed(1)} LPA`;
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-background text-foreground transition-colors duration-200 py-6 px-4 sm:px-6">
      {/* Standalone Minimal Top Header */}
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.jpg"
            alt="Rozgar Radar"
            className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 border border-border shadow-sm"
          />
          <div>
            <span className="font-extrabold text-sm tracking-tight text-foreground">
              Rozgar Radar
            </span>
            <span className="block text-[10px] text-muted-foreground -mt-0.5">
              Candidate Profile Setup
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            Step {step} of 4
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
            {step * 25}%
          </span>
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="flex-1 flex flex-col items-center justify-center py-6 w-full">
        {/* Progress Tracker Bar */}
        <div className="w-full max-w-2xl mb-6">
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden border border-border">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${step * 25}%` }}
            />
          </div>
        </div>

        {/* Wizard Card Container */}
        <div className="w-full max-w-2xl bg-card border border-border rounded-2xl sm:rounded-3xl p-6 sm:p-9 shadow-xl relative animate-in fade-in duration-200">
          {/* ========================================================== */}
          {/* STEP 1: TARGET ROLE & LOCATIONS                            */}
          {/* ========================================================== */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
                  <Briefcase className="w-4 h-4" />
                  <span>Target Roles & Location</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  What opportunities are you looking for?
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Select your primary job titles and preferred employment hubs.
                </p>
              </div>

              {/* Roles */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Target Job Titles
                </label>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_ROLES.map((role) => {
                    const selected = preferredRoles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleItem(preferredRoles, role, setPreferredRoles)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selected
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted/60 text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {selected && <Check className="w-3.5 h-3.5" />}
                        <span>{role}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Locations */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Preferred Cities / Remote
                </label>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_LOCATIONS.map((loc) => {
                    const selected = preferredLocations.includes(loc);
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => toggleItem(preferredLocations, loc, setPreferredLocations)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selected
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted/60 text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {selected && <Check className="w-3.5 h-3.5" />}
                        <span>{loc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current City & State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Current City</label>
                  <input
                    type="text"
                    value={currentCity}
                    onChange={(e) => setCurrentCity(e.target.value)}
                    placeholder="e.g. Bengaluru"
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-foreground text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Current State</label>
                  <input
                    type="text"
                    value={currentState}
                    onChange={(e) => setCurrentState(e.target.value)}
                    placeholder="e.g. Karnataka"
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-foreground text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* STEP 2: SKILLS & BACKGROUND                                */}
          {/* ========================================================== */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
                  <Code2 className="w-4 h-4" />
                  <span>Technical Qualifications</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Highlight your core skills
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  ATS matching checks your skills against requirements to calculate candidate fit.
                </p>
              </div>

              {/* Skills Tag Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Select Core Technologies
                </label>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto scrollbar-none p-1">
                  {POPULAR_SKILLS.map((skill) => {
                    const selected = skills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleItem(skills, skill, setSkills)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selected
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted/60 text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {selected && <Check className="w-3.5 h-3.5" />}
                        <span>{skill}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Add Custom Skill */}
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={customSkillInput}
                    onChange={(e) => setCustomSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomSkill();
                      }
                    }}
                    placeholder="Add custom skill (e.g. Redis, GCP, Flutter)..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-background border border-border text-foreground text-xs outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={addCustomSkill}
                    className="px-4 py-2 rounded-xl bg-muted border border-border hover:bg-accent text-xs font-semibold text-foreground flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>

              {/* Experience Level & Education */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Experience Tier</label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs outline-none focus:border-primary"
                  >
                    <option value="entry">Fresher / Graduate (0-1 yrs)</option>
                    <option value="1-3_years">Junior Developer (1-3 yrs)</option>
                    <option value="3-5_years">Mid-Level Engineer (3-5 yrs)</option>
                    <option value="senior">Senior Engineer (5-8 yrs)</option>
                    <option value="lead_architect">Lead / Architect (8+ yrs)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Highest Degree</label>
                  <input
                    type="text"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    placeholder="e.g. B.Tech / B.E. / BCA / MCA"
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-foreground text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* STEP 3: WORK MODE & COMPENSATION                           */}
          {/* ========================================================== */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
                  <Laptop className="w-4 h-4" />
                  <span>Work Modes & Compensation</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Your work environment preferences
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Filter out roles that don&apos;t meet your remote preferences or salary expectations.
                </p>
              </div>

              {/* Work Mode Cards */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Preferred Work Modes
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: "remote", label: "Remote", desc: "Work from anywhere in India" },
                    { id: "hybrid", label: "Hybrid", desc: "Mix of office and home" },
                    { id: "on_site", label: "On-Site", desc: "In-office presence" },
                  ].map((mode) => {
                    const selected = workModes.includes(mode.id);
                    return (
                      <div
                        key={mode.id}
                        onClick={() => toggleItem(workModes, mode.id, setWorkModes)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          selected
                            ? "bg-primary/10 border-primary text-foreground shadow-sm"
                            : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold text-xs text-foreground">
                          <span>{mode.label}</span>
                          {selected && <Check className="w-4 h-4 text-primary" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">{mode.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Salary Expectation Slider */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Minimum Target Salary
                  </label>
                  <span className="text-sm font-bold text-primary">
                    {formatSalaryLPA(minSalary)}
                  </span>
                </div>
                <input
                  type="range"
                  min={300000}
                  max={6000000}
                  step={100000}
                  value={minSalary}
                  onChange={(e) => setMinSalary(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>₹3 LPA</span>
                  <span>₹25 LPA</span>
                  <span>₹60+ LPA</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* STEP 4: RESUME & DAILY DIGEST                              */}
          {/* ========================================================== */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
                  <Bell className="w-4 h-4" />
                  <span>Resume & Automated Alerts</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Finalize your job-search engine
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Paste your resume text to enable instant ATS matching and personalized morning digests.
                </p>
              </div>

              {/* Resume Text Area */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Resume Summary / Text (Optional)
                  </label>
                  <span className="text-[11px] text-muted-foreground">Can be edited later</span>
                </div>
                <textarea
                  rows={4}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your past roles, achievements, or summary to automatically calculate ATS matches..."
                  className="w-full p-3 rounded-xl bg-background border border-border text-foreground text-xs leading-relaxed outline-none focus:border-primary"
                />
              </div>

              {/* Email Alerts Toggle */}
              <div className="p-4 rounded-xl border border-border bg-muted/30 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-xs text-foreground">
                      Daily Automated Job Digest
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Receive verified new tech openings matching your target roles and salary threshold
                    directly in your inbox every morning.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={emailAlertsEnabled}
                  onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary cursor-pointer mt-1"
                />
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="pt-6 mt-6 border-t border-border flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={handleFinish}
                className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Setup & Launch Dashboard</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Subtle Skip Link */}
        <div className="mt-4 text-center">
          <Link
            href="/dashboard"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
          >
            Skip for now & go to Dashboard &rarr;
          </Link>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full text-center py-2 text-[11px] text-muted-foreground">
        © 2026 Rozgar Radar. Verified Tech Career Intelligence.
      </footer>
    </div>
  );
}
