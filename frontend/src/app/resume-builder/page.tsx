"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchUserResumes, saveResume, deleteResume } from "@/lib/api";
import { ResumeData, ResumeRecord } from "@/types/user";
import { AppSidebarLayout } from "@/components/layout/AppSidebarLayout";
import {
  FileText,
  Save,
  Download,
  Plus,
  Trash2,
  Sparkles,
  LayoutTemplate,
  Briefcase,
  GraduationCap,
  Code2,
  FolderGit2,
  Award,
  CheckCircle2,
  Loader2,
  Printer,
  ChevronRight
} from "lucide-react";

const INITIAL_RESUME_DATA: ResumeData = {
  fullName: "Aarav Sharma",
  email: "aarav.sharma@example.com",
  phone: "+91 98765 43210",
  location: "Bengaluru, Karnataka, India",
  website: "https://aaravsharma.dev",
  linkedin: "linkedin.com/in/aaravsharma",
  github: "github.com/aaravsharma",
  summary: "Results-driven Full Stack Engineer with 4+ years of experience designing and shipping scalable web applications and high-throughput microservices. Proficient in Python, FastAPI, React, Next.js, and cloud deployments on AWS and Docker.",
  skills: [
    "Python", "FastAPI", "React", "Next.js", "TypeScript", "SQL",
    "PostgreSQL", "Docker", "AWS", "Git", "REST APIs", "Tailwind CSS"
  ],
  experience: [
    {
      id: "exp-1",
      title: "Senior Full Stack Engineer",
      company: "Nexus Technologies",
      location: "Bengaluru, India",
      startDate: "2023",
      endDate: "Present",
      current: true,
      description: "Architected microservices handling 15,000+ daily queries with sub-80ms latency using FastAPI and Redis. Led frontend migration to Next.js 14 reducing load time by 38%."
    },
    {
      id: "exp-2",
      title: "Software Engineer",
      company: "CloudScale Infotech",
      location: "Hyderabad, India",
      startDate: "2021",
      endDate: "2023",
      current: false,
      description: "Engineered scalable REST APIs for fintech clients with 99.9% uptime. Integrated automated CI/CD pipelines using GitHub Actions and Docker."
    }
  ],
  education: [
    {
      id: "edu-1",
      degree: "B.Tech in Computer Science and Engineering",
      school: "National Institute of Technology (NIT)",
      location: "India",
      gradYear: "2021",
      gpa: "8.6 / 10.0"
    }
  ],
  projects: [
    {
      id: "proj-1",
      name: "AI Job Hunting Copilot",
      link: "https://github.com/aaravsharma/ai-job-agent",
      technologies: "FastAPI, Next.js, Three.js, SQLite",
      description: "Multi-source automated job discovery and ATS readiness scoring engine with real-time 12-hour background sync."
    }
  ],
  certifications: [
    {
      id: "cert-1",
      name: "AWS Certified Solutions Architect",
      issuer: "Amazon Web Services",
      year: "2023"
    }
  ]
};

