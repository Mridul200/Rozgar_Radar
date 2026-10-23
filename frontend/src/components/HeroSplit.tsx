"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  MapPin,
  ArrowRight,
  Briefcase,
  Target,
  FileText,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Laptop,
  Home,
  GraduationCap,
  SlidersHorizontal,
} from "lucide-react";

interface HeroSplitProps {
  totalJobs?: number;
}

export function HeroSplit({ totalJobs = 1885 }: HeroSplitProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("keyword", keyword.trim());
    if (location.trim()) params.set("location", location.trim());
    router.push(`/jobs?${params.toString()}`);
  };

  const handleQuickFilter = (type: string, value: string) => {
    const params = new URLSearchParams();
    if (type === "work_mode") params.set("work_mode", value);
    if (type === "employment_type") params.set("employment_type", value);
    if (type === "experience_level") params.set("experience_level", value);
    router.push(`/jobs?${params.toString()}`);
  };

  return (
    <div className="w-full">
      {/* Split Hero Main Section */}
      <section className="relative pt-10 pb-16 md:pt-14 md:pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column (6 or 7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#087F68] dark:text-[#21A67A] text-xs font-semibold w-fit mb-6 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Your AI Career Companion</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight leading-[1.12] mb-5">
              Find the Right Job.
              <br />
              Build a{" "}
              <span className="text-[#087F68] dark:text-[#21A67A]">
                Better Future.
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mb-8">
              Rozgar Radar helps you discover verified job opportunities, match your skills
              with the right roles, and gives you the tools to create a winning resume,
              track your applications and grow your career — all in one place.
            </p>

            {/* Unified Search Box */}
            <form
              onSubmit={handleSearch}
              className="glass-panel p-2 sm:p-2.5 rounded-2xl sm:rounded-full border border-border shadow-md bg-card flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-5"
            >
              {/* Input 1: Keyword */}
              <div className="flex-1 flex items-center gap-2.5 px-3 py-2">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Job title, skills, or company"
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-none font-medium"
                />
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-8 bg-border" />

              {/* Input 2: Location */}
              <div className="flex-1 flex items-center gap-2.5 px-3 py-2">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-transparent text-sm text-foreground outline-none border-none font-medium cursor-pointer"
                >
                  <option value="" className="bg-card text-foreground">Location (All India)</option>
                  <option value="Bengaluru" className="bg-card text-foreground">Bengaluru, Karnataka</option>
                  <option value="Pune" className="bg-card text-foreground">Pune, Maharashtra</option>
                  <option value="Hyderabad" className="bg-card text-foreground">Hyderabad, Telangana</option>
                  <option value="Delhi" className="bg-card text-foreground">Delhi NCR / Gurgaon</option>
                  <option value="Mumbai" className="bg-card text-foreground">Mumbai, Maharashtra</option>
                  <option value="Remote" className="bg-card text-foreground">Remote (Work from home)</option>
                </select>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl sm:rounded-full bg-primary hover:bg-[--primary-hover] text-white text-sm font-semibold shadow-sm transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
              >
                <span>Search Jobs</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Filter Chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleQuickFilter("work_mode", "remote")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card/80 hover:bg-card hover:border-primary/50 text-xs font-medium text-foreground transition-all cursor-pointer shadow-2xs"
              >
                <Laptop className="w-3.5 h-3.5 text-primary" />
                <span>Remote</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFilter("employment_type", "full_time")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card/80 hover:bg-card hover:border-primary/50 text-xs font-medium text-foreground transition-all cursor-pointer shadow-2xs"
              >
                <Briefcase className="w-3.5 h-3.5 text-primary" />
                <span>Full-time</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFilter("work_mode", "remote")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card/80 hover:bg-card hover:border-primary/50 text-xs font-medium text-foreground transition-all cursor-pointer shadow-2xs"
              >
                <Home className="w-3.5 h-3.5 text-primary" />
                <span>Work from home</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFilter("experience_level", "fresher")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card/80 hover:bg-card hover:border-primary/50 text-xs font-medium text-foreground transition-all cursor-pointer shadow-2xs"
              >
                <GraduationCap className="w-3.5 h-3.5 text-primary" />
                <span>Freshers</span>
              </button>

              <Link
                href="/jobs"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card/80 hover:bg-card hover:border-primary/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>More Filters</span>
              </Link>
            </div>
          </div>

          {/* Right Column (Seamless Integrated Career Composition) */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            {/* Ambient Organic Aura / Mint Backdrop */}
            <div className="absolute -inset-4 sm:-inset-8 bg-gradient-to-tr from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-500/20 dark:via-teal-500/5 dark:to-transparent rounded-[3rem] blur-2xl -z-10 pointer-events-none" />

            {/* Seamless Light Mode Photographic Hero (Zero Dark Card Box, Clean Mint Aura, White Floating Badges) */}
            <div className="block dark:hidden relative w-full max-w-[540px]">
              <Image
                src="/hero-career-light-v2.png"
                alt="Rozgar Radar — Verified Jobs and AI Career Assistant"
                width={960}
                height={560}
                priority
                quality={100}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 540px"
                className="w-full h-auto object-contain select-none transition-all drop-shadow-sm"
              />
            </div>

            {/* Seamless Dark Mode Photographic Hero (Zero Rectangular Border, Emerald Glow, Dark Floating Badges) */}
            <div className="hidden dark:block relative w-full max-w-[540px]">
              <Image
                src="/hero-career-dark-v2.png"
                alt="Rozgar Radar — Verified Jobs and AI Career Assistant"
                width={960}
                height={560}
                priority
                quality={100}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 540px"
                className="w-full h-auto object-contain select-none transition-all drop-shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 5-Item Features Strip Below Hero */}
      <section className="border-y border-border bg-card/60 backdrop-blur-xs py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Feature 1 */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[#087F68] dark:text-[#21A67A] flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-foreground">Verified Job Listings</h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  Get access to genuine job openings from top companies.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-foreground">AI-Powered Matching</h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  Find roles that fit your skills and career goals.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-foreground">Resume Builder</h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  Create a professional ATS resume in minutes.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[#087F68] dark:text-[#21A67A] flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-foreground">ATS Score Checker</h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  Improve your resume and beat the ATS system.
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-foreground">Daily Job Alerts</h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  Never miss new opportunities that match your profile.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Companies Actively Ingested Strip */}
      <section className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-border">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
            Top Tech Employers Active on Official Feeds:
          </span>
          <div className="flex items-center gap-6 sm:gap-8 flex-wrap justify-center text-xs sm:text-sm font-bold text-foreground/70">
            <span className="hover:text-primary transition-colors">TCS</span>
            <span className="text-muted-foreground/30">•</span>
            <span className="hover:text-primary transition-colors">Infosys</span>
            <span className="text-muted-foreground/30">•</span>
            <span className="hover:text-primary transition-colors">Accenture</span>
            <span className="text-muted-foreground/30">•</span>
            <span className="hover:text-primary transition-colors">HCLTech</span>
            <span className="text-muted-foreground/30">•</span>
            <span className="hover:text-primary transition-colors">Tata Motors</span>
            <span className="text-muted-foreground/30">•</span>
            <span className="hover:text-primary transition-colors">Wipro</span>
            <span className="text-muted-foreground/30">•</span>
            <span className="hover:text-primary transition-colors">Capgemini</span>
            <span className="text-muted-foreground/30">•</span>
            <span className="hover:text-primary transition-colors">L&T</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HeroSplit;

