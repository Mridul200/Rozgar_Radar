"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  fetchUserProfile,
  updateUserProfile,
  uploadProfileResume,
  uploadProfilePhoto,
  deleteProfilePhoto,
} from "@/lib/api";
import {
  UserProfile,
  EducationDetails,
  EmploymentItem,
  CareerPreferences,
} from "@/types/user";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  GraduationCap,
  Briefcase,
  UploadCloud,
  FileText,
  User as UserIcon,
  MapPin,
  Building2,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  Plus,
  Trash2,
  Camera,
  Sparkles,
  ShieldCheck,
  Compass,
} from "lucide-react";

const HIGHEST_QUALIFICATIONS = [
  "Doctorate / Ph.D",
  "Masters / Post-Graduation",
  "Graduation / Bachelors",
  "Diploma",
  "12th / Higher Secondary",
  "10th / Secondary",
];

const POPULAR_DEGREES = [
  "B.Tech / B.E.",
  "BCA",
  "B.Sc",
  "M.Tech / M.E.",
  "MCA",
  "M.Sc",
  "MBA / PGDM",
  "B.Com",
  "BBA",
  "Other Degree",
];

const POPULAR_SPECIALIZATIONS = [
  "Computer Science & Engineering",
  "Information Technology",
  "Electronics & Communication",
  "Data Science & AI",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Finance / Accounts",
  "Marketing",
  "General",
];

const COURSE_TYPES: Array<"Full-time" | "Part-time" | "Distance Learning"> = [
  "Full-time",
  "Part-time",
  "Distance Learning",
];

const PASSING_YEARS = Array.from({ length: 45 }, (_, i) => String(2028 - i));

const INDUSTRIES = [
  "IT Services & Consulting",
  "Software Product / SaaS",
  "Financial Services & FinTech",
  "E-Commerce & Retail",
  "Internet & Technology",
  "EdTech & Education",
  "Healthcare & Life Sciences",
  "Telecom & Networking",
  "Automotive & EV",
  "Media & Entertainment",
];

const DEPARTMENTS = [
  "Engineering - Software & QA",
  "Product Management",
  "Data Science & Analytics",
  "DevOps / Infrastructure / Cloud",
  "Design & Creative / UI/UX",
  "Sales & Business Development",
  "Customer Success & Operations",
  "Marketing & Communications",
];

const ROLE_CATEGORIES = [
  "Software Development",
  "QA / Manual & Automation Testing",
  "DevOps / Cloud Architecture",
  "Data Engineering",
  "AI / Machine Learning",
  "System Architecture",
  "Frontend / UI Engineering",
  "Backend / API Engineering",
];

const DESIRED_LOCATIONS = [
  "Bengaluru",
  "Pune",
  "Hyderabad",
  "Delhi NCR / Gurgaon / Noida",
  "Mumbai",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Remote India",
  "Worldwide / APAC",
];

