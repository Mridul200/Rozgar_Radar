"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Home,
  Compass,
  Zap,
  FileText,
  CheckCircle2,
  BookmarkCheck,
  User as UserIcon,
  ChevronsRight,
  Settings,
  LogOut,
  Bell,
  Sparkles,
  Loader2,
} from "lucide-react";

interface AppSidebarLayoutProps {
  children: React.ReactNode;
}

export function AppSidebarLayout({ children }: AppSidebarLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, logout, isLoading: authLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load sidebar preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar_open");
      if (saved !== null) {
        setSidebarOpen(saved === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar_open", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const navLinks = [
    { title: "Dashboard", href: "/dashboard", Icon: Home },
    { title: "Explore Jobs", href: "/jobs", Icon: Compass },
    { title: "Daily Automation", href: "/automation", Icon: Zap },
    { title: "Resume Builder", href: "/resume-builder", Icon: FileText },
    { title: "ATS Readiness", href: "/ats-checker", Icon: CheckCircle2 },
    { title: "Tracker", href: "/saved-jobs", Icon: BookmarkCheck },
  ];

  return (
    <div className="flex min-h-screen w-full bg-slate-950 text-slate-100">
      {/* COLLAPSIBLE SIDEBAR */}
      <aside
        className={`sticky top-0 h-screen shrink-0 border-r border-slate-800/80 bg-slate-900/95 backdrop-blur-xl transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-64" : "w-16"
        } p-3 flex flex-col justify-between z-40 shadow-2xl select-none`}
      >
        <div>
          {/* Brand Header */}
          <div className="mb-6 border-b border-slate-800 pb-4">
            <Link
              href="/"
              className="flex cursor-pointer items-center justify-between rounded-xl p-1.5 transition-colors hover:bg-slate-800/60"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src="/logo.jpg"
                  alt="Rozgar Radar"
                  className="size-9 shrink-0 rounded-lg object-contain bg-white border border-slate-700/60 p-0.5 shadow-sm"
                />
                {sidebarOpen && (
                  <div className="transition-opacity duration-200 opacity-100 min-w-0">
                    <span className="block text-sm font-extrabold text-white tracking-tight truncate">
                      Rozgar Radar
                    </span>
                    <span className="block text-[10px] text-emerald-400 font-semibold truncate">
                      Candidate Portal
                    </span>
                  </div>
                )}
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1 mb-6">
            {navLinks.map((item) => {
              const isSelected =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const IconComp = item.Icon;

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`relative flex h-11 w-full items-center rounded-xl transition-all duration-200 ${
                    isSelected
                      ? "bg-emerald-500/15 text-emerald-300 shadow-sm border-l-2 border-emerald-400"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                  }`}
                  title={!sidebarOpen ? item.title : undefined}
                >
                  <div className="grid h-full w-12 place-content-center shrink-0">
                    <IconComp className="h-4 w-4" />
                  </div>

                  {sidebarOpen && (
                    <span className="text-xs font-semibold truncate pr-4">
                      {item.title}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Account & Profile */}
          {sidebarOpen && (
            <div className="border-t border-slate-800 pt-4 space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Settings
              </div>
              <Link
                href="/profile"
                className={`flex h-10 w-full items-center rounded-xl px-2 text-xs font-medium transition-colors ${
                  pathname === "/profile"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                }`}
              >
                <Settings className="h-4 w-4 mr-3 text-slate-400" />
                <span>Account Profile</span>
              </Link>
              {user && (
                <button
                  type="button"
                  onClick={logout}
                  className="flex h-10 w-full items-center rounded-xl px-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Collapse Toggle */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="w-full border-t border-slate-800 transition-colors hover:bg-slate-800/60 rounded-xl mt-4"
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <div className="flex items-center p-2.5">
            <div className="grid size-8 place-content-center shrink-0 text-slate-400">
              <ChevronsRight
                className={`h-4 w-4 transition-transform duration-300 ${
                  sidebarOpen ? "rotate-180" : ""
                }`}
              />
            </div>
            {sidebarOpen && (
              <span className="text-xs font-semibold text-slate-400 transition-opacity duration-200">
                Collapse Sidebar
              </span>
            )}
          </div>
        </button>
      </aside>

      {/* MAIN CONTENT PANE (OPENS RIGHT NEXT TO THE SIDEBAR) */}
      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {/* Minimal top status bar (No bulky horizontal navbar) */}
        <header className="h-14 shrink-0 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-6 flex items-center justify-between z-30">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {pathname === "/dashboard"
                ? "Dashboard"
                : pathname === "/automation"
                ? "Daily Automation & Alerts"
                : pathname === "/jobs"
                ? "Explore Verified Jobs"
                : pathname === "/resume-builder"
                ? "AI Resume Builder"
                : pathname === "/ats-checker"
                ? "ATS Readiness Analyzer"
                : pathname === "/saved-jobs"
                ? "Application Tracker"
                : pathname === "/profile"
                ? "Candidate Preferences"
                : "Portal"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/automation"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              title="Daily Automation Alerts"
            >
              <Bell className="h-4 w-4" />
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-2 p-1 pl-2 pr-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <div className="size-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px]">
                {(user?.full_name || user?.email || "U")[0].toUpperCase()}
              </div>
              <span className="max-w-[120px] truncate">
                {user?.full_name || user?.email?.split("@")[0] || "Candidate"}
              </span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
