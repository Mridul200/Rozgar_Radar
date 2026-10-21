"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  fetchUserResumes,
  saveResume,
  deleteResume,
  duplicateResume,
  importResume,
  exportResumePdf,
  exportResumeDocx,
  suggestResumeAI,
} from "@/lib/api";
import {
  ResumeData,
  ResumeRecord,
  ExperienceItem,
  EducationItem,
  ProjectItem,
  CertificationItem,
  CustomSectionItem,
} from "@/types/user";
import { AppSidebarLayout } from "@/components/layout/AppSidebarLayout";
import {
  FileText,
  Save,
  Download,
  Plus,
  Trash2,
  Sparkles,
  Briefcase,
  GraduationCap,
  Code2,
  FolderGit2,
  Award,
  CheckCircle2,
  Loader2,
  Printer,
  ChevronRight,
  ChevronLeft,
  Copy,
  Edit3,
  Upload,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  X,
  FileCheck,
  Check,
  RotateCcw,
  Sliders,
  Layers,
  Eye,
  FileCode,
  Layout,
  RefreshCw,
  Target,
} from "lucide-react";

// Initial Default Starter Resume
const EMPTY_RESUME_DATA: ResumeData = {
  fullName: "",
  professionalTitle: "",
  email: "",
  phone: "",
  location: "",
  website: "",
  portfolio: "",
  linkedin: "",
  github: "",
  otherLink: "",
  summary: "",
  skills: {
    technical: [],
    tools: [],
    soft: [],
  },
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  customSections: [],
};

const SAMPLE_STARTER_RESUME: ResumeData = {
  fullName: "Aarav Sharma",
  professionalTitle: "Full Stack Software Engineer",
  email: "aarav.sharma@example.com",
  phone: "+91 98765 43210",
  location: "Bengaluru, Karnataka, India",
  website: "https://aaravsharma.dev",
  portfolio: "https://aaravsharma.dev",
  linkedin: "https://linkedin.com/in/aaravsharma",
  github: "https://github.com/aaravsharma",
  otherLink: "",
  summary:
    "Results-driven Software Engineer with 3+ years of experience architecting high-throughput REST APIs and scalable web applications. Proficient in Python, FastAPI, React, Next.js, and PostgreSQL. Passionate about system performance, clean architecture, and rapid shipping.",
  skills: {
    technical: ["Python", "FastAPI", "React", "Next.js", "TypeScript", "PostgreSQL", "SQL", "Redis"],
    tools: ["Docker", "AWS", "Git", "GitHub Actions", "Linux", "Postman"],
    soft: ["Problem Solving", "Cross-functional Collaboration", "Agile Methodologies"],
  },
  experience: [
    {
      id: "exp-1",
      title: "Software Engineer",
      company: "Nexus Technologies",
      location: "Bengaluru, India",
      startDate: "2022-06",
      endDate: "Present",
      current: true,
      description:
        "Engineered scalable backend microservices handling 25,000+ daily requests with sub-90ms response latency using FastAPI and Redis. Designed responsive Next.js web portals cutting initial page load times by 35%.",
      bullets: [
        "Architected core API microservices handling 25,000+ daily requests with sub-90ms latency using FastAPI and Redis.",
        "Refactored relational database schemas in PostgreSQL, reducing query latency across main dashboards by 42%.",
        "Collaborated with DevOps to automate staging and production CI/CD deployments using Docker and GitHub Actions.",
      ],
    },
  ],
  education: [
    {
      id: "edu-1",
      degree: "B.Tech in Computer Science and Engineering",
      school: "National Institute of Technology (NIT)",
      location: "India",
      gradYear: "2022",
      gpa: "8.7 / 10.0",
    },
  ],
  projects: [
    {
      id: "proj-1",
      name: "Rozgar Radar Intelligence Engine",
      link: "https://github.com/aaravsharma/rozgar-radar",
      technologies: "FastAPI, React, Tailwind CSS, SQLite",
      description:
        "Engineered a multi-source automated job discovery engine with real-time ATS keyword scoring and applicant notification pipelines.",
      bullets: [
        "Built resilient background scraping workers parsing thousands of listings with automated deduplication.",
        "Created an interactive ATS scoring module calculating keyword density, formatting compliance, and experience depth.",
      ],
    },
  ],
  certifications: [
    {
      id: "cert-1",
      name: "AWS Certified Developer – Associate",
      issuer: "Amazon Web Services",
      year: "2023",
      link: "",
    },
  ],
  customSections: [],
};


function getSkillsCategory(data: ResumeData, category: 'technical' | 'tools' | 'soft'): string[] {
  if (!data.skills) return [];
  if (Array.isArray(data.skills)) {
    return category === 'technical' ? data.skills : [];
  }
  return data.skills[category] || [];
}

function getAllSkills(data: ResumeData): string[] {
  if (!data.skills) return [];
  if (Array.isArray(data.skills)) return data.skills;
  return [
    ...(data.skills.technical || []),
    ...(data.skills.tools || []),
    ...(data.skills.soft || []),
  ];
}

function ResumeBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isLoading: authLoading } = useAuth();

  // Mode: "dashboard" or "editor"
  const [viewMode, setViewMode] = useState<"dashboard" | "editor">("dashboard");
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
  const [resumeTitle, setResumeTitle] = useState("Software Engineer Resume");
  const [template, setTemplate] = useState<"classic" | "modern" | "minimal" | "technical">("classic");
  const [resumeData, setResumeData] = useState<ResumeData>(SAMPLE_STARTER_RESUME);

  // Loading & Saving States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  // Step state for multi-step form (1 to 8)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [mobileTab, setMobileTab] = useState<"form" | "preview">("form");

  // Skipped status tracking for optional sections
  const [skippedSections, setSkippedSections] = useState<Record<string, boolean>>({
    experience: false,
    projects: false,
    certifications: false,
    custom: false,
  });

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null);
  const [renameInput, setRenameInput] = useState("");

  // AI Assistant State
  const [aiTask, setAiTask] = useState<"summary" | "bullets" | "project" | "enhance">("summary");
  const [aiContext, setAiContext] = useState<any>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    original: string;
    suggested: string;
    bullets: string[];
    explanation: string;
  } | null>(null);
  const [aiEditedText, setAiEditedText] = useState("");

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importSuccess, setImportSuccess] = useState(false);

  // New Skill Tag Inputs
  const [techSkillInput, setTechSkillInput] = useState("");
  const [toolSkillInput, setToolSkillInput] = useState("");
  const [softSkillInput, setSoftSkillInput] = useState("");

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch User Resumes on Mount
  useEffect(() => {
    if (token) {
      loadResumes();
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [token, authLoading]);

  // Handle URL param ?id=xxx to open specific resume
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && resumes.length > 0) {
      const match = resumes.find((r) => r.id === editId);
      if (match) {
        handleOpenResume(match);
      }
    }
  }, [searchParams, resumes]);

  const loadResumes = async () => {
    setIsLoading(true);
    try {
      const list = await fetchUserResumes(token);
      setResumes(list);
    } catch (err) {
      console.error("Error loading resumes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Open a Resume in Editor
  const handleOpenResume = (r: ResumeRecord) => {
    setActiveResumeId(r.id);
    setResumeTitle(r.title);
    setTemplate((r.template as any) || "classic");

    const content = r.content_json || {};
    // Normalize skills to object structure if it was an array
    let normalizedSkills = content.skills;
    if (Array.isArray(normalizedSkills)) {
      normalizedSkills = {
        technical: normalizedSkills,
        tools: [],
        soft: [],
      };
    } else if (!normalizedSkills) {
      normalizedSkills = { technical: [], tools: [], soft: [] };
    }

    setResumeData({
      ...EMPTY_RESUME_DATA,
      ...content,
      skills: normalizedSkills,
      experience: content.experience || [],
      education: content.education || [],
      projects: content.projects || [],
      certifications: content.certifications || [],
      customSections: content.customSections || [],
    });

    setSkippedSections({
      experience: (content.experience || []).length === 0,
      projects: (content.projects || []).length === 0,
      certifications: (content.certifications || []).length === 0,
      custom: (content.customSections || []).length === 0,
    });

    setViewMode("editor");
    setCurrentStep(1);
    setSaveStatus("saved");
  };

  // 3. Create New Resume
  const handleCreateNew = (targetRole?: string) => {
    const title = targetRole ? `${targetRole} Resume` : "My Professional Resume";
    const newDoc: ResumeData = {
      ...EMPTY_RESUME_DATA,
      professionalTitle: targetRole || "Software Engineer",
      fullName: user?.full_name || "",
      email: user?.email || "",
    };

    setActiveResumeId(null);
    setResumeTitle(title);
    setTemplate("classic");
    setResumeData(newDoc);
    setSkippedSections({
      experience: false,
      projects: false,
      certifications: false,
      custom: false,
    });
    setViewMode("editor");
    setCurrentStep(1);
    setSaveStatus("unsaved");
  };

  // 4. Autosave Debouncing
  const triggerAutosave = (updatedData: ResumeData, updatedTitle = resumeTitle, updatedTpl = template) => {
    setSaveStatus("unsaved");
    if (!token) return; // Unauthenticated users edit locally

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        setSaveStatus("saving");
        const saved = await saveResume(
          {
            id: activeResumeId || undefined,
            title: updatedTitle,
            template: updatedTpl,
            content_json: updatedData,
          },
          token
        );
        if (!activeResumeId && saved.id) {
          setActiveResumeId(saved.id);
        }
        setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        setSaveStatus("saved");
        // Update list in background
        setResumes((prev) => {
          const idx = prev.findIndex((r) => r.id === saved.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = saved;
            return next;
          }
          return [saved, ...prev];
        });
      } catch (err) {
        console.error("Autosave error:", err);
        setSaveStatus("unsaved");
      }
    }, 1200);
  };

  const updateField = (field: keyof ResumeData, value: any) => {
    setResumeData((prev) => {
      const updated = { ...prev, [field]: value };
      triggerAutosave(updated);
      return updated;
    });
  };

  // 5. Duplicate Resume
  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    try {
      const copy = await duplicateResume(id, token);
      setResumes((prev) => [copy, ...prev]);
    } catch (err) {
      alert("Failed to duplicate resume.");
    }
  };

  // 6. Delete Resume
  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this resume?")) return;
    if (!token) {
      if (activeResumeId === id) setViewMode("dashboard");
      return;
    }
    try {
      await deleteResume(id, token);
      setResumes((prev) => prev.filter((r) => r.id !== id));
      if (activeResumeId === id) {
        setViewMode("dashboard");
        setActiveResumeId(null);
      }
    } catch (err) {
      alert("Failed to delete resume.");
    }
  };

  // 7. Rename Resume
  const handleOpenRename = (r: ResumeRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameTarget({ id: r.id, title: r.title });
    setRenameInput(r.title);
    setShowRenameModal(true);
  };

  const handleSaveRename = async () => {
    if (!renameTarget || !renameInput.trim()) return;
    if (!token) {
      if (activeResumeId === renameTarget.id) setResumeTitle(renameInput.trim());
      setShowRenameModal(false);
      return;
    }
    try {
      const r = resumes.find((x) => x.id === renameTarget.id);
      if (r) {
        const updated = await saveResume(
          {
            id: r.id,
            title: renameInput.trim(),
            template: r.template,
            content_json: r.content_json,
          },
          token
        );
        setResumes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        if (activeResumeId === updated.id) {
          setResumeTitle(updated.title);
        }
      }
    } catch (err) {
      alert("Failed to rename resume.");
    } finally {
      setShowRenameModal(false);
    }
  };

  // 8. Completion Score Calculation
  const completionPercentage = useMemo(() => {
    let score = 0;
    if (resumeData.fullName?.trim()) score += 15;
    if (resumeData.email?.trim()) score += 10;
    if (resumeData.phone?.trim()) score += 5;
    if (resumeData.summary?.trim() && resumeData.summary.length > 50) score += 20;

    const skillsCount = getAllSkills(resumeData).length;
    if (skillsCount >= 4) score += 20;
    else if (skillsCount > 0) score += 10;

    if (resumeData.education && resumeData.education.length > 0) score += 15;

    // Optional sections add points if filled, or count towards total if intentionally skipped
    if (resumeData.experience && resumeData.experience.length > 0) score += 10;
    else if (skippedSections.experience) score += 10; // No penalty for freshers who skip

    if (resumeData.projects && resumeData.projects.length > 0) score += 5;
    else if (skippedSections.projects) score += 5;

    return Math.min(100, score);
  }, [resumeData, skippedSections]);

  // 9. Export Handlers
  const handleExportPDF = async () => {
    if (!activeResumeId) {
      // Must save first
      if (token) {
        const saved = await saveResume(
          { title: resumeTitle, template, content_json: resumeData },
          token
        );
        setActiveResumeId(saved.id);
        const blob = await exportResumePdf(saved.id, template, token);
        downloadBlob(blob, `${resumeTitle}.pdf`);
      } else {
        window.print();
      }
      return;
    }
    try {
      const blob = await exportResumePdf(activeResumeId, template, token);
      downloadBlob(blob, `${resumeTitle}.pdf`);
    } catch (err) {
      alert("Server PDF export encountered an issue. You can use Browser Print as an instant alternative.");
    }
  };

  const handleExportDOCX = async () => {
    if (!activeResumeId) {
      if (token) {
        const saved = await saveResume(
          { title: resumeTitle, template, content_json: resumeData },
          token
        );
        setActiveResumeId(saved.id);
        const blob = await exportResumeDocx(saved.id, token);
        downloadBlob(blob, `${resumeTitle}.docx`);
      } else {
        alert("Please sign in or save your resume to export DOCX.");
      }
      return;
    }
    try {
      const blob = await exportResumeDocx(activeResumeId, token);
      downloadBlob(blob, `${resumeTitle}.docx`);
    } catch (err) {
      alert("DOCX export encountered an error.");
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  // 10. AI Assistant Modal Call
  const openAIAssistant = async (task: "summary" | "bullets" | "project" | "enhance", context: any) => {
    setAiTask(task);
    setAiContext(context);
    setAiLoading(true);
    setAiSuggestion(null);
    setShowAIModal(true);

    try {
      const res = await suggestResumeAI(task, context, token);
      setAiSuggestion(res);
      setAiEditedText(res.suggested || (res.bullets ? res.bullets.join("\n") : ""));
    } catch (err: any) {
      alert(err.message || "Failed to generate AI suggestion");
      setShowAIModal(false);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAISuggestion = () => {
    if (!aiSuggestion) return;
    const finalContent = aiEditedText.trim();

    if (aiTask === "summary") {
      updateField("summary", finalContent);
    } else if (aiTask === "bullets" && aiContext.expId) {
      const newBullets = finalContent
        .split("\n")
        .map((b) => b.replace(/^[-•*]\s*/, "").trim())
        .filter(Boolean);
      const nextExp = resumeData.experience.map((e) => {
        if (e.id === aiContext.expId) {
          return { ...e, bullets: newBullets, description: finalContent };
        }
        return e;
      });
      updateField("experience", nextExp);
    } else if (aiTask === "project" && aiContext.projId) {
      const nextProj = resumeData.projects.map((p) => {
        if (p.id === aiContext.projId) {
          return { ...p, description: finalContent };
        }
        return p;
      });
      updateField("projects", nextProj);
    }

    setShowAIModal(false);
  };

  // 11. Import Document Handler
  const handleFileImport = async () => {
    if (!importFile) return;
    setImportLoading(true);
    setImportWarnings([]);
    setImportSuccess(false);

    try {
      const res = await importResume(importFile, token);
      if (res.success && res.parsed_data) {
        const pd = res.parsed_data;
        const skillsObj = typeof pd.skills === "object" && !Array.isArray(pd.skills)
          ? pd.skills
          : { technical: Array.isArray(pd.skills) ? pd.skills : [], tools: [], soft: [] };

        setResumeData({
          ...EMPTY_RESUME_DATA,
          fullName: pd.fullName || resumeData.fullName,
          professionalTitle: pd.professionalTitle || pd.title || resumeData.professionalTitle,
          email: pd.email || resumeData.email,
          phone: pd.phone || resumeData.phone,
          location: pd.location || resumeData.location,
          linkedin: pd.linkedin || resumeData.linkedin,
          github: pd.github || resumeData.github,
          website: pd.website || resumeData.website,
          summary: pd.summary || resumeData.summary,
          skills: skillsObj,
          experience: (pd.experience as any) || [],
          education: (pd.education as any) || [],
          projects: (pd.projects as any) || [],
          certifications: (pd.certifications as any) || [],
        });

        setImportWarnings(res.warnings || []);
        setImportSuccess(true);
        triggerAutosave(resumeData);
      }
    } catch (err: any) {
      alert(err.message || "Failed to parse resume document.");
    } finally {
      setImportLoading(false);
    }
  };

  // Skills Helper
  const addSkill = (category: "technical" | "tools" | "soft", value: string) => {
    if (!value.trim()) return;
    const currentSkills =
      typeof resumeData.skills === "object" && !Array.isArray(resumeData.skills)
        ? { ...resumeData.skills }
        : { technical: [], tools: [], soft: [] };

    const catList = currentSkills[category] || [];
    if (!catList.includes(value.trim())) {
      currentSkills[category] = [...catList, value.trim()];
      updateField("skills", currentSkills);
    }
  };

  const removeSkill = (category: "technical" | "tools" | "soft", skillToRemove: string) => {
    const currentSkills =
      typeof resumeData.skills === "object" && !Array.isArray(resumeData.skills)
        ? { ...resumeData.skills }
        : { technical: [], tools: [], soft: [] };

    currentSkills[category] = (currentSkills[category] || []).filter((s) => s !== skillToRemove);
    updateField("skills", currentSkills);
  };

  return (
    <AppSidebarLayout>
      <div className="min-h-screen bg-background text-foreground pb-20">
        {/* ============================================================== */}
        {/* TOP BAR / NAVIGATION                                           */}
        {/* ============================================================== */}
        <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md px-4 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {viewMode === "editor" ? (
                <button
                  onClick={() => setViewMode("dashboard")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-4 h-4" />
                  All Resumes
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold tracking-tight">Resume Builder</h1>
                    <p className="text-xs text-muted-foreground">ATS-Compliant Multi-Role Resume Studio</p>
                  </div>
                </div>
              )}

              {viewMode === "editor" && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground hidden sm:inline">/</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm max-w-[200px] sm:max-w-xs truncate">
                      {resumeTitle}
                    </span>
                    <button
                      onClick={() => {
                        setRenameInput(resumeTitle);
                        setRenameTarget({ id: activeResumeId || "current", title: resumeTitle });
                        setShowRenameModal(true);
                      }}
                      className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted"
                      title="Rename Resume"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Action Controls */}
            <div className="flex items-center gap-2">
              {viewMode === "editor" ? (
                <>
                  {/* Autosave Status indicator */}
                  <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground mr-2">
                    {saveStatus === "saving" && (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        <span>Saving...</span>
                      </>
                    )}
                    {saveStatus === "saved" && (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Saved {lastSaved ? `at ${lastSaved}` : ""}</span>
                      </>
                    )}
                    {saveStatus === "unsaved" && (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>Unsaved</span>
                      </>
                    )}
                  </div>

                  {/* Template Picker */}
                  <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border text-xs">
                    {(["classic", "modern", "minimal", "technical"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setTemplate(t);
                          triggerAutosave(resumeData, resumeTitle, t);
                        }}
                        className={`px-2.5 py-1 rounded font-medium capitalize transition-colors ${
                          template === t
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* ATS Check Direct Link */}
                  {activeResumeId && (
                    <Link
                      href={`/ats-checker?resumeId=${activeResumeId}`}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                    >
                      <Target className="w-3.5 h-3.5" />
                      Check ATS
                    </Link>
                  )}

                  {/* Export Dropdown / Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleExportPDF}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                    <button
                      onClick={handleExportDOCX}
                      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
                      title="Download DOCX"
                    >
                      DOCX
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Import PDF/DOCX</span>
                  </button>
                  <button
                    onClick={() => handleCreateNew()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Resume</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ============================================================== */}
        {/* VIEW 1: DASHBOARD (MY RESUMES & CREATION HUB)                  */}
        {/* ============================================================== */}
        {viewMode === "dashboard" && (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            {/* Quick Hero / Callout */}
            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-card to-card border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary">
                  <Sparkles className="w-3.5 h-3.5" />
                  ATS Optimization Ready
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Tailor Resumes for Every Role</h2>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Create dedicated target resumes for Backend, Frontend, Full Stack, or Data roles.
                  Each resume maintains its own content, ATS-friendly template, and export history.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => handleCreateNew("Backend Engineer")}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted transition-colors"
                >
                  + Backend Role
                </button>
                <button
                  onClick={() => handleCreateNew("Frontend Engineer")}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted transition-colors"
                >
                  + Frontend Role
                </button>
                <button
                  onClick={() => handleCreateNew("Data Analyst")}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted transition-colors"
                >
                  + Data Analyst
                </button>
              </div>
            </div>

            {/* My Resumes Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold tracking-tight">My Resumes</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    {resumes.length}
                  </span>
                </div>
              </div>

              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-muted-foreground space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm">Loading your saved resumes...</p>
                </div>
              ) : resumes.length === 0 ? (
                /* Empty State */
                <div className="p-12 text-center rounded-2xl border-2 border-dashed border-border bg-card/50 flex flex-col items-center justify-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <h4 className="text-base font-semibold">No resumes created yet</h4>
                    <p className="text-xs text-muted-foreground">
                      Start by building your first ATS-compliant resume or import your existing PDF/DOCX to get
                      real-time keyword optimization suggestions.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handleCreateNew()}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Create First Resume
                    </button>
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="px-4 py-2 rounded-lg border border-border text-foreground font-medium text-xs hover:bg-muted transition-colors flex items-center gap-1.5"
                    >
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      Import File
                    </button>
                  </div>
                </div>
              ) : (
                /* Resumes Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Create New Quick Tile */}
                  <div
                    onClick={() => handleCreateNew()}
                    className="group border-2 border-dashed border-border hover:border-primary/50 bg-card/40 hover:bg-card rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[220px]"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 text-primary flex items-center justify-center mb-3 transition-colors">
                      <Plus className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-sm group-hover:text-primary transition-colors">
                      Create New Resume
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Start fresh for another job profile
                    </span>
                  </div>

                  {resumes.map((r) => {
                    const c = r.content_json || {};
                    const role = c.professionalTitle || c.title || "General";
                    const lastUpdated = new Date(r.updated_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                    // Quick completion calculation
                    let cScore = 20;
                    if (c.fullName) cScore += 15;
                    if (c.email) cScore += 15;
                    if (c.summary) cScore += 20;
                    const cSkills = c.skills;
                    const hasSkills = Array.isArray(cSkills) ? cSkills.length > 0 : Boolean(cSkills && (((cSkills as any).technical?.length || 0) > 0 || ((cSkills as any).tools?.length || 0) > 0));
                    if (hasSkills) cScore += 15;
                    if ((c.experience || []).length > 0) cScore += 15;
                    cScore = Math.min(100, cScore);

                    return (
                      <div
                        key={r.id}
                        onClick={() => handleOpenResume(r)}
                        className="group bg-card border border-border hover:border-primary/40 rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-lg relative overflow-hidden"
                      >
                        {/* Header */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="space-y-1">
                              <h4 className="font-bold text-base group-hover:text-primary transition-colors line-clamp-1">
                                {r.title}
                              </h4>
                              <p className="text-xs text-muted-foreground font-medium">
                                Target: <span className="text-foreground">{role}</span>
                              </p>
                            </div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {r.template || "classic"}
                            </span>
                          </div>

                          {/* Completion Progress Bar */}
                          <div className="mt-4 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Completion</span>
                              <span className="font-semibold text-foreground">{cScore}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  cScore >= 80 ? "bg-emerald-500" : cScore >= 50 ? "bg-amber-500" : "bg-primary"
                                }`}
                                style={{ width: `${cScore}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Footer & Actions */}
                        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                          <span>Updated {lastUpdated}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => handleDuplicate(r.id, e)}
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Duplicate Resume"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleOpenRename(r, e)}
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Rename"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(r.id, e)}
                              className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <span className="ml-1 px-2.5 py-1 rounded bg-primary/10 text-primary font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                              Edit &rarr;
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: SPLIT-SCREEN RESUME EDITOR                             */}
        {/* ============================================================== */}
        {viewMode === "editor" && (
          <main className="max-w-[1700px] mx-auto px-4 sm:px-6 py-6">
            {/* Mobile View Toggle */}
            <div className="lg:hidden flex items-center justify-center p-1 bg-muted rounded-xl mb-4 border border-border">
              <button
                onClick={() => setMobileTab("form")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  mobileTab === "form" ? "bg-card text-foreground shadow" : "text-muted-foreground"
                }`}
              >
                1. Edit Sections
              </button>
              <button
                onClick={() => setMobileTab("preview")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  mobileTab === "preview" ? "bg-card text-foreground shadow" : "text-muted-foreground"
                }`}
              >
                2. Live Preview
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* ========================================================== */}
              {/* LEFT COLUMN: MULTI-STEP RESUME FORM (7 cols)               */}
              {/* ========================================================== */}
              <div
                className={`lg:col-span-6 space-y-6 ${
                  mobileTab === "preview" ? "hidden lg:block" : "block"
                }`}
              >
                {/* Progress / Step Navigator */}
                <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted-foreground uppercase tracking-wider">
                      Step {currentStep} of 8:{" "}
                      <span className="text-foreground">
                        {currentStep === 1 && "Personal Information"}
                        {currentStep === 2 && "Professional Summary"}
                        {currentStep === 3 && "Work Experience"}
                        {currentStep === 4 && "Education"}
                        {currentStep === 5 && "Skills & Tools"}
                        {currentStep === 6 && "Projects"}
                        {currentStep === 7 && "Certifications"}
                        {currentStep === 8 && "Custom Sections"}
                      </span>
                    </span>
                    <span className="font-bold text-primary">{completionPercentage}% Completed</span>
                  </div>

                  {/* Step Buttons Bar */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {[
                      { step: 1, label: "Info", icon: FileText },
                      { step: 2, label: "Summary", icon: Sparkles },
                      { step: 3, label: "Exp", icon: Briefcase, optional: true },
                      { step: 4, label: "Edu", icon: GraduationCap },
                      { step: 5, label: "Skills", icon: Code2 },
                      { step: 6, label: "Projects", icon: FolderGit2, optional: true },
                      { step: 7, label: "Certs", icon: Award, optional: true },
                      { step: 8, label: "Extra", icon: Layers, optional: true },
                    ].map((s) => {
                      const Icon = s.icon;
                      const isActive = currentStep === s.step;
                      const isComplete =
                        (s.step === 1 && Boolean(resumeData.fullName && resumeData.email)) ||
                        (s.step === 2 && Boolean(resumeData.summary)) ||
                        (s.step === 3 && (resumeData.experience.length > 0 || skippedSections.experience)) ||
                        (s.step === 4 && resumeData.education.length > 0) ||
                        (s.step === 5 && getAllSkills(resumeData).length > 0) ||
                        (s.step === 6 && (resumeData.projects.length > 0 || skippedSections.projects)) ||
                        (s.step === 7 && (resumeData.certifications.length > 0 || skippedSections.certifications));

                      return (
                        <button
                          key={s.step}
                          onClick={() => setCurrentStep(s.step)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : isComplete
                              ? "bg-muted text-foreground hover:bg-muted/80"
                              : "bg-transparent text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{s.label}</span>
                          {isComplete && !isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ======================================================== */}
                {/* STEP 1: PERSONAL INFORMATION                             */}
                {/* ======================================================== */}
                {currentStep === 1 && (
                  <div className="p-6 rounded-2xl bg-card border border-border space-y-5 animate-in fade-in duration-200">
                    <div className="border-b border-border pb-3">
                      <h3 className="text-base font-bold">Personal Information</h3>
                      <p className="text-xs text-muted-foreground">
                        Your direct contact info and target role headline.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground">
                          Full Name <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="text"
                          value={resumeData.fullName}
                          onChange={(e) => updateField("fullName", e.target.value)}
                          placeholder="e.g. Aarav Sharma"
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-foreground"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground">
                          Target Role / Title <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="text"
                          value={resumeData.professionalTitle || ""}
                          onChange={(e) => updateField("professionalTitle", e.target.value)}
                          placeholder="e.g. Full Stack Engineer"
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-foreground"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground">
                          Email Address <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="email"
                          value={resumeData.email}
                          onChange={(e) => updateField("email", e.target.value)}
                          placeholder="aarav@example.com"
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-foreground"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground">Phone Number</label>
                        <input
                          type="tel"
                          value={resumeData.phone}
                          onChange={(e) => updateField("phone", e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-foreground"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="font-semibold text-foreground">City, State / Country</label>
                        <input
                          type="text"
                          value={resumeData.location}
                          onChange={(e) => updateField("location", e.target.value)}
                          placeholder="Bengaluru, Karnataka, India"
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-foreground"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground">LinkedIn URL (Optional)</label>
                        <input
                          type="url"
                          value={resumeData.linkedin || ""}
                          onChange={(e) => updateField("linkedin", e.target.value)}
                          placeholder="linkedin.com/in/username"
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-foreground"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground">GitHub URL (Optional)</label>
                        <input
                          type="url"
                          value={resumeData.github || ""}
                          onChange={(e) => updateField("github", e.target.value)}
                          placeholder="github.com/username"
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-foreground"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="font-semibold text-foreground">
                          Portfolio / Personal Website (Optional)
                        </label>
                        <input
                          type="url"
                          value={resumeData.portfolio || resumeData.website || ""}
                          onChange={(e) => {
                            updateField("portfolio", e.target.value);
                            updateField("website", e.target.value);
                          }}
                          placeholder="https://yourname.dev"
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-foreground"
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-end">
                      <button
                        onClick={() => setCurrentStep(2)}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
                      >
                        <span>Next: Professional Summary</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* STEP 2: PROFESSIONAL SUMMARY                             */}
                {/* ======================================================== */}
                {currentStep === 2 && (
                  <div className="p-6 rounded-2xl bg-card border border-border space-y-5 animate-in fade-in duration-200">
                    <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
                      <div>
                        <h3 className="text-base font-bold">Professional Summary</h3>
                        <p className="text-xs text-muted-foreground">
                          A targeted 2-4 sentence executive overview highlighting strengths and target role.
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          openAIAssistant("summary", {
                            target_role: resumeData.professionalTitle || "Software Engineer",
                            skills: getSkillsCategory(resumeData, 'technical'),
                            current_summary: resumeData.summary,
                          })
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Summary Copilot
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <textarea
                        rows={6}
                        value={resumeData.summary}
                        onChange={(e) => updateField("summary", e.target.value)}
                        placeholder="e.g. Results-driven Full Stack Engineer with 3+ years of experience designing and shipping scalable web applications and high-throughput microservices. Proficient in Python, FastAPI, React, Next.js, and cloud deployments on AWS and Docker."
                        className="w-full p-3.5 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-foreground leading-relaxed resize-y"
                      />
                      <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                        <span>Recommended: 50 - 90 words</span>
                        <span>{resumeData.summary.split(/\s+/).filter(Boolean).length} words</span>
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="px-4 py-2 rounded-lg border border-border font-medium text-xs hover:bg-muted transition-colors flex items-center gap-1.5"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button
                        onClick={() => setCurrentStep(3)}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
                      >
                        <span>Next: Work Experience</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* STEP 3: WORK EXPERIENCE (COMPLETELY OPTIONAL)            */}
                {/* ======================================================== */}
                {currentStep === 3 && (
                  <div className="p-6 rounded-2xl bg-card border border-border space-y-5 animate-in fade-in duration-200">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold">Work Experience</h3>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                            Optional for Freshers
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Internships, full-time, contract, or open-source roles.
                        </p>
                      </div>

                      {/* Explicit Skip Button for Students / Freshers */}
                      <button
                        onClick={() => {
                          setSkippedSections((prev) => ({ ...prev, experience: !prev.experience }));
                          if (!skippedSections.experience) {
                            setCurrentStep(4);
                          }
                        }}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                          skippedSections.experience
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                            : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {skippedSections.experience
                          ? "✓ Section Skipped (Freshers)"
                          : "Skip this section (I have no experience)"}
                      </button>
                    </div>

                    {skippedSections.experience ? (
                      <div className="p-6 rounded-xl bg-muted/40 border border-border text-center space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                        <h4 className="font-semibold text-sm">Experience section skipped</h4>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          No penalty applied. For student and fresher profiles, ATS scores place heavier weight
                          on your Projects, Education, and Verified Skills.
                        </p>
                        <button
                          onClick={() => setSkippedSections((prev) => ({ ...prev, experience: false }))}
                          className="text-xs text-primary underline pt-1 inline-block"
                        >
                          Want to add an internship or role instead?
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {resumeData.experience.map((exp, index) => (
                          <div
                            key={exp.id}
                            className="p-4 rounded-xl border border-border bg-background space-y-3 relative group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-primary">
                                Role #{index + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    openAIAssistant("bullets", {
                                      role: exp.title,
                                      company: exp.company,
                                      bullets: exp.bullets || [exp.description],
                                      expId: exp.id,
                                    })
                                  }
                                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  Improve with AI
                                </button>
                                <button
                                  onClick={() => {
                                    const next = resumeData.experience.filter((e) => e.id !== exp.id);
                                    updateField("experience", next);
                                  }}
                                  className="p-1 text-muted-foreground hover:text-destructive rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div>
                                <label className="font-medium text-muted-foreground">Job Title</label>
                                <input
                                  type="text"
                                  value={exp.title}
                                  onChange={(e) => {
                                    const next = [...resumeData.experience];
                                    next[index].title = e.target.value;
                                    updateField("experience", next);
                                  }}
                                  placeholder="e.g. Software Engineer"
                                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
                                />
                              </div>

                              <div>
                                <label className="font-medium text-muted-foreground">Company Name</label>
                                <input
                                  type="text"
                                  value={exp.company}
                                  onChange={(e) => {
                                    const next = [...resumeData.experience];
                                    next[index].company = e.target.value;
                                    updateField("experience", next);
                                  }}
                                  placeholder="e.g. Google / Microsoft"
                                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
                                />
                              </div>

                              <div>
                                <label className="font-medium text-muted-foreground">Start Date</label>
                                <input
                                  type="text"
                                  value={exp.startDate || ""}
                                  onChange={(e) => {
                                    const next = [...resumeData.experience];
                                    next[index].startDate = e.target.value;
                                    updateField("experience", next);
                                  }}
                                  placeholder="e.g. Jun 2022"
                                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
                                />
                              </div>

                              <div>
                                <label className="font-medium text-muted-foreground">End Date</label>
                                <input
                                  type="text"
                                  disabled={exp.current}
                                  value={exp.current ? "Present" : exp.endDate || ""}
                                  onChange={(e) => {
                                    const next = [...resumeData.experience];
                                    next[index].endDate = e.target.value;
                                    updateField("experience", next);
                                  }}
                                  placeholder="e.g. Present"
                                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground disabled:opacity-50"
                                />
                              </div>

                              <div className="sm:col-span-2 flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`current-${exp.id}`}
                                  checked={Boolean(exp.current)}
                                  onChange={(e) => {
                                    const next = [...resumeData.experience];
                                    next[index].current = e.target.checked;
                                    if (e.target.checked) next[index].endDate = "Present";
                                    updateField("experience", next);
                                  }}
                                  className="rounded border-border text-primary"
                                />
                                <label htmlFor={`current-${exp.id}`} className="text-muted-foreground cursor-pointer">
                                  I currently work in this role
                                </label>
                              </div>

                              <div className="sm:col-span-2 space-y-1">
                                <label className="font-medium text-muted-foreground">
                                  Key Achievements & Responsibilities (Use action verbs & numbers)
                                </label>
                                <textarea
                                  rows={4}
                                  value={
                                    exp.bullets && exp.bullets.length > 0
                                      ? exp.bullets.join("\n")
                                      : exp.description || ""
                                  }
                                  onChange={(e) => {
                                    const next = [...resumeData.experience];
                                    const lines = e.target.value.split("\n");
                                    next[index].description = e.target.value;
                                    next[index].bullets = lines;
                                    updateField("experience", next);
                                  }}
                                  placeholder="• Architected microservices handling 25,000+ daily queries with sub-90ms latency&#10;• Reduced PostgreSQL database query times by 42%"
                                  className="w-full p-2.5 rounded-lg bg-card border border-border text-foreground leading-relaxed"
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={() => {
                            const newEntry: ExperienceItem = {
                              id: `exp-${Date.now()}`,
                              title: "",
                              company: "",
                              location: "",
                              startDate: "",
                              endDate: "",
                              current: false,
                              description: "",
                              bullets: [],
                            };
                            updateField("experience", [...resumeData.experience, newEntry]);
                          }}
                          className="w-full py-2.5 rounded-xl border border-dashed border-border hover:border-primary text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Add Work Experience
                        </button>
                      </div>
                    )}

                    <div className="pt-4 flex items-center justify-between">
                      <button
                        onClick={() => setCurrentStep(2)}
                        className="px-4 py-2 rounded-lg border border-border font-medium text-xs hover:bg-muted transition-colors flex items-center gap-1.5"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button
                        onClick={() => setCurrentStep(4)}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
                      >
                        <span>Next: Education</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* STEP 4: EDUCATION                                        */}
                {/* ======================================================== */}
                {currentStep === 4 && (
                  <div className="p-6 rounded-2xl bg-card border border-border space-y-5 animate-in fade-in duration-200">
                    <div className="border-b border-border pb-3">
                      <h3 className="text-base font-bold">Education Details</h3>
                      <p className="text-xs text-muted-foreground">
                        Your university, degree, coursework, and graduation dates.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {resumeData.education.map((edu, index) => (
                        <div
                          key={edu.id}
                          className="p-4 rounded-xl border border-border bg-background space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-primary">
                              Degree #{index + 1}
                            </span>
                            <button
                              onClick={() => {
                                const next = resumeData.education.filter((e) => e.id !== edu.id);
                                updateField("education", next);
                              }}
                              className="p-1 text-muted-foreground hover:text-destructive rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="sm:col-span-2">
                              <label className="font-medium text-muted-foreground">Degree / Major</label>
                              <input
                                type="text"
                                value={edu.degree}
                                onChange={(e) => {
                                  const next = [...resumeData.education];
                                  next[index].degree = e.target.value;
                                  updateField("education", next);
                                }}
                                placeholder="e.g. B.Tech in Computer Science"
                                className="w-full mt-1 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
                              />
                            </div>

                            <div>
                              <label className="font-medium text-muted-foreground">University / School</label>
                              <input
                                type="text"
                                value={edu.school}
                                onChange={(e) => {
                                  const next = [...resumeData.education];
                                  next[index].school = e.target.value;
                                  updateField("education", next);
                                }}
                                placeholder="e.g. National Institute of Technology"
                                className="w-full mt-1 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
                              />
                            </div>

                            <div>
                              <label className="font-medium text-muted-foreground">Graduation Year</label>
                              <input
                                type="text"
                                value={edu.gradYear}
                                onChange={(e) => {
                                  const next = [...resumeData.education];
                                  next[index].gradYear = e.target.value;
                                  updateField("education", next);
                                }}
                                placeholder="e.g. 2024 or Expected 2025"
                                className="w-full mt-1 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
                              />
                            </div>

                            <div>
                              <label className="font-medium text-muted-foreground">Location</label>
                              <input
                                type="text"
                                value={edu.location || ""}
                                onChange={(e) => {
                                  const next = [...resumeData.education];
                                  next[index].location = e.target.value;
                                  updateField("education", next);
                                }}
                                placeholder="e.g. New Delhi, India"
                                className="w-full mt-1 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
                              />
                            </div>

                            <div>
                              <label className="font-medium text-muted-foreground">GPA / Percentage (Optional)</label>
                              <input
                                type="text"
                                value={edu.gpa || ""}
                                onChange={(e) => {
                                  const next = [...resumeData.education];
                                  next[index].gpa = e.target.value;
                                  updateField("education", next);
                                }}
                                placeholder="e.g. 8.8 / 10.0"
                                className="w-full mt-1 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => {
                          const newEdu: EducationItem = {
                            id: `edu-${Date.now()}`,
                            degree: "",
                            school: "",
                            location: "",
                            gradYear: "",
                            gpa: "",
                          };
                          updateField("education", [...resumeData.education, newEdu]);
                        }}
                        className="w-full py-2.5 rounded-xl border border-dashed border-border hover:border-primary text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Education Entry
                      </button>
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                      <button
                        onClick={() => setCurrentStep(3)}
                        className="px-4 py-2 rounded-lg border border-border font-medium text-xs hover:bg-muted transition-colors flex items-center gap-1.5"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button
                        onClick={() => setCurrentStep(5)}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
                      >
                        <span>Next: Skills & Tools</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* STEP 5: SKILLS & TOOLS (CATEGORIZED)                     */}
                {/* ======================================================== */}
                {currentStep === 5 && (
                  <div className="p-6 rounded-2xl bg-card border border-border space-y-6 animate-in fade-in duration-200">
                    <div className="border-b border-border pb-3">
                      <h3 className="text-base font-bold">Skills & Tools</h3>
                      <p className="text-xs text-muted-foreground">
                        Categorized skills increase ATS parsing accuracy by 40%. Add both technical and tooling tags.
                      </p>
                    </div>

                    {/* Technical Skills */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-foreground">
                          Core Languages & Frameworks
                        </label>
                        <span className="text-[11px] text-muted-foreground">Press Enter to add</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={techSkillInput}
                          onChange={(e) => setTechSkillInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addSkill("technical", techSkillInput);
                              setTechSkillInput("");
                            }
                          }}
                          placeholder="e.g. Python, React, FastAPI, PostgreSQL"
                          className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground outline-none focus:border-primary"
                        />
                        <button
                          onClick={() => {
                            addSkill("technical", techSkillInput);
                            setTechSkillInput("");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                        >
                          Add
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {getSkillsCategory(resumeData, 'technical').map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                          >
                            {s}
                            <button
                              onClick={() => removeSkill("technical", s)}
                              className="hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Tools & Infrastructure */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      <label className="text-xs font-semibold text-foreground">
                        Developer Tools, Cloud & Databases
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={toolSkillInput}
                          onChange={(e) => setToolSkillInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addSkill("tools", toolSkillInput);
                              setToolSkillInput("");
                            }
                          }}
                          placeholder="e.g. Docker, AWS, Git, Redis, Linux, Postman"
                          className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground outline-none focus:border-primary"
                        />
                        <button
                          onClick={() => {
                            addSkill("tools", toolSkillInput);
                            setToolSkillInput("");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                        >
                          Add
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {getSkillsCategory(resumeData, 'tools').map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-foreground border border-border"
                          >
                            {s}
                            <button
                              onClick={() => removeSkill("tools", s)}
                              className="hover:text-destructive text-muted-foreground"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Soft Skills */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      <label className="text-xs font-semibold text-foreground">
                        Soft Skills & Methodologies
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={softSkillInput}
                          onChange={(e) => setSoftSkillInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addSkill("soft", softSkillInput);
                              setSoftSkillInput("");
                            }
                          }}
                          placeholder="e.g. Agile, System Design, Mentorship, Team Leadership"
                          className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground outline-none focus:border-primary"
                        />
                        <button
                          onClick={() => {
                            addSkill("soft", softSkillInput);
                            setSoftSkillInput("");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                        >
                          Add
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {getSkillsCategory(resumeData, 'soft').map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted/60 text-muted-foreground border border-border"
                          >
                            {s}
                            <button
                              onClick={() => removeSkill("soft", s)}
                              className="hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                      <button
                        onClick={() => setCurrentStep(4)}
                        className="px-4 py-2 rounded-lg border border-border font-medium text-xs hover:bg-muted transition-colors flex items-center gap-1.5"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button
                        onClick={() => setCurrentStep(6)}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
                      >
                        <span>Next: Projects</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* STEP 6: PROJECTS (OPTIONAL WITH CLEAR SKIP)              */}
                {/* ======================================================== */}
                {currentStep === 6 && (
                  <div className="p-6 rounded-2xl bg-card border border-border space-y-5 animate-in fade-in duration-200">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold">Key Projects</h3>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                            Strongly Recommended
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Independent apps, open-source work, academic caps, or hackathon projects.
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setSkippedSections((prev) => ({ ...prev, projects: !prev.projects }));
                          if (!skippedSections.projects) setCurrentStep(7);
                        }}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                          skippedSections.projects
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                            : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {skippedSections.projects ? "✓ Section Skipped" : "Skip this section"}
                      </button>
                    </div>

                    {skippedSections.projects ? (
                      <div className="p-6 rounded-xl bg-muted/40 border border-border text-center space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                        <h4 className="font-semibold text-sm">Projects section skipped</h4>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          You can always add projects later if applying for developer roles that require code portfolios.
                        </p>
                        <button
                          onClick={() => setSkippedSections((prev) => ({ ...prev, projects: false }))}
                          className="text-xs text-primary underline pt-1 inline-block"
                        >
                          Enable projects section
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {resumeData.projects.map((proj, index) => (
                          <div
                            key={proj.id}
                            className="p-4 rounded-xl border border-border bg-background space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-primary">
                                Project #{index + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    openAIAssistant("project", {
                                      project_name: proj.name,
                                      tech_stack: proj.technologies,
                                      description: proj.description,
                                      projId: proj.id,
                                    })
                                  }
                                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  Enhance with AI
                                </button>
                                <button
                                  onClick={() => {
                                    const next = resumeData.projects.filter((p) => p.id !== proj.id);
                                    updateField("projects", next);
                                  }}
                                  className="p-1 text-muted-foreground hover:text-destructive rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div>
                                <label className="font-medium text-muted-foreground">Project Title</label>
                                <input
                                  type="text"
                                  value={proj.name}
                                  onChange={(e) => {
                                    const next = [...resumeData.projects];
                                    next[index].name = e.target.value;
                                    updateField("projects", next);
                                  }}
                                  placeholder="e.g. Rozgar Radar Intelligence Platform"
                                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
                                />
                              </div>

                              <div>
                                <label className="font-medium text-muted-foreground">Technologies Used</label>
                                <input
                                  type="text"
                                  value={
                                    Array.isArray(proj.technologies)
                                      ? proj.technologies.join(", ")
                                      : proj.technologies || ""
                                  }
                                  onChange={(e) => {
                                    const next = [...resumeData.projects];
                                    next[index].technologies = e.target.value;
                                    updateField("projects", next);
                                  }}
                                  placeholder="e.g. Next.js, FastAPI, Docker, PostgreSQL"
                                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <label className="font-medium text-muted-foreground">
                                  Live URL or Repository Link
                                </label>
                                <input
                                  type="url"
                                  value={proj.link || ""}
                                  onChange={(e) => {
                                    const next = [...resumeData.projects];
                                    next[index].link = e.target.value;
                                    updateField("projects", next);
                                  }}
                                  placeholder="https://github.com/username/project"
                                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
                                />
                              </div>

                              <div className="sm:col-span-2 space-y-1">
                                <label className="font-medium text-muted-foreground">
                                  Project Description & Key Technical Contributions
                                </label>
                                <textarea
                                  rows={3}
                                  value={proj.description || ""}
                                  onChange={(e) => {
                                    const next = [...resumeData.projects];
                                    next[index].description = e.target.value;
                                    updateField("projects", next);
                                  }}
                                  placeholder="Engineered high-concurrency event ingestion pipeline processing 10k messages per second with real-time alerting."
                                  className="w-full p-2.5 rounded-lg bg-card border border-border text-foreground leading-relaxed"
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={() => {
                            const newProj: ProjectItem = {
                              id: `proj-${Date.now()}`,
                              name: "",
                              link: "",
                              technologies: "",
                              description: "",
                              bullets: [],
                            };
                            updateField("projects", [...resumeData.projects, newProj]);
                          }}
                          className="w-full py-2.5 rounded-xl border border-dashed border-border hover:border-primary text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Add Project
                        </button>
                      </div>
                    )}

                    <div className="pt-4 flex items-center justify-between">
                      <button
                        onClick={() => setCurrentStep(5)}
                        className="px-4 py-2 rounded-lg border border-border font-medium text-xs hover:bg-muted transition-colors flex items-center gap-1.5"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button
                        onClick={() => setCurrentStep(7)}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
                      >
                        <span>Next: Certifications</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* STEP 7: CERTIFICATIONS (OPTIONAL WITH SKIP)              */}
                {/* ======================================================== */}
                {currentStep === 7 && (
                  <div className="p-6 rounded-2xl bg-card border border-border space-y-5 animate-in fade-in duration-200">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold">Certifications & Licenses</h3>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                            Optional
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          AWS, Google Cloud, Cisco, Coursera, or industry certifications.
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setSkippedSections((prev) => ({
                            ...prev,
                            certifications: !prev.certifications,
                          }));
                          if (!skippedSections.certifications) setCurrentStep(8);
                        }}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                          skippedSections.certifications
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                            : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {skippedSections.certifications ? "✓ Section Skipped" : "Skip this section"}
                      </button>
                    </div>

                    {skippedSections.certifications ? (
                      <div className="p-6 rounded-xl bg-muted/40 border border-border text-center space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                        <h4 className="font-semibold text-sm">Certifications section skipped</h4>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          Certifications are not required by ATS unless specified as mandatory in the job description.
                        </p>
                        <button
                          onClick={() => setSkippedSections((prev) => ({ ...prev, certifications: false }))}
                          className="text-xs text-primary underline pt-1 inline-block"
                        >
                          Add a certification
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {resumeData.certifications.map((cert, index) => (
                          <div
                            key={cert.id}
                            className="p-4 rounded-xl border border-border bg-background space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-primary">
                                Certification #{index + 1}
                              </span>
                              <button
                                onClick={() => {
                                  const next = resumeData.certifications.filter((c) => c.id !== cert.id);
                                  updateField("certifications", next);
                                }}
                                className="p-1 text-muted-foreground hover:text-destructive rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div className="sm:col-span-2">
                                <label className="font-medium text-muted-foreground">Certification Name</label>
                                <input
                                  type="text"
                                  value={cert.name}
                                  onChange={(e) => {
                                    const next = [...resumeData.certifications];
                                    next[index].name = e.target.value;
                                    updateField("certifications", next);
                                  }}
                                  placeholder="e.g. AWS Certified Solutions Architect"
                                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
                                />
                              </div>

                              <div>
                                <label className="font-medium text-muted-foreground">Issuing Authority</label>
                                <input
                                  type="text"
                                  value={cert.issuer}
                                  onChange={(e) => {
                                    const next = [...resumeData.certifications];
                                    next[index].issuer = e.target.value;
                                    updateField("certifications", next);
                                  }}
                                  placeholder="e.g. Amazon Web Services"
                                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
                                />
                              </div>

                              <div>
                                <label className="font-medium text-muted-foreground">Year / Date</label>
                                <input
                                  type="text"
                                  value={cert.year}
                                  onChange={(e) => {
                                    const next = [...resumeData.certifications];
                                    next[index].year = e.target.value;
                                    updateField("certifications", next);
                                  }}
                                  placeholder="e.g. 2023"
                                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={() => {
                            const newCert: CertificationItem = {
                              id: `cert-${Date.now()}`,
                              name: "",
                              issuer: "",
                              year: "",
                              link: "",
                            };
                            updateField("certifications", [...resumeData.certifications, newCert]);
                          }}
                          className="w-full py-2.5 rounded-xl border border-dashed border-border hover:border-primary text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Add Certification
                        </button>
                      </div>
                    )}

                    <div className="pt-4 flex items-center justify-between">
                      <button
                        onClick={() => setCurrentStep(6)}
                        className="px-4 py-2 rounded-lg border border-border font-medium text-xs hover:bg-muted transition-colors flex items-center gap-1.5"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button
                        onClick={() => setCurrentStep(8)}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
                      >
                        <span>Next: Custom Sections</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* STEP 8: CUSTOM SECTIONS (AWARDS, PUBLICATIONS, ETC.)     */}
                {/* ======================================================== */}
                {currentStep === 8 && (
                  <div className="p-6 rounded-2xl bg-card border border-border space-y-5 animate-in fade-in duration-200">
                    <div className="border-b border-border pb-3">
                      <h3 className="text-base font-bold">Additional Custom Sections</h3>
                      <p className="text-xs text-muted-foreground">
                        Awards, hackathon wins, research publications, or spoken languages.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {(resumeData.customSections || []).map((sec, index) => (
                        <div
                          key={sec.id}
                          className="p-4 rounded-xl border border-border bg-background space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <input
                              type="text"
                              value={sec.title}
                              onChange={(e) => {
                                const next = [...(resumeData.customSections || [])];
                                next[index].title = e.target.value;
                                updateField("customSections", next);
                              }}
                              placeholder="Section Title (e.g. Honors & Awards)"
                              className="font-semibold text-xs text-primary bg-transparent border-b border-border focus:border-primary outline-none pb-0.5"
                            />
                            <button
                              onClick={() => {
                                const next = (resumeData.customSections || []).filter(
                                  (s) => s.id !== sec.id
                                );
                                updateField("customSections", next);
                              }}
                              className="p-1 text-muted-foreground hover:text-destructive rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <textarea
                            rows={3}
                            value={sec.content}
                            onChange={(e) => {
                              const next = [...(resumeData.customSections || [])];
                              next[index].content = e.target.value;
                              updateField("customSections", next);
                            }}
                            placeholder="• Winner of Smart India Hackathon 2023 out of 1,200 teams&#10;• Published research paper on distributed consensus in IEEE"
                            className="w-full p-2.5 rounded-lg bg-card border border-border text-xs text-foreground leading-relaxed"
                          />
                        </div>
                      ))}

                      <button
                        onClick={() => {
                          const newSec: CustomSectionItem = {
                            id: `sec-${Date.now()}`,
                            title: "Honors & Achievements",
                            content: "",
                          };
                          updateField("customSections", [
                            ...(resumeData.customSections || []),
                            newSec,
                          ]);
                        }}
                        className="w-full py-2.5 rounded-xl border border-dashed border-border hover:border-primary text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Custom Section
                      </button>
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                      <button
                        onClick={() => setCurrentStep(7)}
                        className="px-4 py-2 rounded-lg border border-border font-medium text-xs hover:bg-muted transition-colors flex items-center gap-1.5"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button
                        onClick={handleExportPDF}
                        className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download ATS-Ready PDF
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ========================================================== */}
              {/* RIGHT COLUMN: LIVE REACTIVE PREVIEW (5 cols)               */}
              {/* ========================================================== */}
              <div
                className={`lg:col-span-6 sticky top-20 ${
                  mobileTab === "form" ? "hidden lg:block" : "block"
                }`}
              >
                {/* Preview Toolbar */}
                <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground px-1">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-foreground">Live Reactive Preview</span>
                    <span className="text-[11px] bg-muted px-2 py-0.5 rounded capitalize">
                      {template} Template
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.print()}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Browser Print Preview"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sheet Simulation (A4 Proportion) */}
                <div className="rounded-2xl border border-border bg-white text-zinc-900 shadow-xl overflow-hidden min-h-[750px] p-8 sm:p-10 font-sans text-xs selection:bg-primary/20">
                  {/* ==================================================== */}
                  {/* TEMPLATE 1: CLASSIC ATS-FRIENDLY (SINGLE COLUMN)     */}
                  {/* ==================================================== */}
                  {template === "classic" && (
                    <div className="space-y-5 leading-relaxed">
                      {/* Header */}
                      <div className="text-center border-b border-zinc-300 pb-4 space-y-1">
                        <h2 className="text-2xl font-bold uppercase tracking-wider text-zinc-950 font-serif">
                          {resumeData.fullName || "YOUR NAME"}
                        </h2>
                        {resumeData.professionalTitle && (
                          <p className="text-sm font-semibold text-zinc-700 tracking-wide">
                            {resumeData.professionalTitle}
                          </p>
                        )}
                        <p className="text-[11px] text-zinc-600 space-x-2">
                          {resumeData.email && <span>{resumeData.email}</span>}
                          {resumeData.phone && <span>• {resumeData.phone}</span>}
                          {resumeData.location && <span>• {resumeData.location}</span>}
                        </p>
                        <p className="text-[10px] text-zinc-500 space-x-2">
                          {resumeData.linkedin && <span>{resumeData.linkedin}</span>}
                          {resumeData.github && <span>• {resumeData.github}</span>}
                          {resumeData.portfolio && <span>• {resumeData.portfolio}</span>}
                        </p>
                      </div>

                      {/* Summary */}
                      {resumeData.summary && (
                        <div>
                          <h3 className="font-bold uppercase tracking-wider text-zinc-950 border-b border-zinc-200 pb-0.5 mb-1.5 font-serif">
                            Professional Summary
                          </h3>
                          <p className="text-zinc-700 leading-normal">{resumeData.summary}</p>
                        </div>
                      )}

                      {/* Skills */}
                      {getAllSkills(resumeData).length > 0 && (
                        <div>
                          <h3 className="font-bold uppercase tracking-wider text-zinc-950 border-b border-zinc-200 pb-0.5 mb-1.5 font-serif">
                            Technical Skills
                          </h3>
                          <div className="space-y-1 text-zinc-700">
                            {getSkillsCategory(resumeData, "technical").length > 0 && (
                              <p>
                                <strong className="font-semibold text-zinc-900">Languages & Frameworks:</strong>{" "}
                                {getSkillsCategory(resumeData, "technical").join(", ")}
                              </p>
                            )}
                            {getSkillsCategory(resumeData, "tools").length > 0 && (
                              <p>
                                <strong className="font-semibold text-zinc-900">Developer Tools & Cloud:</strong>{" "}
                                {getSkillsCategory(resumeData, "tools").join(", ")}
                              </p>
                            )}
                            {getSkillsCategory(resumeData, "soft").length > 0 && (
                              <p>
                                <strong className="font-semibold text-zinc-900">Core Competencies:</strong>{" "}
                                {getSkillsCategory(resumeData, "soft").join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Experience */}
                      {resumeData.experience.length > 0 && !skippedSections.experience && (
                        <div>
                          <h3 className="font-bold uppercase tracking-wider text-zinc-950 border-b border-zinc-200 pb-0.5 mb-2 font-serif">
                            Work Experience
                          </h3>
                          <div className="space-y-3">
                            {resumeData.experience.map((exp) => (
                              <div key={exp.id} className="space-y-1">
                                <div className="flex justify-between items-baseline font-semibold text-zinc-900">
                                  <span>
                                    {exp.title} — <span className="font-normal text-zinc-700">{exp.company}</span>
                                  </span>
                                  <span className="text-[11px] text-zinc-600 font-normal">
                                    {exp.startDate} – {exp.current ? "Present" : exp.endDate}
                                  </span>
                                </div>
                                {exp.bullets && exp.bullets.length > 0 ? (
                                  <ul className="list-disc list-outside ml-4 space-y-0.5 text-zinc-700">
                                    {exp.bullets.map((b, i) => (
                                      <li key={i}>{b.replace(/^[-•*]\s*/, "")}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-zinc-700">{exp.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Projects */}
                      {resumeData.projects.length > 0 && !skippedSections.projects && (
                        <div>
                          <h3 className="font-bold uppercase tracking-wider text-zinc-950 border-b border-zinc-200 pb-0.5 mb-2 font-serif">
                            Key Projects
                          </h3>
                          <div className="space-y-2.5">
                            {resumeData.projects.map((proj) => (
                              <div key={proj.id} className="space-y-0.5">
                                <div className="flex justify-between items-baseline font-semibold text-zinc-900">
                                  <span>
                                    {proj.name}{" "}
                                    {proj.technologies && (
                                      <span className="font-normal text-zinc-600 text-[11px]">
                                        | {Array.isArray(proj.technologies) ? proj.technologies.join(", ") : proj.technologies}
                                      </span>
                                    )}
                                  </span>
                                  {proj.link && (
                                    <span className="text-[10px] text-zinc-500 font-mono">
                                      {proj.link.replace(/^https?:\/\//, "")}
                                    </span>
                                  )}
                                </div>
                                <p className="text-zinc-700">{proj.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Education */}
                      {resumeData.education.length > 0 && (
                        <div>
                          <h3 className="font-bold uppercase tracking-wider text-zinc-950 border-b border-zinc-200 pb-0.5 mb-2 font-serif">
                            Education
                          </h3>
                          <div className="space-y-2">
                            {resumeData.education.map((edu) => (
                              <div key={edu.id} className="flex justify-between items-baseline">
                                <div>
                                  <span className="font-semibold text-zinc-900">{edu.degree}</span>
                                  <span className="text-zinc-600">, {edu.school}</span>
                                  {edu.gpa && <span className="text-zinc-500 text-[11px]"> (GPA: {edu.gpa})</span>}
                                </div>
                                <span className="text-[11px] text-zinc-600">{edu.gradYear}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Certifications */}
                      {resumeData.certifications.length > 0 && !skippedSections.certifications && (
                        <div>
                          <h3 className="font-bold uppercase tracking-wider text-zinc-950 border-b border-zinc-200 pb-0.5 mb-1.5 font-serif">
                            Certifications
                          </h3>
                          <div className="space-y-1">
                            {resumeData.certifications.map((c) => (
                              <div key={c.id} className="flex justify-between text-zinc-700">
                                <span>
                                  <strong>{c.name}</strong> — {c.issuer}
                                </span>
                                <span className="text-[11px] text-zinc-600">{c.year}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Custom Sections */}
                      {(resumeData.customSections || []).map((sec) => (
                        <div key={sec.id}>
                          <h3 className="font-bold uppercase tracking-wider text-zinc-950 border-b border-zinc-200 pb-0.5 mb-1.5 font-serif">
                            {sec.title}
                          </h3>
                          <p className="text-zinc-700 whitespace-pre-line">{sec.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ==================================================== */}
                  {/* TEMPLATE 2: MODERN PROFESSIONAL                      */}
                  {/* ==================================================== */}
                  {template === "modern" && (
                    <div className="space-y-5 leading-relaxed">
                      {/* Modern Header with subtle accent */}
                      <div className="border-l-4 border-blue-600 pl-4 py-1 space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight text-zinc-950">
                          {resumeData.fullName || "YOUR NAME"}
                        </h2>
                        {resumeData.professionalTitle && (
                          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
                            {resumeData.professionalTitle}
                          </p>
                        )}
                        <p className="text-[11px] text-zinc-600 space-x-2 pt-1">
                          {resumeData.email && <span>{resumeData.email}</span>}
                          {resumeData.phone && <span>• {resumeData.phone}</span>}
                          {resumeData.location && <span>• {resumeData.location}</span>}
                          {resumeData.linkedin && <span>• {resumeData.linkedin}</span>}
                        </p>
                      </div>

                      {/* Summary */}
                      {resumeData.summary && (
                        <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                          <p className="text-zinc-700 leading-normal">{resumeData.summary}</p>
                        </div>
                      )}

                      {/* Skills Badges */}
                      {getAllSkills(resumeData).length > 0 && (
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 mb-2">
                            Core Competencies & Stack
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {getAllSkills(resumeData).map((s) => (
                              <span
                                key={s}
                                className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-medium"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Experience */}
                      {resumeData.experience.length > 0 && !skippedSections.experience && (
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 border-b border-zinc-200 pb-1 mb-2">
                            Professional Experience
                          </h3>
                          <div className="space-y-3">
                            {resumeData.experience.map((exp) => (
                              <div key={exp.id} className="space-y-1">
                                <div className="flex justify-between items-baseline font-bold text-zinc-900">
                                  <span>{exp.title}</span>
                                  <span className="text-[10px] uppercase font-semibold text-blue-600">
                                    {exp.startDate} – {exp.current ? "Present" : exp.endDate}
                                  </span>
                                </div>
                                <div className="text-[11px] font-medium text-zinc-600">{exp.company}</div>
                                {exp.bullets && exp.bullets.length > 0 ? (
                                  <ul className="list-disc list-outside ml-4 space-y-0.5 text-zinc-700 pt-0.5">
                                    {exp.bullets.map((b, i) => (
                                      <li key={i}>{b.replace(/^[-•*]\s*/, "")}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-zinc-700">{exp.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Projects */}
                      {resumeData.projects.length > 0 && !skippedSections.projects && (
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 border-b border-zinc-200 pb-1 mb-2">
                            Featured Projects
                          </h3>
                          <div className="space-y-2.5">
                            {resumeData.projects.map((proj) => (
                              <div key={proj.id} className="space-y-0.5">
                                <div className="flex justify-between items-baseline font-bold text-zinc-900">
                                  <span>{proj.name}</span>
                                  {proj.link && (
                                    <span className="text-[10px] text-blue-600 font-mono">
                                      {proj.link.replace(/^https?:\/\//, "")}
                                    </span>
                                  )}
                                </div>
                                {proj.technologies && (
                                  <p className="text-[10px] text-zinc-500 font-mono">
                                    {Array.isArray(proj.technologies) ? proj.technologies.join(", ") : proj.technologies}
                                  </p>
                                )}
                                <p className="text-zinc-700">{proj.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Education */}
                      {resumeData.education.length > 0 && (
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 border-b border-zinc-200 pb-1 mb-2">
                            Education
                          </h3>
                          <div className="space-y-1.5">
                            {resumeData.education.map((edu) => (
                              <div key={edu.id} className="flex justify-between items-baseline">
                                <div>
                                  <span className="font-bold text-zinc-900">{edu.degree}</span>
                                  <span className="text-zinc-600"> — {edu.school}</span>
                                </div>
                                <span className="text-[11px] text-zinc-600">{edu.gradYear}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ==================================================== */}
                  {/* TEMPLATE 3: MINIMAL                                  */}
                  {/* ==================================================== */}
                  {template === "minimal" && (
                    <div className="space-y-6 leading-relaxed font-sans">
                      <div className="space-y-1">
                        <h2 className="text-3xl font-light tracking-tight text-zinc-950">
                          {resumeData.fullName || "Your Name"}
                        </h2>
                        <p className="text-xs text-zinc-600 tracking-wider uppercase font-medium">
                          {resumeData.professionalTitle} | {resumeData.email} | {resumeData.location}
                        </p>
                      </div>

                      {resumeData.summary && (
                        <p className="text-zinc-700 text-[11px] leading-relaxed border-l-2 border-zinc-300 pl-3">
                          {resumeData.summary}
                        </p>
                      )}

                      {/* Skills */}
                      {getAllSkills(resumeData).length > 0 && (
                        <div className="text-[11px] text-zinc-700">
                          <span className="font-semibold text-zinc-900">SKILLS: </span>
                          {getAllSkills(resumeData).join("  /  ")}
                        </div>
                      )}

                      {/* Experience */}
                      {resumeData.experience.length > 0 && !skippedSections.experience && (
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">
                            EXPERIENCE
                          </h4>
                          {resumeData.experience.map((exp) => (
                            <div key={exp.id} className="space-y-1">
                              <div className="flex justify-between font-semibold text-zinc-900">
                                <span>{exp.title}, {exp.company}</span>
                                <span className="text-zinc-400 text-[10px]">{exp.startDate} - {exp.current ? "Present" : exp.endDate}</span>
                              </div>
                              <p className="text-zinc-600 text-[11px]">{exp.description}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Education */}
                      {resumeData.education.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">
                            EDUCATION
                          </h4>
                          {resumeData.education.map((edu) => (
                            <div key={edu.id} className="flex justify-between text-[11px]">
                              <span><strong>{edu.degree}</strong>, {edu.school}</span>
                              <span className="text-zinc-400">{edu.gradYear}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ==================================================== */}
                  {/* TEMPLATE 4: TECHNICAL / DEVELOPER                    */}
                  {/* ==================================================== */}
                  {template === "technical" && (
                    <div className="space-y-5 leading-relaxed font-sans">
                      <div className="border-b-2 border-zinc-900 pb-3">
                        <div className="flex justify-between items-baseline">
                          <h2 className="text-2xl font-black tracking-tight text-zinc-950 font-mono">
                            {resumeData.fullName || "DEVELOPER_NAME"}
                          </h2>
                          <span className="font-mono text-[10px] bg-zinc-100 px-2 py-0.5 rounded text-zinc-800">
                            {resumeData.location || "Remote / India"}
                          </span>
                        </div>
                        <p className="font-mono text-xs text-zinc-600 mt-1">
                          {resumeData.professionalTitle || "Software Engineer"} // {resumeData.email} // {resumeData.github}
                        </p>
                      </div>

                      {/* Summary */}
                      {resumeData.summary && (
                        <p className="text-zinc-700 text-xs font-mono bg-zinc-50 p-2.5 rounded border border-zinc-200">
                          &gt; {resumeData.summary}
                        </p>
                      )}

                      {/* Technical Skills Grid */}
                      {getAllSkills(resumeData).length > 0 && (
                        <div>
                          <h3 className="font-mono text-xs font-bold text-zinc-900 uppercase border-b border-zinc-200 pb-1 mb-2">
                            [ technical.stack ]
                          </h3>
                          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-zinc-700">
                            <div>
                              <span className="text-zinc-400">// languages & frameworks:</span>
                              <p className="font-semibold text-zinc-900">
                                {getSkillsCategory(resumeData, "technical").join(", ") || "Python, React, TypeScript"}
                              </p>
                            </div>
                            <div>
                              <span className="text-zinc-400">// devops & tools:</span>
                              <p className="font-semibold text-zinc-900">
                                {getSkillsCategory(resumeData, "tools").join(", ") || "Docker, AWS, Git"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Experience */}
                      {resumeData.experience.length > 0 && !skippedSections.experience && (
                        <div>
                          <h3 className="font-mono text-xs font-bold text-zinc-900 uppercase border-b border-zinc-200 pb-1 mb-2">
                            [ work.experience ]
                          </h3>
                          <div className="space-y-3">
                            {resumeData.experience.map((exp) => (
                              <div key={exp.id} className="space-y-1">
                                <div className="flex justify-between items-baseline font-mono text-xs">
                                  <span className="font-bold text-zinc-900">{exp.title} @ {exp.company}</span>
                                  <span className="text-zinc-500 text-[10px]">{exp.startDate} - {exp.current ? "Present" : exp.endDate}</span>
                                </div>
                                <p className="text-zinc-700 text-xs">{exp.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Projects */}
                      {resumeData.projects.length > 0 && !skippedSections.projects && (
                        <div>
                          <h3 className="font-mono text-xs font-bold text-zinc-900 uppercase border-b border-zinc-200 pb-1 mb-2">
                            [ repositories & projects ]
                          </h3>
                          <div className="space-y-2">
                            {resumeData.projects.map((proj) => (
                              <div key={proj.id} className="space-y-0.5">
                                <div className="flex justify-between font-mono text-xs">
                                  <span className="font-bold text-zinc-900">{proj.name}</span>
                                  {proj.link && <span className="text-blue-600 text-[10px]">{proj.link}</span>}
                                </div>
                                <p className="text-zinc-700 text-xs">{proj.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        )}

        {/* ============================================================== */}
        {/* MODAL 1: AI WRITING ASSISTANT (SIDE-BY-SIDE REVIEW)            */}
        {/* ============================================================== */}
        {showAIModal && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Rozgar Radar AI Assistant</h3>
                    <p className="text-xs text-muted-foreground">
                      Side-by-side comparison. Review, refine, and confirm changes.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAIModal(false)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {aiLoading ? (
                  <div className="py-16 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm">Synthesizing high-impact professional draft...</p>
                    <p className="text-xs text-muted-foreground">
                      Adhering strictly to ATS keywords and action-driven metrics
                    </p>
                  </div>
                ) : aiSuggestion ? (
                  <div className="space-y-4">
                    {/* Explanation */}
                    {aiSuggestion.explanation && (
                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-primary flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{aiSuggestion.explanation}</span>
                      </div>
                    )}

                    {/* Side-by-side comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Original */}
                      <div className="p-4 rounded-xl border border-border bg-background space-y-2">
                        <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                          Original Input
                        </span>
                        <div className="text-muted-foreground leading-relaxed whitespace-pre-line min-h-[120px]">
                          {aiSuggestion.original || "(Blank / New Entry)"}
                        </div>
                      </div>

                      {/* AI Suggestion / Editable */}
                      <div className="p-4 rounded-xl border-2 border-primary/40 bg-card space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-primary uppercase tracking-wider text-[10px]">
                            AI Enhanced Draft (Editable)
                          </span>
                        </div>
                        <textarea
                          rows={6}
                          value={aiEditedText}
                          onChange={(e) => setAiEditedText(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg p-2.5 text-foreground leading-relaxed outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border flex items-center justify-between bg-muted/30">
                <button
                  onClick={() => setShowAIModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-border hover:bg-muted text-muted-foreground"
                >
                  Reject / Keep Original
                </button>

                <button
                  disabled={aiLoading || !aiSuggestion}
                  onClick={handleApplyAISuggestion}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Accept Suggestion
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 2: IMPORT RESUME (PDF/DOCX)                              */}
        {/* ============================================================== */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-base">Import Existing Resume</h3>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-1 text-muted-foreground hover:text-foreground rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Upload your current PDF or DOCX resume. Our parser will extract your experience, skills,
                  and education and load them into the builder for instant review.
                </p>

                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center space-y-2 hover:border-primary/50 transition-colors">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
                  <input
                    type="file"
                    id="resumeUpload"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImportFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="resumeUpload"
                    className="inline-block text-xs font-semibold text-primary cursor-pointer hover:underline"
                  >
                    {importFile ? importFile.name : "Choose PDF or DOCX file"}
                  </label>
                  <p className="text-[11px] text-muted-foreground">Max file size 10MB</p>
                </div>

                {importWarnings.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 space-y-1">
                    <span className="font-semibold">Extraction Notices:</span>
                    <ul className="list-disc list-inside text-[11px]">
                      {importWarnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {importSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Resume extracted successfully! Ready to edit.</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-border hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  disabled={!importFile || importLoading}
                  onClick={async () => {
                    await handleFileImport();
                    setViewMode("editor");
                    setShowImportModal(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Import into Builder
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 3: RENAME RESUME                                         */}
        {/* ============================================================== */}
        {showRenameModal && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
              <h3 className="font-bold text-sm">Rename Resume</h3>
              <input
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground outline-none focus:border-primary"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowRenameModal(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRename}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Save Title
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppSidebarLayout>
  );
}


export default function ResumeBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <ResumeBuilderContent />
    </Suspense>
  );
}