const NOTICE_PERIODS = [
  "Immediate (15 Days or less)",
  "1 Month (30 Days)",
  "2 Months (60 Days)",
  "3 Months (90 Days)",
  "Serving Notice Period",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();

  // Wizard Navigation
  const [currentStep, setCurrentStep] = useState<number>(2); // Step 1 is registration; wizard continues at Step 2
  const [saving, setSaving] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Basic Info (Prefilled from registration)
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [currentCity, setCurrentCity] = useState("");
  const [workStatus, setWorkStatus] = useState<"fresher" | "experienced">("fresher");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  // Step 2: Education
  const [highestQual, setHighestQual] = useState("Graduation / Bachelors");
  const [degree, setDegree] = useState("B.Tech / B.E.");
  const [specialization, setSpecialization] = useState("Computer Science & Engineering");
  const [college, setCollege] = useState("");
  const [passingYear, setPassingYear] = useState("2024");
  const [courseType, setCourseType] = useState<"Full-time" | "Part-time" | "Distance Learning">("Full-time");
  const [eduError, setEduError] = useState<string | null>(null);

  // Step 3: Career & Employment
  const [industry, setIndustry] = useState("IT Services & Consulting");
  const [department, setDepartment] = useState("Engineering - Software & QA");
  const [roleCategory, setRoleCategory] = useState("Software Development");
  const [desiredJobType, setDesiredJobType] = useState("Permanent");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [selectedLocations, setSelectedLocations] = useState<string[]>(["Bengaluru", "Remote India"]);
  const [careerSkills, setCareerSkills] = useState<string[]>(["Python", "React", "SQL"]);
  const [skillInput, setSkillInput] = useState("");

  // Experienced Employment History
  const [employmentList, setEmploymentList] = useState<EmploymentItem[]>([
    {
      company: "",
      designation: "",
      joining_date: "",
      last_working_date: "",
      current_employment_status: "Employed",
      notice_period: "1 Month (30 Days)",
      current_salary: "",
      hide_salary_publicly: false,
    },
  ]);
  const [careerError, setCareerError] = useState<string | null>(null);

  // Step 4: Dedicated Resume Upload
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadedResumeName, setUploadedResumeName] = useState<string | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeSuccessMsg, setResumeSuccessMsg] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeWarnings, setResumeWarnings] = useState<string[]>([]);
  const resumeInputRef = useRef<HTMLInputElement | null>(null);

  // Step 5: Completion & Review
  const [completionScore, setCompletionScore] = useState<number>(35);

  // Photo Upload State
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Load Existing Profile & Prefilled Step 1 data
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login?redirect=/onboarding");
      return;
    }

    if (token) {
      setLoadingInitial(true);
      fetchUserProfile(token)
        .then((p) => {
          if (p) {
            setFullName(user?.full_name || "");
            setEmail(user?.email || "");
            setMobileNumber(p.mobile_number || "");
            setCurrentCity(p.current_city || "");
            if (p.work_status === "experienced" || p.work_status === "fresher") {
              setWorkStatus(p.work_status);
            }
            if (p.profile_photo_url) {
              setProfilePhotoUrl(p.profile_photo_url);
            }
            if (p.resume_filename) {
              setUploadedResumeName(p.resume_filename);
            }

            // Restore Education
            if (p.education_details) {
              if (p.education_details.highest_qualification) setHighestQual(p.education_details.highest_qualification);
              if (p.education_details.degree) setDegree(p.education_details.degree);
              if (p.education_details.specialization) setSpecialization(p.education_details.specialization);
              if (p.education_details.college) setCollege(p.education_details.college);
              if (p.education_details.passing_year) setPassingYear(p.education_details.passing_year);
              if (p.education_details.course_type) setCourseType(p.education_details.course_type);
            }

            // Restore Career
            if (p.career_preferences) {
              if (p.career_preferences.industry) setIndustry(p.career_preferences.industry);
              if (p.career_preferences.department) setDepartment(p.career_preferences.department);
              if (p.career_preferences.role_category) setRoleCategory(p.career_preferences.role_category);
              if (p.career_preferences.desired_job_type) setDesiredJobType(p.career_preferences.desired_job_type);
              if (p.career_preferences.employment_type) setEmploymentType(p.career_preferences.employment_type);
              if (p.career_preferences.preferred_locations?.length) setSelectedLocations(p.career_preferences.preferred_locations);
            }
            if (p.skills?.length) {
              setCareerSkills(p.skills);
            }

            // Restore Employment History
            if (p.employment_history && p.employment_history.length > 0) {
              setEmploymentList(p.employment_history);
            }

            if (p.profile_completion_pct) {
              setCompletionScore(p.profile_completion_pct);
            }
          }
        })
        .catch((err) => console.error("Failed to load user profile:", err))
        .finally(() => setLoadingInitial(false));
    }
  }, [authLoading, user, token, router]);

  // Dynamic Progress Calculation
  const calculateWizardProgress = () => {
    let progress = 20; // Step 1 registration completed
    if (college.trim()) progress += 20; // Step 2 education
    if (selectedLocations.length > 0 && careerSkills.length >= 1) progress += 20; // Step 3 career
    if (workStatus === "experienced") {
      if (employmentList[0]?.company && employmentList[0]?.designation) progress += 15;
    } else {
      progress += 15; // Freshers get 15% automatically
    }
    if (uploadedResumeName || resumeFile) progress += 10;
    return Math.min(100, progress);
  };

  // Auto-Save helper on step navigation
  const persistCurrentProgress = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const eduData: EducationDetails = {
        highest_qualification: highestQual,
        degree,
        specialization,
        college: college.trim(),
        passing_year: passingYear,
        course_type: courseType,
      };

      const careerData: CareerPreferences = {
        industry,
        department,
        role_category: roleCategory,
        desired_job_type: desiredJobType,
        employment_type: employmentType,
        preferred_locations: selectedLocations,
      };

      const validEmp = employmentList.filter((e) => e.company.trim() || e.designation.trim());

      const res = await updateUserProfile(
        {
          current_city: currentCity,
          mobile_number: mobileNumber,
          work_status: workStatus,
          education_details: eduData,
          education: `${degree} - ${specialization || highestQual}`,
          skills: careerSkills,
          preferred_locations: selectedLocations,
          career_preferences: careerData,
          employment_history: validEmp,
          onboarding_completed: currentStep === 5,
        },
        token
      );
      if (res?.profile_completion_pct) {
        setCompletionScore(res.profile_completion_pct);
      }
    } catch (err) {
      console.error("Auto-save progress failed:", err);
    } finally {
      setSaving(false);
    }
  };

  // Step 2 Continue Validation
  const handleContinueStep2 = async () => {
    if (!college.trim()) {
      setEduError("Please enter your College or University name.");
      return;
    }
    setEduError(null);
    await persistCurrentProgress();
    setCurrentStep(3);
  };

  // Step 3 Continue Validation
  const handleContinueStep3 = async () => {
    if (workStatus === "experienced") {
      const first = employmentList[0];
      if (!first.company.trim() || !first.designation.trim()) {
        setCareerError("Please fill in your current or most recent Company and Designation.");
        return;
      }
    }
    setCareerError(null);
    await persistCurrentProgress();
    setCurrentStep(4);
  };

  // Skill Add / Remove
  const handleAddSkill = () => {
    const clean = skillInput.trim();
    if (!clean) return;
    if (careerSkills.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      setSkillInput("");
      return;
    }
    setCareerSkills([...careerSkills, clean]);
    setSkillInput("");
  };

  const handleRemoveSkill = (skill: string) => {
    setCareerSkills(careerSkills.filter((s) => s !== skill));
  };

  const toggleLocation = (loc: string) => {
    if (selectedLocations.includes(loc)) {
      if (selectedLocations.length > 1) {
        setSelectedLocations(selectedLocations.filter((l) => l !== loc));
      }
    } else {
      setSelectedLocations([...selectedLocations, loc]);
    }
  };

  // Employment List manipulation
  const updateEmployment = (index: number, field: keyof EmploymentItem, value: any) => {
    const updated = [...employmentList];
    updated[index] = { ...updated[index], [field]: value };
    setEmploymentList(updated);
  };

  const addEmploymentRow = () => {
    setEmploymentList([
      ...employmentList,
      {
        company: "",
        designation: "",
        joining_date: "",
        last_working_date: "",
        current_employment_status: "Employed",
        notice_period: "1 Month (30 Days)",
        current_salary: "",
        hide_salary_publicly: false,
      },
    ]);
  };

  const removeEmploymentRow = (index: number) => {
    if (employmentList.length === 1) return;
    setEmploymentList(employmentList.filter((_, i) => i !== index));
  };

  // Step 4: Resume File Upload & Server-side Parsing
  const handleResumeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setResumeError(null);
    setResumeSuccessMsg(null);
    setResumeWarnings([]);
    const file = e.target.files?.[0];
    if (!file) return;

    const validExts = [".pdf", ".docx"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!validExts.includes(ext)) {
      setResumeError("Unsupported file format. Please upload a PDF or DOCX file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setResumeError("File size exceeds 5 MB. Please upload a smaller file.");
      return;
    }

    setResumeFile(file);
    setResumeUploading(true);

    try {
      const res = await uploadProfileResume(file, token);
      setUploadedResumeName(file.name);
      setResumeSuccessMsg("Resume parsed successfully! Your profile fields have been pre-filled.");
      if (res.warnings?.length) {
        setResumeWarnings(res.warnings);
      }
      if (res.profile) {
        if (res.profile.skills?.length) setCareerSkills(res.profile.skills);
        if (res.profile.profile_completion_pct) setCompletionScore(res.profile.profile_completion_pct);
      }
    } catch (err: any) {
      setResumeError(err.message || "Failed to parse resume. You can still continue manually.");
    } finally {
      setResumeUploading(false);
    }
  };

  const handleRemoveUploadedResume = () => {
    setResumeFile(null);
    setUploadedResumeName(null);
    setResumeSuccessMsg(null);
    setResumeError(null);
    if (resumeInputRef.current) resumeInputRef.current.value = "";
  };

  // Profile Photo Upload Handlers
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("Profile photo exceeds 3 MB limit.");
      return;
    }

    setPhotoUploading(true);
    try {
      const res = await uploadProfilePhoto(file, token);
      setProfilePhotoUrl(res.photo_url);
      setCompletionScore(res.completion_pct);
    } catch (err: any) {
      alert(err.message || "Failed to upload photo");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    setPhotoUploading(true);
    try {
      await deleteProfilePhoto(token);
      setProfilePhotoUrl(null);
    } catch (err) {
      console.error(err);
    } finally {
      setPhotoUploading(false);
    }
  };

  // Step 5: Finalize Onboarding
  const handleFinishOnboarding = async () => {
    setSaving(true);
    try {
      await persistCurrentProgress();
      if (token) {
        await updateUserProfile({ onboarding_completed: true }, token);
      }
      router.push("/profile");
    } catch (err) {
      console.error("Failed to complete onboarding:", err);
      router.push("/profile");
    } finally {
      setSaving(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Loading your career profile builder...
        </p>
      </div>
    );
  }

  const stepsMeta = [
    { num: 1, title: "Basic Information", desc: "Registration details (Completed)", icon: UserIcon },
    { num: 2, title: "Education Details", desc: "Degree, college & passing year", icon: GraduationCap },
    { num: 3, title: "Career & Experience", desc: "Preferences & work history", icon: Briefcase },
    { num: 4, title: "Resume Upload", desc: "PDF or DOCX document", icon: FileText },
    { num: 5, title: "Review & Finish", desc: "Completeness & profile preview", icon: Sparkles },
  ];

  const overallProgress = calculateWizardProgress();

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col transition-colors duration-200">
      {/* Top Wizard Navigation Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" href="/" />
            <div className="hidden sm:block h-5 w-px bg-border" />
            <span className="hidden sm:inline-block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Profile Setup Wizard
            </span>
          </div>

          {/* Overall Progress Meter */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-foreground">
                Profile Completeness: {Math.max(completionScore, overallProgress)}%
              </span>
              <div className="w-28 sm:w-36 h-2 bg-muted rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(completionScore, overallProgress)}%` }}
                />
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={persistCurrentProgress}
              disabled={saving}
              className="text-xs rounded-full border-border cursor-pointer shrink-0"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Draft"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Wizard Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Navigation Sidebar (Desktop) */}
          <aside className="lg:col-span-4 bg-card border border-border rounded-3xl p-6 shadow-sm sticky top-24">
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#087F68] dark:text-[#21A67A] text-xs font-semibold mb-2">
                <Sparkles className="w-3 h-3" />
                <span>Interactive Profile Builder</span>
              </div>
              <h2 className="text-lg font-bold text-foreground tracking-tight">Your Progress</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete all required sections to maximize matching accuracy with verified ATS jobs.
              </p>
            </div>

            <nav className="flex flex-col gap-2.5">
              {stepsMeta.map((s) => {
                const Icon = s.icon;
                const isCurrent = currentStep === s.num;
                const isPassed = currentStep > s.num;
                return (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => {
                      if (s.num <= currentStep || s.num === 1) {
                        setCurrentStep(s.num);
                      }
                    }}
                    disabled={s.num > currentStep}
                    className={`flex items-start gap-3.5 p-3 rounded-2xl text-left transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-primary/10 border border-primary shadow-2xs"
                        : isPassed
                        ? "bg-card/40 border border-border/80 hover:bg-card/80 text-foreground"
                        : "opacity-45 cursor-not-allowed border border-transparent"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                        isPassed
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : isCurrent
                          ? "bg-primary text-white shadow-xs"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          Step {s.num}: {s.title}
                        </span>
                        {isPassed && (
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-md">
                            Done
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground leading-snug">{s.desc}</span>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Quick Profile Summary Mini-Box */}
            <div className="mt-6 pt-5 border-t border-border">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Logged in as:</span>
                <span className="font-semibold text-foreground truncate max-w-[150px]">{fullName || user?.full_name}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Status:</span>
                <span className="font-semibold text-primary capitalize">{workStatus}</span>
              </div>
            </div>
          </aside>

          {/* Right Main Wizard Card */}
          <div className="lg:col-span-8 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm">
            {/* STEP 1 RECAP */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Step 1 Completed during Registration</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    Basic Information
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Your account registration details have been verified and saved to your profile.
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-border bg-background/50">
                    <span className="text-xs text-muted-foreground">Full Name</span>
                    <p className="text-sm font-bold text-foreground mt-0.5">{fullName || user?.full_name}</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-border bg-background/50">
                    <span className="text-xs text-muted-foreground">Verified Email</span>
                    <p className="text-sm font-bold text-foreground mt-0.5 truncate">{email || user?.email}</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-border bg-background/50">
                    <span className="text-xs text-muted-foreground">Mobile Number</span>
                    <p className="text-sm font-bold text-foreground mt-0.5 font-mono">+91 {mobileNumber || "—"}</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-border bg-background/50">
                    <span className="text-xs text-muted-foreground">Current City</span>
                    <p className="text-sm font-bold text-foreground mt-0.5">{currentCity || "—"}</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-border bg-background/50 sm:col-span-2">
                    <span className="text-xs text-muted-foreground">Work Status</span>
                    <p className="text-sm font-bold text-foreground mt-0.5 capitalize flex items-center gap-1.5">
                      {workStatus === "fresher" ? <GraduationCap className="w-4 h-4 text-primary" /> : <Briefcase className="w-4 h-4 text-primary" />}
                      <span>{workStatus}</span>
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="rounded-full px-6 py-5 text-sm font-bold bg-primary hover:bg-[--primary-hover] text-white cursor-pointer"
                  >
                    <span>Continue to Education</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: EDUCATION DETAILS */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-2">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Step 2 of 4</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    Education Details
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Provide your highest academic degree and university to assist recruiters with eligibility filtering.
                  </p>
                </div>

                <Separator />

                {eduError && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{eduError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Highest Qualification */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-foreground">Highest Qualification *</Label>
                    <select
                      value={highestQual}
                      onChange={(e) => setHighestQual(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground outline-none focus:border-primary cursor-pointer"
                    >
                      {HIGHEST_QUALIFICATIONS.map((q) => (
                        <option key={q} value={q} className="bg-card text-foreground">
                          {q}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Course / Degree */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-foreground">Course / Degree *</Label>
                    <select
                      value={degree}
                      onChange={(e) => setDegree(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground outline-none focus:border-primary cursor-pointer"
                    >
                      {POPULAR_DEGREES.map((d) => (
                        <option key={d} value={d} className="bg-card text-foreground">
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Specialization */}
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-foreground">Specialization *</Label>
                    <select
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground outline-none focus:border-primary cursor-pointer"
                    >
                      {POPULAR_SPECIALIZATIONS.map((s) => (
                        <option key={s} value={s} className="bg-card text-foreground">
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* College / University */}
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-foreground">College / University Name *</Label>
                    <Input
                      placeholder="e.g. Indian Institute of Technology, Anna University, Delhi University..."
                      value={college}
                      onChange={(e) => {
                        setCollege(e.target.value);
                        if (eduError) setEduError(null);
                      }}
                      className="rounded-xl bg-background border-border text-foreground"
                      required
                    />
                  </div>

                  {/* Passing Year */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-foreground">Passing Year *</Label>
                    <select
                      value={passingYear}
                      onChange={(e) => setPassingYear(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground outline-none focus:border-primary cursor-pointer"
                    >
                      {PASSING_YEARS.map((y) => (
                        <option key={y} value={y} className="bg-card text-foreground">
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Course Type */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-foreground">Course Type *</Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {COURSE_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setCourseType(type)}
                          className={`px-2 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                            courseType === type
                              ? "bg-primary/10 border-primary text-primary"
                              : "bg-background border-border text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="rounded-full px-5 py-5 text-sm font-medium border-border cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    <span>Back</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={handleContinueStep2}
                    disabled={saving}
                    className="rounded-full px-6 py-5 text-sm font-bold bg-primary hover:bg-[--primary-hover] text-white cursor-pointer"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Continue to Career</span>}
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: CAREER PROFILE & EMPLOYMENT */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-2">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Step 3 of 4</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    Career Profile & Preferences
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Select your preferred roles, tech stack, and locations.
                  </p>
                </div>

                <Separator />

                {careerError && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{careerError}</span>
                  </div>
                )}

                {/* Status Switcher: Fresher vs Experienced */}
                <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
                  <Label className="text-xs font-bold text-foreground">
                    Please confirm: Are you a Fresher or Experienced candidate?
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setWorkStatus("fresher")}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                        workStatus === "fresher"
                          ? "border-primary bg-primary/10 font-bold text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <GraduationCap className={`w-4 h-4 ${workStatus === "fresher" ? "text-primary" : ""}`} />
                      <div className="text-left">
                        <span className="text-xs block">Fresher</span>
                        <span className="text-[10px] text-muted-foreground font-normal">No prior full-time employment</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWorkStatus("experienced")}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                        workStatus === "experienced"
                          ? "border-primary bg-primary/10 font-bold text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <Briefcase className={`w-4 h-4 ${workStatus === "experienced" ? "text-primary" : ""}`} />
                      <div className="text-left">
                        <span className="text-xs block">Experienced</span>
                        <span className="text-[10px] text-muted-foreground font-normal">Have work history</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Common Career Preferences */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-foreground">Target Industry *</Label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground outline-none focus:border-primary cursor-pointer"
                    >
                      {INDUSTRIES.map((ind) => (
                        <option key={ind} value={ind} className="bg-card text-foreground">{ind}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-foreground">Target Department *</Label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground outline-none focus:border-primary cursor-pointer"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept} className="bg-card text-foreground">{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-foreground">Role Category *</Label>
                    <select
                      value={roleCategory}
                      onChange={(e) => setRoleCategory(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground outline-none focus:border-primary cursor-pointer"
                    >
                      {ROLE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat} className="bg-card text-foreground">{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Desired Locations Chips */}
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-foreground">Desired Job Locations *</Label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {DESIRED_LOCATIONS.map((loc) => {
                        const selected = selectedLocations.includes(loc);
                        return (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => toggleLocation(loc)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                              selected
                                ? "bg-primary text-white border-primary shadow-xs"
                                : "bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                            }`}
                          >
                            {loc}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Key Skills */}
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-foreground">Key Technical & Soft Skills *</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type skill (e.g. Python, Docker, Next.js) and press Enter"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSkill();
                          }
                        }}
                        className="rounded-xl bg-background border-border text-foreground"
                      />
                      <Button
                        type="button"
                        onClick={handleAddSkill}
                        className="rounded-xl px-4 bg-primary hover:bg-[--primary-hover] text-white cursor-pointer"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        <span>Add</span>
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {careerSkills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-[#087F68] dark:text-[#21A67A] border border-emerald-500/20"
                        >
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="hover:text-destructive transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* EMPLOYMENT HISTORY SECTION — OPENS IF EXPERIENCED */}
                {workStatus === "experienced" && (
                  <div className="mt-8 pt-6 border-t border-border space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-primary" />
                          <span>Employment History</span>
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Add your current and past work engagements.
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addEmploymentRow}
                        className="rounded-xl text-xs border-border cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        <span>Add Another Company</span>
                      </Button>
                    </div>

                    {employmentList.map((emp, idx) => (
                      <div key={idx} className="p-5 rounded-2xl border border-border bg-background/50 space-y-4 relative">
                        {employmentList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEmploymentRow(idx)}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-destructive p-1 rounded-lg transition-colors cursor-pointer"
                            title="Remove employment entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-semibold text-foreground">Company Name *</Label>
                            <Input
                              placeholder="e.g. Infosys, TCS, Razorpay..."
                              value={emp.company}
                              onChange={(e) => updateEmployment(idx, "company", e.target.value)}
                              className="rounded-xl bg-background border-border text-foreground"
                              required
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-semibold text-foreground">Designation / Role *</Label>
                            <Input
                              placeholder="e.g. Senior Software Engineer..."
                              value={emp.designation}
                              onChange={(e) => updateEmployment(idx, "designation", e.target.value)}
                              className="rounded-xl bg-background border-border text-foreground"
                              required
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-semibold text-foreground">Joining Date (Month, Year)</Label>
                            <Input
                              placeholder="e.g. Jul 2021"
                              value={emp.joining_date}
                              onChange={(e) => updateEmployment(idx, "joining_date", e.target.value)}
                              className="rounded-xl bg-background border-border text-foreground"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-semibold text-foreground">Current Status / Last Working Date</Label>
                            <Input
                              placeholder="e.g. Present (or Aug 2024)"
                              value={emp.last_working_date}
                              onChange={(e) => updateEmployment(idx, "last_working_date", e.target.value)}
                              className="rounded-xl bg-background border-border text-foreground"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-semibold text-foreground">Notice Period</Label>
                            <select
                              value={emp.notice_period || "1 Month (30 Days)"}
                              onChange={(e) => updateEmployment(idx, "notice_period", e.target.value)}
                              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground outline-none focus:border-primary cursor-pointer"
                            >
                              {NOTICE_PERIODS.map((np) => (
                                <option key={np} value={np} className="bg-card text-foreground">{np}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-semibold text-foreground">Current / Last Salary (₹ LPA)</Label>
                            <Input
                              placeholder="e.g. 12.5"
                              value={emp.current_salary}
                              onChange={(e) => updateEmployment(idx, "current_salary", e.target.value)}
                              className="rounded-xl bg-background border-border text-foreground font-mono"
                            />
                          </div>

                          {/* Salary Privacy Toggle */}
                          <div className="sm:col-span-2 flex items-center justify-between pt-1">
                            <div className="flex items-center gap-2">
                              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Hide current salary from public recruiters / profile
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => updateEmployment(idx, "hide_salary_publicly", !emp.hide_salary_publicly)}
                              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                                emp.hide_salary_publicly
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              {emp.hide_salary_publicly ? "Private (Hidden)" : "Public"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-6 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    className="rounded-full px-5 py-5 text-sm font-medium border-border cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    <span>Back</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={handleContinueStep3}
                    disabled={saving}
                    className="rounded-full px-6 py-5 text-sm font-bold bg-primary hover:bg-[--primary-hover] text-white cursor-pointer"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Continue to Resume Upload</span>}
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: DEDICATED RESUME UPLOAD ONLY */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-2">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Step 4 of 4: Document Ingestion</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    Upload Your Resume
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Uploading your resume extracts relevant skills, project highlights, and credentials to auto-populate your professional profile.
                  </p>
                </div>

                <Separator />

                {resumeError && (
                  <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{resumeError}</span>
                  </div>
                )}

                {resumeSuccessMsg && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="font-semibold">{resumeSuccessMsg}</p>
                      {resumeWarnings.length > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Notice: {resumeWarnings[0]}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* File Upload Box */}
                <input
                  ref={resumeInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleResumeFileSelect}
                  className="hidden"
                  id="mainResumeUpload"
                />

                {uploadedResumeName || resumeFile ? (
                  <div className="p-6 rounded-3xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 truncate w-full sm:w-auto">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-bold text-foreground truncate">
                          {resumeFile?.name || uploadedResumeName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span>{resumeFile ? `${(resumeFile.size / (1024 * 1024)).toFixed(2)} MB` : "Attached file"}</span>
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active & Parsed</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <label
                        htmlFor="mainResumeUpload"
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-card border border-border hover:bg-muted text-foreground transition-all cursor-pointer"
                      >
                        Replace File
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveUploadedResume}
                        className="rounded-xl text-xs border-border text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="mainResumeUpload"
                    className="border-2 border-dashed border-border hover:border-primary/60 bg-card/60 hover:bg-card/90 rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all gap-3.5 group shadow-2xs"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[#087F68] dark:text-[#21A67A] flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                      {resumeUploading ? (
                        <Loader2 className="w-8 h-8 animate-spin" />
                      ) : (
                        <UploadCloud className="w-8 h-8" />
                      )}
                    </div>

                    <div>
                      <p className="text-base font-bold text-foreground">
                        {resumeUploading ? "Parsing resume with AI parser..." : "Drag and drop your resume file here"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        Supports PDF and DOCX documents up to 5 MB. We extract your skills, degrees, and work history automatically.
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-[--primary-hover] text-white text-xs font-bold shadow-sm transition-all mt-1">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Select Resume File</span>
                    </span>
                  </label>
                )}

                {/* Privacy & Extraction Notice */}
                <div className="p-4 rounded-2xl border border-border/80 bg-background/50 flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>Safe & Authorized Ingestion:</strong> Existing profile fields are never silently overwritten. Missing information will not be invented, and you can edit or remove details at any time from your profile dashboard.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(3)}
                    className="rounded-full px-5 py-5 text-sm font-medium border-border cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    <span>Back</span>
                  </Button>

                  <div className="flex items-center gap-3">
                    {!uploadedResumeName && !resumeFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={async () => {
                          await persistCurrentProgress();
                          setCurrentStep(5);
                        }}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Skip for Now
                      </Button>
                    )}

                    <Button
                      type="button"
                      onClick={async () => {
                        await persistCurrentProgress();
                        setCurrentStep(5);
                      }}
                      disabled={saving || resumeUploading}
                      className="rounded-full px-6 py-5 text-sm font-bold bg-primary hover:bg-[--primary-hover] text-white cursor-pointer"
                    >
                      <span>Review Profile</span>
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: REVIEW, PHOTO & COMPLETION */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Profile Complete & Verified</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    Review & Finish Profile
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Your profile setup is complete. You can upload an optional profile photo now or browse matched opportunities.
                  </p>
                </div>

                <Separator />

                {/* Profile Photo Upload Option */}
                <div className="p-5 rounded-3xl border border-border bg-background/50 flex flex-col sm:flex-row items-center gap-5">
                  <div className="relative group shrink-0">
                    <div className="w-20 h-20 rounded-full border-2 border-primary/30 overflow-hidden bg-card flex items-center justify-center shadow-sm">
                      {profilePhotoUrl ? (
                        <img
                          src={profilePhotoUrl}
                          alt="Profile Photo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/40">
                          <UserIcon className="w-8 h-8" />
                        </div>
                      )}
                    </div>

                    <input
                      ref={photoInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handlePhotoSelect}
                      className="hidden"
                      id="wizardPhotoUpload"
                    />

                    <label
                      htmlFor="wizardPhotoUpload"
                      className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-white shadow-sm hover:scale-110 transition-transform cursor-pointer"
                      title="Upload profile photo"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </label>
                  </div>

                  <div className="flex-1 text-center sm:text-left">
                    <h4 className="text-sm font-bold text-foreground">Profile Photo (Optional)</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      JPG, PNG or WebP up to 3 MB. Adds authentic personal presence to recruiter applications.
                    </p>
                    {profilePhotoUrl && (
                      <button
                        type="button"
                        onClick={handleDeletePhoto}
                        disabled={photoUploading}
                        className="text-xs text-destructive hover:underline font-semibold mt-2 cursor-pointer"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="p-4 rounded-2xl border border-border bg-card/60">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase">Education</span>
                    <p className="text-xs font-bold text-foreground mt-1 truncate">{degree}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{college || "Completed"}</p>
                  </div>

                  <div className="p-4 rounded-2xl border border-border bg-card/60">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase">Target Domain</span>
                    <p className="text-xs font-bold text-foreground mt-1 truncate">{roleCategory}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{industry}</p>
                  </div>

                  <div className="p-4 rounded-2xl border border-border bg-card/60">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase">Key Skills</span>
                    <p className="text-xs font-bold text-foreground mt-1 truncate">
                      {careerSkills.slice(0, 3).join(", ") || "Skills added"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{careerSkills.length} skills saved</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(4)}
                    className="rounded-full px-5 py-5 text-sm font-medium border-border cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    <span>Back</span>
                  </Button>

                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push("/jobs")}
                      className="rounded-full px-5 py-5 text-sm font-semibold border-border cursor-pointer"
                    >
                      Browse Jobs
                    </Button>

                    <Button
                      type="button"
                      onClick={handleFinishOnboarding}
                      disabled={saving}
                      className="rounded-full px-7 py-5 text-sm font-bold bg-primary hover:bg-[--primary-hover] text-white shadow-sm cursor-pointer"
                    >
                      {saving ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Finalizing...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span>Complete & Open Profile</span>
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