export default function ResumeBuilderPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();

  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
  const [resumeTitle, setResumeTitle] = useState("Software Engineer Resume");
  const [template, setTemplate] = useState<"modern" | "executive" | "minimal">("modern");
  const [resumeData, setResumeData] = useState<ResumeData>(INITIAL_RESUME_DATA);

  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [skillInput, setSkillInput] = useState("");

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }
    if (token) {
      fetchUserResumes(token)
        .then((list) => {
          setResumes(list);
          if (list.length > 0) {
            const first = list[0];
            setActiveResumeId(first.id);
            setResumeTitle(first.title);
            setTemplate(first.template);
            if (first.content_json && typeof first.content_json === "object") {
              setResumeData({ ...INITIAL_RESUME_DATA, ...first.content_json });
            }
          }
        })
        .catch(console.error);
    }
  }, [authLoading, user, token, router]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setSavedSuccess(false);
    try {
      const saved = await saveResume(
        {
          id: activeResumeId || undefined,
          title: resumeTitle,
          template,
          content_json: resumeData,
        },
        token
      );
      setActiveResumeId(saved.id);
      setSavedSuccess(true);
      // Refresh list
      const freshList = await fetchUserResumes(token);
      setResumes(freshList);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error("Save error:", e);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Section manipulators
  const addExperience = () => {
    const newExp = {
      id: `exp-${Date.now()}`,
      title: "Software Engineer",
      company: "Company Name",
      location: "City, India",
      startDate: "2024",
      endDate: "Present",
      current: true,
      description: "Spearheaded development of key platform features resulting in 20% performance improvement."
    };
    setResumeData({ ...resumeData, experience: [...resumeData.experience, newExp] });
  };

  const removeExperience = (id: string) => {
    setResumeData({
      ...resumeData,
      experience: resumeData.experience.filter((e) => e.id !== id),
    });
  };

  const addEducation = () => {
    const newEdu = {
      id: `edu-${Date.now()}`,
      degree: "B.Tech Computer Science",
      school: "University / College",
      location: "India",
      gradYear: "2024",
      gpa: ""
    };
    setResumeData({ ...resumeData, education: [...resumeData.education, newEdu] });
  };

  const removeEducation = (id: string) => {
    setResumeData({
      ...resumeData,
      education: resumeData.education.filter((e) => e.id !== id),
    });
  };

  const addProject = () => {
    const newProj = {
      id: `proj-${Date.now()}`,
      name: "Project Title",
      technologies: "Tech Stack",
      description: "Built scalable web solution solving key workflow challenges."
    };
    setResumeData({ ...resumeData, projects: [...resumeData.projects, newProj] });
  };

  const removeProject = (id: string) => {
    setResumeData({
      ...resumeData,
      projects: resumeData.projects.filter((p) => p.id !== id),
    });
  };

  const addSkill = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !resumeData.skills.includes(trimmed)) {
      setResumeData({ ...resumeData, skills: [...resumeData.skills, trimmed] });
    }
  };

  const removeSkill = (s: string) => {
    setResumeData({
      ...resumeData,
      skills: resumeData.skills.filter((x) => x !== s),
    });
  };

  return (
    <AppSidebarLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400 mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              ATS-Optimized Templates
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={resumeTitle}
                onChange={(e) => setResumeTitle(e.target.value)}
                className="bg-transparent text-xl sm:text-2xl font-bold text-white focus:outline-none border-b border-transparent hover:border-slate-700 focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Template Selector */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
              {(["modern", "executive", "minimal"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTemplate(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    template === t
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Mobile View Toggle */}
            <div className="flex lg:hidden bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button
                onClick={() => setActiveTab("editor")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === "editor" ? "bg-slate-800 text-white" : "text-slate-400"}`}
              >
                Editor
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === "preview" ? "bg-slate-800 text-white" : "text-slate-400"}`}
              >
                Preview
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              Print / PDF
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-md shadow-cyan-500/25 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedSuccess ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
              {savedSuccess ? "Saved!" : "Save Resume"}
            </button>
          </div>
        </div>

        {/* Workspace: Split Editor & Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* LEFT: Editor Panel */}
          <div className={`space-y-6 ${activeTab === "preview" ? "hidden lg:block" : "block"}`}>
            {/* Personal Details */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-300 flex items-center gap-2 border-b border-slate-800 pb-2">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={resumeData.fullName}
                    onChange={(e) => setResumeData({ ...resumeData, fullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={resumeData.email}
                    onChange={(e) => setResumeData({ ...resumeData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Phone</label>
                  <input
                    type="text"
                    value={resumeData.phone}
                    onChange={(e) => setResumeData({ ...resumeData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Location</label>
                  <input
                    type="text"
                    value={resumeData.location}
                    onChange={(e) => setResumeData({ ...resumeData, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Professional Summary</label>
                <textarea
                  rows={3}
                  value={resumeData.summary}
                  onChange={(e) => setResumeData({ ...resumeData, summary: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 leading-relaxed"
                />
              </div>
            </div>

            {/* Technical Skills */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-300 flex items-center gap-2 border-b border-slate-800 pb-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                Technical Skills
              </h3>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {resumeData.skills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    {s}
                    <button type="button" onClick={() => removeSkill(s)} className="hover:text-white">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); setSkillInput(""); } }}
                  placeholder="Type skill & press Enter..."
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <button type="button" onClick={() => { addSkill(skillInput); setSkillInput(""); }} className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-white">Add</button>
              </div>
            </div>

            {/* Work Experience */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-cyan-400" />
                  Work Experience
                </h3>
                <button
                  type="button"
                  onClick={addExperience}
                  className="text-xs text-cyan-400 font-semibold flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Position
                </button>
              </div>

              {resumeData.experience.map((exp, idx) => (
                <div key={exp.id} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-3 relative group">
                  <button
                    type="button"
                    onClick={() => removeExperience(exp.id)}
                    className="absolute top-3 right-3 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Title"
                      value={exp.title}
                      onChange={(e) => {
                        const copy = [...resumeData.experience];
                        copy[idx].title = e.target.value;
                        setResumeData({ ...resumeData, experience: copy });
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                    />
                    <input
                      type="text"
                      placeholder="Company"
                      value={exp.company}
                      onChange={(e) => {
                        const copy = [...resumeData.experience];
                        copy[idx].company = e.target.value;
                        setResumeData({ ...resumeData, experience: copy });
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                    />
                    <input
                      type="text"
                      placeholder="Dates (e.g. 2022 - Present)"
                      value={exp.startDate}
                      onChange={(e) => {
                        const copy = [...resumeData.experience];
                        copy[idx].startDate = e.target.value;
                        setResumeData({ ...resumeData, experience: copy });
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                    />
                    <input
                      type="text"
                      placeholder="Location"
                      value={exp.location}
                      onChange={(e) => {
                        const copy = [...resumeData.experience];
                        copy[idx].location = e.target.value;
                        setResumeData({ ...resumeData, experience: copy });
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Key impact bullets..."
                    value={exp.description}
                    onChange={(e) => {
                      const copy = [...resumeData.experience];
                      copy[idx].description = e.target.value;
                      setResumeData({ ...resumeData, experience: copy });
                    }}
                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                </div>
              ))}
            </div>

            {/* Education & Projects */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-cyan-400" />
                  Education & Projects
                </h3>
                <button
                  type="button"
                  onClick={addEducation}
                  className="text-xs text-cyan-400 font-semibold flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Education
                </button>
              </div>

              {resumeData.education.map((edu, idx) => (
                <div key={edu.id} className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) => {
                        const copy = [...resumeData.education];
                        copy[idx].degree = e.target.value;
                        setResumeData({ ...resumeData, education: copy });
                      }}
                      className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-white"
                    />
                    <input
                      type="text"
                      value={edu.school}
                      onChange={(e) => {
                        const copy = [...resumeData.education];
                        copy[idx].school = e.target.value;
                        setResumeData({ ...resumeData, education: copy });
                      }}
                      className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-white"
                    />
                  </div>
                  <button type="button" onClick={() => removeEducation(edu.id)} className="text-slate-500 hover:text-rose-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Live Clean Resume Preview (Printable) */}
          <div className={`${activeTab === "editor" ? "hidden lg:block" : "block"} sticky top-24`}>
            <div className="p-2 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 text-xs text-slate-400 mb-4">
                <span>ATS Preview ({template.toUpperCase()})</span>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Machine-Readable
                </span>
              </div>

              {/* Printable Document Container */}
              <div
                ref={printRef}
                className="bg-white text-slate-900 p-8 sm:p-10 rounded-xl shadow-lg min-h-[750px] text-sm leading-relaxed font-sans"
              >
                {/* Header */}
                <div className="border-b border-slate-300 pb-4 mb-4">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    {resumeData.fullName || "Your Full Name"}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                    <span>{resumeData.email}</span>
                    <span>•</span>
                    <span>{resumeData.phone}</span>
                    <span>•</span>
                    <span>{resumeData.location}</span>
                  </div>
                </div>

                {/* Summary */}
                {resumeData.summary && (
                  <div className="mb-5">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-800 border-b border-slate-200 pb-1 mb-2">
                      Professional Summary
                    </h2>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {resumeData.summary}
                    </p>
                  </div>
                )}

                {/* Technical Skills */}
                {resumeData.skills.length > 0 && (
                  <div className="mb-5">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-800 border-b border-slate-200 pb-1 mb-2">
                      Core Competencies & Skills
                    </h2>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {resumeData.skills.join(" • ")}
                    </p>
                  </div>
                )}

                {/* Experience */}
                {resumeData.experience.length > 0 && (
                  <div className="mb-5">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-800 border-b border-slate-200 pb-1 mb-3">
                      Work Experience
                    </h2>
                    <div className="space-y-3">
                      {resumeData.experience.map((exp) => (
                        <div key={exp.id}>
                          <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                            <span>{exp.title} — {exp.company}</span>
                            <span className="text-slate-500 font-normal">{exp.startDate} – {exp.endDate}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mb-1">{exp.location}</div>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {exp.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {resumeData.education.length > 0 && (
                  <div className="mb-5">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-800 border-b border-slate-200 pb-1 mb-2">
                      Education
                    </h2>
                    <div className="space-y-2">
                      {resumeData.education.map((edu) => (
                        <div key={edu.id} className="flex justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-900">{edu.degree}</span>
                            <span className="text-slate-600 block">{edu.school}</span>
                          </div>
                          <span className="text-slate-500">{edu.gradYear}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {resumeData.projects.length > 0 && (
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-800 border-b border-slate-200 pb-1 mb-2">
                      Projects & Technical Work
                    </h2>
                    <div className="space-y-2">
                      {resumeData.projects.map((proj) => (
                        <div key={proj.id} className="text-xs">
                          <span className="font-bold text-slate-900">{proj.name}</span>
                          <span className="text-slate-500 text-[11px] block">{proj.technologies}</span>
                          <p className="text-slate-700 text-xs mt-0.5">{proj.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppSidebarLayout>
  );
}
