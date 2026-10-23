"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  fetchUserProfile,
  updateUserProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  uploadProfileResume,
} from "@/lib/api";
import {
  UserProfile,
  EducationDetails,
  EmploymentItem,
  CareerPreferences,
  OptionalProfileDetails,
} from "@/types/user";
import { isValidIndianMobile, MOBILE_ERROR_MESSAGE, normalizeIndianMobile } from "@/lib/email-validation";
import { AppSidebarLayout } from "@/components/layout/AppSidebarLayout";
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Sparkles,
  Camera,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  DollarSign,
  Building,
  Calendar,
  Lock,
  Globe,
  Link2,
  Award,
  Layers,
  Code,
  Check,
  ArrowRight,
  ShieldCheck,
  Sliders,
  FolderGit2,
} from "lucide-react";

const TOP_INDIAN_CITIES = [
  "Bengaluru",
  "Delhi NCR",
  "Mumbai",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Kolkata",
  "Remote / Pan-India",
];

const QUALIFICATIONS = [
  "Post Graduation / Master's",
  "Graduation / Bachelor's",
  "Diploma",
  "Class XII (Higher Secondary)",
  "Class X (Secondary)",
];

const POPULAR_SKILLS = [
  "React",
  "Next.js",
  "TypeScript",
  "JavaScript",
  "Python",
  "Node.js",
  "FastAPI",
  "SQL",
  "PostgreSQL",
  "Docker",
  "Tailwind CSS",
  "Git",
  "AWS",
  "MongoDB",
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // File input ref for photo
  const photoInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  // Core profile state
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [currentCity, setCurrentCity] = useState("");
  const [currentState, setCurrentState] = useState("");
  const [workStatus, setWorkStatus] = useState<"fresher" | "experienced">("fresher");

  // Education
  const [education, setEducation] = useState<EducationDetails>({
    highest_qualification: "",
    degree: "",
    specialization: "",
    college: "",
    passing_year: "",
    course_type: "Full-time",
  });

  // Skills
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  // Employment
  const [employmentHistory, setEmploymentHistory] = useState<EmploymentItem[]>([]);

  // Career Preferences
  const [careerPrefs, setCareerPrefs] = useState<CareerPreferences>({
    industry: "",
    department: "",
    role_category: "",
    desired_job_type: "Permanent",
    employment_type: "Full Time",
    preferred_locations: [],
    expected_salary: "",
    preferred_shift: "Day Shift",
  });
  const [prefLocationInput, setPrefLocationInput] = useState("");
  const [targetRoleInput, setTargetRoleInput] = useState("");
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [workModes, setWorkModes] = useState<string[]>(["remote", "hybrid"]);
  const [minSalary, setMinSalary] = useState<number>(1200000);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);

  // Resume
  const [resumeFilename, setResumeFilename] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState("");

  // Optional Details & Collapsible Sections
  const [optionalDetails, setOptionalDetails] = useState<OptionalProfileDetails>({
    summary: "",
    headline: "",
    it_skills: [],
    projects: [],
    internships: [],
    certifications: [],
    linkedin: "",
    github: "",
    portfolio: "",
    dob: "",
    gender: "",
    permanent_address: "",
    languages: [],
    differently_abled: "No",
    work_permit: "India",
  });

  // Collapsible accordion open states
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    summary: false,
    itSkills: false,
    projects: false,
    internships: false,
    certifications: false,
    social: false,
    personal: false,
  });

  const toggleSection = (sec: string) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Profile completion calculation
  const computeCompletion = () => {
    let score = 0;
    // 1. Basic details (20%)
    if (fullName.trim() && email.trim() && mobileNumber.trim() && currentCity.trim()) {
      score += 20;
    } else if (email.trim() && (fullName.trim() || currentCity.trim())) {
      score += 10;
    }

    // 2. Education (20%)
    if (education.degree?.trim() && education.college?.trim()) {
      score += 20;
    } else if (education.degree?.trim() || education.highest_qualification?.trim()) {
      score += 10;
    }

    // 3. Key Skills (20%)
    if (skills.length >= 3) {
      score += 20;
    } else if (skills.length > 0) {
      score += 10;
    }

    // 4. Career Preferences (15%)
    if (targetRoles.length > 0 || (careerPrefs.preferred_locations && careerPrefs.preferred_locations.length > 0)) {
      score += 15;
    }

    // 5. Experience / Fresher readiness (15%)
    if (workStatus === "fresher") {
      score += 15; // Freshers earn 15% automatically
    } else if (employmentHistory.length > 0 && employmentHistory.some((e) => e.company?.trim())) {
      score += 15;
    }

    // 6. Resume (10%)
    if (resumeFilename || resumeText.trim()) {
      score += 10;
    }

    return Math.min(100, score);
  };

  const completionPct = computeCompletion();

  // Load profile from API
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }

    if (token) {
      setLoading(true);
      fetchUserProfile(token)
        .then((p) => {
          setPhotoUrl(p.profile_photo_url || null);
          setFullName(user?.full_name || "");
          setEmail(user?.email || "");
          setMobileNumber(p.mobile_number || "");
          setCurrentCity(p.current_city || "");
          setCurrentState(p.current_state || "");
          setWorkStatus((p.work_status as "fresher" | "experienced") || "fresher");

          if (p.education_details) {
            setEducation({
              highest_qualification: p.education_details.highest_qualification || "",
              degree: p.education_details.degree || "",
              specialization: p.education_details.specialization || "",
              college: p.education_details.college || "",
              passing_year: p.education_details.passing_year || "",
              course_type: p.education_details.course_type || "Full-time",
            });
          } else if (p.education) {
            setEducation((prev) => ({ ...prev, degree: p.education || "" }));
          }

          setSkills(p.skills || []);
          setEmploymentHistory(p.employment_history || []);

          if (p.career_preferences) {
            setCareerPrefs(p.career_preferences);
          }
          if (p.preferred_roles && p.preferred_roles.length > 0) {
            setTargetRoles(p.preferred_roles);
          }
          if (p.preferred_locations && p.preferred_locations.length > 0) {
            setCareerPrefs((prev) => ({ ...prev, preferred_locations: p.preferred_locations }));
          }

          setWorkModes(p.work_modes || ["remote", "hybrid"]);
          setMinSalary(p.min_salary || 1200000);
          setResumeFilename(p.resume_filename || null);
          setResumeText(p.resume_text || "");
          setEmailAlertsEnabled(p.email_alerts_enabled ?? true);

          if (p.optional_details) {
            setOptionalDetails(p.optional_details);
          }
        })
        .catch((err) => {
          console.error("Failed to load profile:", err);
          setErrorMsg("Could not load existing profile. Please refresh or try again.");
        })
        .finally(() => setLoading(false));
    }
  }, [authLoading, user, token, router]);

  // Handle Photo Upload
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg("Profile photo must be smaller than 3 MB.");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setErrorMsg("Please upload a JPG, PNG, or WebP photo.");
      return;
    }

    try {
      setUploadingPhoto(true);
      setErrorMsg(null);
      const res = await uploadProfilePhoto(file, token);
      setPhotoUrl(res.photo_url);
      setSuccessMsg("Profile photo updated successfully!");
      if (refreshUser) refreshUser();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload photo.");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  // Handle Photo Removal
  const handleRemovePhoto = async () => {
    try {
      setUploadingPhoto(true);
      setErrorMsg(null);
      await deleteProfilePhoto(token);
      setPhotoUrl(null);
      setSuccessMsg("Profile photo removed.");
      if (refreshUser) refreshUser();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to remove photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle Resume Upload & Extraction
  const handleResumeSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Resume must be smaller than 5 MB.");
      return;
    }

    try {
      setUploadingResume(true);
      setErrorMsg(null);
      const res = await uploadProfileResume(file, token);
      setResumeFilename(file.name);
      if (res.profile) {
        if (res.profile.skills && res.profile.skills.length > 0) {
          setSkills((prev) => Array.from(new Set([...prev, ...res.profile.skills])));
        }
        if (res.profile.education_details?.degree && !education.degree) {
          setEducation((prev) => ({
            ...prev,
            degree: res.profile.education_details?.degree || prev.degree,
            college: res.profile.education_details?.college || prev.college,
          }));
        }
      }
      setSuccessMsg(`Resume "${file.name}" uploaded and parsed successfully!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to parse resume.");
    } finally {
      setUploadingResume(false);
      if (resumeInputRef.current) resumeInputRef.current.value = "";
    }
  };

  // Skill tag add/remove
  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkillInput("");
      return;
    }
    setSkills([...skills, trimmed]);
    setSkillInput("");
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  // Preferred Location add/remove
  const handleAddLocation = (loc: string) => {
    const trimmed = loc.trim();
    if (!trimmed) return;
    const currentLocs = careerPrefs.preferred_locations || [];
    if (!currentLocs.includes(trimmed)) {
      setCareerPrefs({ ...careerPrefs, preferred_locations: [...currentLocs, trimmed] });
    }
    setPrefLocationInput("");
  };

  const handleRemoveLocation = (loc: string) => {
    const currentLocs = careerPrefs.preferred_locations || [];
    setCareerPrefs({
      ...careerPrefs,
      preferred_locations: currentLocs.filter((l) => l !== loc),
    });
  };

  // Target Roles add/remove
  const handleAddRole = (role: string) => {
    const trimmed = role.trim();
    if (!trimmed) return;
    if (!targetRoles.includes(trimmed)) {
      setTargetRoles([...targetRoles, trimmed]);
    }
    setTargetRoleInput("");
  };

  const handleRemoveRole = (role: string) => {
    setTargetRoles(targetRoles.filter((r) => r !== role));
  };

  // Employment item helpers
  const handleAddEmploymentItem = () => {
    setEmploymentHistory([
      ...employmentHistory,
      {
        id: `emp_${Date.now()}`,
        company: "",
        designation: "",
        joining_date: "",
        last_working_date: "",
        current_employment_status: "Currently Employed",
        notice_period: "30 Days",
        current_salary: "",
        hide_salary_publicly: true,
      },
    ]);
  };

  const handleUpdateEmploymentItem = (index: number, field: keyof EmploymentItem, val: any) => {
    const updated = [...employmentHistory];
    updated[index] = { ...updated[index], [field]: val };
    setEmploymentHistory(updated);
  };

  const handleRemoveEmploymentItem = (index: number) => {
    setEmploymentHistory(employmentHistory.filter((_, i) => i !== index));
  };

  // Save whole profile
  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    // Validate mobile number if present
    if (mobileNumber && !isValidIndianMobile(mobileNumber)) {
      setErrorMsg(MOBILE_ERROR_MESSAGE);
      setSaving(false);
      return;
    }

    try {
      const payload: Partial<UserProfile> = {
        mobile_number: normalizeIndianMobile(mobileNumber),
        current_city: currentCity.trim(),
        current_state: currentState.trim(),
        work_status: workStatus,
        profile_photo_url: photoUrl || undefined,
        education_details: education,
        skills: skills,
        employment_history: workStatus === "fresher" ? [] : employmentHistory,
        career_preferences: {
          ...careerPrefs,
          preferred_locations: careerPrefs.preferred_locations,
        },
        preferred_roles: targetRoles,
        preferred_locations: careerPrefs.preferred_locations,
        work_modes: workModes,
        min_salary: minSalary,
        resume_filename: resumeFilename || undefined,
        resume_text: resumeText,
        email_alerts_enabled: emailAlertsEnabled,
        optional_details: optionalDetails,
        profile_completion_pct: completionPct,
      };

      await updateUserProfile(payload, token);
      if (refreshUser) await refreshUser();
      setSuccessMsg("Candidate profile updated successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Next suggested actions for completion
  const suggestions: string[] = [];
  if (!education.degree) suggestions.push("Add your course or degree (+20%)");
  if (skills.length < 3) suggestions.push("Add at least 3 key skills (+20%)");
  if (!mobileNumber || !currentCity) suggestions.push("Provide mobile number & current city (+20%)");
  if (!resumeFilename) suggestions.push("Upload your PDF resume (+10%)");
  if (workStatus === "experienced" && employmentHistory.length === 0)
    suggestions.push("Add your current or past company (+15%)");

  return (
    <AppSidebarLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-16">
        {/* Header Profile Identity Strip */}
        <div className="relative rounded-3xl p-6 sm:p-8 border border-border bg-card shadow-sm overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-0" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            {/* Left: Avatar + Identity Info */}
            <div className="flex items-start sm:items-center gap-5">
              {/* Circular Avatar Container */}
              <div className="relative shrink-0 group">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-3 border-primary/30 overflow-hidden bg-muted flex items-center justify-center shadow-md">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={fullName || "Candidate"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-extrabold uppercase">
                      {fullName ? fullName.charAt(0) : "U"}
                    </div>
                  )}

                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Photo Action Overlay / Controls */}
                <div className="absolute -bottom-1 -right-1 flex items-center gap-1">
                  <input
                    type="file"
                    ref={photoInputRef}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    title="Upload or change profile photo"
                    className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:opacity-90 transition-all cursor-pointer border-2 border-card"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={uploadingPhoto}
                      title="Remove profile photo"
                      className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md hover:bg-rose-600 transition-all cursor-pointer border-2 border-card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* User Bio Details */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight truncate">
                    {fullName || "Candidate Profile"}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Email
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 capitalize">
                    <Briefcase className="w-3.5 h-3.5" />
                    {workStatus}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground/70" />
                    {email}
                  </span>
                  {mobileNumber && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground/70" />
                      +91 {mobileNumber}
                    </span>
                  )}
                  {currentCity && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground/70" />
                      {currentCity}
                    </span>
                  )}
                </div>

                {optionalDetails.headline && (
                  <p className="text-xs sm:text-sm font-medium text-foreground/80 line-clamp-1 pt-1">
                    {optionalDetails.headline}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Dynamic Profile Completion Widget */}
            <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-center gap-2 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 shrink-0">
              <div className="flex items-center gap-3">
                {/* SVG Progress Ring */}
                <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-muted/50"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-primary transition-all duration-700 ease-out"
                      strokeDasharray={`${completionPct}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-xs font-bold text-foreground">
                    {completionPct}%
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground">Profile Strength</span>
                  <span className="text-[11px] text-muted-foreground">
                    {completionPct >= 80 ? "All-Star Profile" : completionPct >= 50 ? "Intermediate" : "Needs Attention"}
                  </span>
                </div>
              </div>

              {suggestions.length > 0 && (
                <p className="text-[11px] text-primary font-medium max-w-[200px] text-left md:text-right leading-tight mt-1">
                  Next: {suggestions[0]}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Global Feedback Notifications */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2.5 animate-in">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2.5 animate-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Main Editable Cards */}
        <form onSubmit={handleSaveAll} className="space-y-6">
          {/* CARD 1: Basic Information */}
          <div className="rounded-3xl p-6 sm:p-7 border border-border bg-card shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2.5">
                <UserIcon className="w-4 h-4 text-primary" />
                Basic Information
              </h2>
              <span className="text-xs text-muted-foreground">Required for recruiter matching</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Email Address (Verified)
                </label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-muted-foreground opacity-80 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Mobile Number (10 digits) <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9876543210"
                    className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Work Experience Status <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWorkStatus("fresher")}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      workStatus === "fresher"
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "bg-card border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    Fresher
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkStatus("experienced")}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      workStatus === "experienced"
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "bg-card border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    Experienced
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="block text-xs font-medium text-foreground">
                  Current City <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={currentCity}
                  onChange={(e) => setCurrentCity(e.target.value)}
                  placeholder="e.g. Bengaluru, Pune, Hyderabad"
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {TOP_INDIAN_CITIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCurrentCity(c)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        currentCity === c
                          ? "bg-primary/15 text-primary border-primary/40 font-semibold"
                          : "bg-card border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: Education Details */}
          <div className="rounded-3xl p-6 sm:p-7 border border-border bg-card shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2.5">
                <GraduationCap className="w-4 h-4 text-primary" />
                Education Details
              </h2>
              <span className="text-xs text-muted-foreground">Academic background</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Highest Qualification
                </label>
                <select
                  value={education.highest_qualification || ""}
                  onChange={(e) =>
                    setEducation({ ...education, highest_qualification: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Select Qualification</option>
                  {QUALIFICATIONS.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Course / Degree <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={education.degree || ""}
                  onChange={(e) => setEducation({ ...education, degree: e.target.value })}
                  placeholder="e.g. B.Tech Computer Science, BCA, MBA"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Specialization
                </label>
                <input
                  type="text"
                  value={education.specialization || ""}
                  onChange={(e) => setEducation({ ...education, specialization: e.target.value })}
                  placeholder="e.g. Information Technology, AI & ML"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  College / Institute / University
                </label>
                <input
                  type="text"
                  value={education.college || ""}
                  onChange={(e) => setEducation({ ...education, college: e.target.value })}
                  placeholder="e.g. National Institute of Technology, Delhi University"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Passing Year
                </label>
                <select
                  value={education.passing_year || ""}
                  onChange={(e) => setEducation({ ...education, passing_year: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Select Year</option>
                  {Array.from({ length: 45 }, (_, i) => 2030 - i).map((y) => (
                    <option key={y} value={y.toString()}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Course Type
                </label>
                <div className="flex gap-2">
                  {(["Full-time", "Part-time", "Distance Learning"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEducation({ ...education, course_type: type })}
                      className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                        education.course_type === type
                          ? "bg-primary/15 border-primary/40 text-primary font-bold"
                          : "bg-card border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3: Key Skills */}
          <div className="rounded-3xl p-6 sm:p-7 border border-border bg-card shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2.5">
                <Code className="w-4 h-4 text-primary" />
                Key Skills ({skills.length})
              </h2>
              <span className="text-xs text-muted-foreground">Highlight core technical proficiencies</span>
            </div>

            {/* Current skill tags */}
            <div className="flex flex-wrap gap-2 min-h-10 p-3 rounded-2xl bg-muted/40 border border-border/80">
              {skills.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No skills added yet. Type a skill below or tap any suggested chip to add.
                </p>
              ) : (
                skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-primary/15 text-primary border border-primary/30 shadow-2xs"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(s)}
                      className="hover:text-destructive hover:scale-110 transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Skill input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill(skillInput);
                  }
                }}
                placeholder="Type skill name (e.g. Next.js, Docker, FastAPI) and press Enter..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => handleAddSkill(skillInput)}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-primary text-white hover:bg-[--primary-hover] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* Popular skill suggestions */}
            <div>
              <p className="text-[11px] text-muted-foreground font-medium mb-1.5">
                Popular suggestions:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_SKILLS.map((item) => {
                  const has = skills.some((s) => s.toLowerCase() === item.toLowerCase());
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={has}
                      onClick={() => handleAddSkill(item)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                        has
                          ? "bg-muted text-muted-foreground/60 border-transparent cursor-not-allowed"
                          : "bg-card border-border hover:border-primary/40 hover:text-primary text-foreground"
                      }`}
                    >
                      {has && <Check className="w-3 h-3 text-emerald-500" />}
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CARD 4: Employment History (Conditional on Fresher vs. Experienced) */}
          <div className="rounded-3xl p-6 sm:p-7 border border-border bg-card shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2.5">
                <Briefcase className="w-4 h-4 text-primary" />
                Employment History
              </h2>
              {workStatus === "experienced" && (
                <button
                  type="button"
                  onClick={handleAddEmploymentItem}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Company
                </button>
              )}
            </div>

            {workStatus === "fresher" ? (
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Fresher Candidate Status Active</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    As a fresher, you are not required to provide prior work experience. Rozgar Radar highlights your academic qualifications, verified projects, and skills to hiring managers looking for fresh talent.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {employmentHistory.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-muted/40 border border-dashed border-border text-center space-y-2">
                    <Building className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="text-xs text-muted-foreground">
                      No employment records added yet. Add your current or previous roles.
                    </p>
                    <button
                      type="button"
                      onClick={handleAddEmploymentItem}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:opacity-90 transition-all cursor-pointer"
                    >
                      Add Employment Record
                    </button>
                  </div>
                ) : (
                  employmentHistory.map((emp, idx) => (
                    <div
                      key={emp.id || idx}
                      className="p-5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-4 relative"
                    >
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <span className="text-xs font-bold text-foreground">
                          Experience #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEmploymentItem(idx)}
                          className="text-xs text-destructive hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Company Name <span className="text-destructive">*</span>
                          </label>
                          <input
                            type="text"
                            value={emp.company}
                            onChange={(e) =>
                              handleUpdateEmploymentItem(idx, "company", e.target.value)
                            }
                            placeholder="e.g. Tata Consultancy Services"
                            className="w-full px-3.5 py-2 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Designation / Job Title <span className="text-destructive">*</span>
                          </label>
                          <input
                            type="text"
                            value={emp.designation}
                            onChange={(e) =>
                              handleUpdateEmploymentItem(idx, "designation", e.target.value)
                            }
                            placeholder="e.g. Senior Frontend Engineer"
                            className="w-full px-3.5 py-2 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Joining Date
                          </label>
                          <input
                            type="date"
                            value={emp.joining_date}
                            onChange={(e) =>
                              handleUpdateEmploymentItem(idx, "joining_date", e.target.value)
                            }
                            className="w-full px-3.5 py-2 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Notice Period
                          </label>
                          <select
                            value={emp.notice_period || "30 Days"}
                            onChange={(e) =>
                              handleUpdateEmploymentItem(idx, "notice_period", e.target.value)
                            }
                            className="w-full px-3.5 py-2 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
                          >
                            <option value="Immediate">Immediate / Serving Notice</option>
                            <option value="15 Days">15 Days</option>
                            <option value="30 Days">30 Days</option>
                            <option value="60 Days">60 Days</option>
                            <option value="90 Days">90 Days</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Annual Fixed CTC (INR / LPA)
                          </label>
                          <input
                            type="text"
                            value={emp.current_salary || ""}
                            onChange={(e) =>
                              handleUpdateEmploymentItem(idx, "current_salary", e.target.value)
                            }
                            placeholder="e.g. 12 LPA or 12,00,000"
                            className="w-full px-3.5 py-2 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-5">
                          <input
                            type="checkbox"
                            id={`hide_salary_${idx}`}
                            checked={emp.hide_salary_publicly ?? true}
                            onChange={(e) =>
                              handleUpdateEmploymentItem(idx, "hide_salary_publicly", e.target.checked)
                            }
                            className="w-4 h-4 accent-primary rounded cursor-pointer"
                          />
                          <label
                            htmlFor={`hide_salary_${idx}`}
                            className="text-xs text-muted-foreground select-none cursor-pointer flex items-center gap-1"
                          >
                            <Lock className="w-3 h-3 text-muted-foreground" />
                            Keep current salary private from public recruiters
                          </label>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* CARD 5: Career Preferences & Alerts */}
          <div className="rounded-3xl p-6 sm:p-7 border border-border bg-card shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-primary" />
                Career Preferences & Matching
              </h2>
              <span className="text-xs text-muted-foreground">Desired roles and locations</span>
            </div>

            {/* Target Job Titles */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Target Job Titles / Roles
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {targetRoles.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-primary/15 text-primary border border-primary/30"
                  >
                    {r}
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(r)}
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
                  value={targetRoleInput}
                  onChange={(e) => setTargetRoleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddRole(targetRoleInput);
                    }
                  }}
                  placeholder="e.g. Full Stack Developer, Product Designer..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => handleAddRole(targetRoleInput)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border cursor-pointer"
                >
                  Add Role
                </button>
              </div>
            </div>

            {/* Preferred Job Locations */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Preferred Job Locations
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(careerPrefs.preferred_locations || []).map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[#21A67A]/15 text-[#21A67A] border border-[#21A67A]/30"
                  >
                    <MapPin className="w-3 h-3 opacity-70" />
                    {loc}
                    <button
                      type="button"
                      onClick={() => handleRemoveLocation(loc)}
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
                  value={prefLocationInput}
                  onChange={(e) => setPrefLocationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddLocation(prefLocationInput);
                    }
                  }}
                  placeholder="Type city or remote and press Enter..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => handleAddLocation(prefLocationInput)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border cursor-pointer"
                >
                  Add Location
                </button>
              </div>
            </div>

            {/* Work Modes & Expected CTC */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Work Mode Preference
                </label>
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
                        className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize border transition-all cursor-pointer ${
                          sel
                            ? "bg-primary/15 border-primary/40 text-primary"
                            : "bg-card border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {mode.replace("_", "-")} {sel && "✓"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
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
                  <span className="text-xs text-primary font-bold">
                    ≈ {(minSalary / 100000).toFixed(1)} LPA
                  </span>
                </div>
              </div>
            </div>

            {/* Daily Email Alerts */}
            <div className="p-4 rounded-2xl bg-muted/50 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-foreground">
                    Automated Morning Email Alerts
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Receive verified openings matching your skills directly in your inbox.
                  </div>
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

          {/* CARD 6: Resume Upload & Parsing Section */}
          <div className="rounded-3xl p-6 sm:p-7 border border-border bg-card shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-primary" />
                Resume Document
              </h2>
              {resumeFilename && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                  Active
                </span>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-foreground truncate max-w-xs">
                    {resumeFilename || "No resume file attached"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    PDF or DOCX format (max 5 MB). Uploading automatically extracts and matches skills.
                  </p>
                </div>
              </div>

              <div>
                <input
                  type="file"
                  ref={resumeInputRef}
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleResumeSelect}
                />
                <button
                  type="button"
                  disabled={uploadingResume}
                  onClick={() => resumeInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-[--primary-hover] transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {uploadingResume ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      {resumeFilename ? "Replace Resume" : "Upload Resume"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* COLLAPSIBLE ACCORDIONS: Optional Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
              Optional Profile Details
            </h3>

            {/* Accordion 1: Summary & Headline */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => toggleSection("summary")}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-muted/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">
                    Resume Headline & Profile Summary
                  </span>
                </div>
                {openSections.summary ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {openSections.summary && (
                <div className="p-5 pt-0 border-t border-border/60 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Resume Headline
                    </label>
                    <input
                      type="text"
                      value={optionalDetails.headline || ""}
                      onChange={(e) =>
                        setOptionalDetails({ ...optionalDetails, headline: e.target.value })
                      }
                      placeholder="e.g. Senior Full-Stack Developer with 4+ years building high-traffic web apps"
                      className="w-full px-3.5 py-2 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Professional Summary
                    </label>
                    <textarea
                      rows={3}
                      value={optionalDetails.summary || ""}
                      onChange={(e) =>
                        setOptionalDetails({ ...optionalDetails, summary: e.target.value })
                      }
                      placeholder="Write a concise overview of your career accomplishments and interests..."
                      className="w-full p-3.5 rounded-xl bg-card border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 2: Projects */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => toggleSection("projects")}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-muted/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <FolderGit2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">
                    Projects ({optionalDetails.projects?.length || 0})
                  </span>
                </div>
                {openSections.projects ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {openSections.projects && (
                <div className="p-5 pt-0 border-t border-border/60 space-y-4">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setOptionalDetails({
                          ...optionalDetails,
                          projects: [
                            ...(optionalDetails.projects || []),
                            {
                              id: `proj_${Date.now()}`,
                              name: "",
                              technologies: "",
                              description: "",
                              link: "",
                            },
                          ],
                        })
                      }
                      className="text-xs text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Project
                    </button>
                  </div>

                  {(optionalDetails.projects || []).map((proj, pIdx) => (
                    <div
                      key={proj.id || pIdx}
                      className="p-4 rounded-xl bg-muted/40 border border-border space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">Project #{pIdx + 1}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setOptionalDetails({
                              ...optionalDetails,
                              projects: (optionalDetails.projects || []).filter((_, i) => i !== pIdx),
                            })
                          }
                          className="text-xs text-destructive hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={proj.name}
                          onChange={(e) => {
                            const updated = [...(optionalDetails.projects || [])];
                            updated[pIdx] = { ...updated[pIdx], name: e.target.value };
                            setOptionalDetails({ ...optionalDetails, projects: updated });
                          }}
                          placeholder="Project Title"
                          className="px-3 py-2 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                        />
                        <input
                          type="text"
                          value={proj.technologies || ""}
                          onChange={(e) => {
                            const updated = [...(optionalDetails.projects || [])];
                            updated[pIdx] = { ...updated[pIdx], technologies: e.target.value };
                            setOptionalDetails({ ...optionalDetails, projects: updated });
                          }}
                          placeholder="Technologies Used (e.g. Next.js, Python, PostgreSQL)"
                          className="px-3 py-2 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                        />
                        <input
                          type="url"
                          value={proj.link || ""}
                          onChange={(e) => {
                            const updated = [...(optionalDetails.projects || [])];
                            updated[pIdx] = { ...updated[pIdx], link: e.target.value };
                            setOptionalDetails({ ...optionalDetails, projects: updated });
                          }}
                          placeholder="Project or Repository URL (e.g. https://github.com/...)"
                          className="sm:col-span-2 px-3 py-2 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                        />
                        <textarea
                          rows={2}
                          value={proj.description || ""}
                          onChange={(e) => {
                            const updated = [...(optionalDetails.projects || [])];
                            updated[pIdx] = { ...updated[pIdx], description: e.target.value };
                            setOptionalDetails({ ...optionalDetails, projects: updated });
                          }}
                          placeholder="Brief description of the project and your key contribution..."
                          className="sm:col-span-2 p-3 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Accordion 3: Social & Portfolio Links */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => toggleSection("social")}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-muted/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">
                    Online Profiles & Portfolio Links
                  </span>
                </div>
                {openSections.social ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {openSections.social && (
                <div className="p-5 pt-0 border-t border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-blue-600" />
                      LinkedIn Profile
                    </label>
                    <input
                      type="url"
                      value={optionalDetails.linkedin || ""}
                      onChange={(e) =>
                        setOptionalDetails({ ...optionalDetails, linkedin: e.target.value })
                      }
                      placeholder="https://linkedin.com/in/username"
                      className="w-full px-3.5 py-2 rounded-xl bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-foreground" />
                      GitHub Profile
                    </label>
                    <input
                      type="url"
                      value={optionalDetails.github || ""}
                      onChange={(e) =>
                        setOptionalDetails({ ...optionalDetails, github: e.target.value })
                      }
                      placeholder="https://github.com/username"
                      className="w-full px-3.5 py-2 rounded-xl bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-500" />
                      Personal Portfolio
                    </label>
                    <input
                      type="url"
                      value={optionalDetails.portfolio || ""}
                      onChange={(e) =>
                        setOptionalDetails({ ...optionalDetails, portfolio: e.target.value })
                      }
                      placeholder="https://yourportfolio.dev"
                      className="w-full px-3.5 py-2 rounded-xl bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 4: Personal Details */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => toggleSection("personal")}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-muted/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <UserIcon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">
                    Additional Personal Details
                  </span>
                </div>
                {openSections.personal ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {openSections.personal && (
                <div className="p-5 pt-0 border-t border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Gender</label>
                    <select
                      value={optionalDetails.gender || ""}
                      onChange={(e) =>
                        setOptionalDetails({ ...optionalDetails, gender: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={optionalDetails.dob || ""}
                      onChange={(e) =>
                        setOptionalDetails({ ...optionalDetails, dob: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Work Permit
                    </label>
                    <input
                      type="text"
                      value={optionalDetails.work_permit || "India"}
                      onChange={(e) =>
                        setOptionalDetails({ ...optionalDetails, work_permit: e.target.value })
                      }
                      placeholder="e.g. India, US H1B, Singapore"
                      className="w-full px-3.5 py-2 rounded-xl bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="sticky bottom-4 z-30 p-4 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-xl flex items-center justify-between gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>All changes are encrypted and saved securely.</span>
            </div>

            <div className="flex items-center gap-3 ml-auto w-full sm:w-auto">
              <Link
                href="/jobs"
                className="flex-1 sm:flex-none text-center px-5 py-2.5 rounded-full text-xs font-bold border border-border hover:bg-muted text-foreground transition-all"
              >
                Browse Matching Jobs
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-7 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white bg-primary hover:bg-[--primary-hover] shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Profile
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppSidebarLayout>
  );
}
