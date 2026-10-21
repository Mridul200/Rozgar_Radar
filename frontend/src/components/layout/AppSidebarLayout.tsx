"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
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
  Sun,
  Moon,
} from "lucide-react";

interface AppSidebarLayoutProps {
  children: React.ReactNode;
}

export function AppSidebarLayout({ children }: AppSidebarLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
    { title: "ATS Scorer", href: "/ats-checker", Icon: CheckCircle2 },
    { title: "Tracker", href: "/saved-jobs", Icon: BookmarkCheck },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground transition-colors duration-200">
      {/* COLLAPSIBLE SIDEBAR */}
      <aside
        className={`sticky top-0 h-screen shrink-0 border-r border-border bg-card backdrop-blur-xl transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-64" : "w-16"
        } p-3 flex flex-col justify-between z-40 shadow-xl select-none`}
      >
        <div>
          {/* Brand Header */}
          <div className="mb-6 border-b border-border pb-4">
            <Link
              href="/"
              className="flex cursor-pointer items-center justify-between rounded-xl p-1.5 transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src="/logo.jpg"
                  alt="Rozgar Radar"
                  className="size-9 shrink-0 rounded-lg object-contain bg-white border border-border p-0.5 shadow-sm"
                />
                {sidebarOpen && (
                  <div className="transition-opacity duration-200 opacity-100 min-w-0">
                    <span className="block text-sm font-extrabold text-foreground tracking-tight truncate">
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
                      ? "bg-primary/10 text-primary shadow-sm border-l-2 border-primary font-semibold"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                  title={!sidebarOpen ? item.title : undefined}
                >
                  <div className="grid h-full w-12 place-content-center shrink-0">
                    <IconComp className="h-4 w-4" />
                  </div>

                  {sidebarOpen && (
                    <span className="text-xs truncate pr-4">
                      {item.title}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Account & Profile */}
          {sidebarOpen && (
            <div className="border-t border-border pt-4 space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Settings
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-10 w-full items-center justify-between rounded-xl px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
              >
                <div className="flex items-center">
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4 mr-3 text-muted-foreground" />
                  ) : (
                    <Moon className="h-4 w-4 mr-3 text-muted-foreground" />
                  )}
                  <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                  {theme}
                </span>
              </button>

              <Link
                href="/profile"
                className={`flex h-10 w-full items-center rounded-xl px-2 text-xs font-medium transition-colors ${
                  pathname === "/profile"
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Settings className="h-4 w-4 mr-3 text-muted-foreground" />
                <span>Account Profile</span>
              </Link>
              {user && (
                <button
                  type="button"
                  onClick={logout}
                  className="flex h-10 w-full items-center rounded-xl px-2 text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
          className="w-full border-t border-border transition-colors hover:bg-accent rounded-xl mt-4 cursor-pointer"
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <div className="flex items-center p-2.5">
            <div className="grid size-8 place-content-center shrink-0 text-muted-foreground">
              <ChevronsRight
                className={`h-4 w-4 transition-transform duration-300 ${
                  sidebarOpen ? "rotate-180" : ""
                }`}
              />
            </div>
            {sidebarOpen && (
              <span className="text-xs font-semibold text-muted-foreground transition-opacity duration-200">
                Collapse Sidebar
              </span>
            )}
          </div>
        </button>
      </aside>

      {/* MAIN CONTENT PANE */}
      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {/* Minimal top status bar */}
        <header className="h-14 shrink-0 border-b border-border bg-card/75 backdrop-blur-md px-6 flex items-center justify-between z-30 transition-colors duration-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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

          <div className="flex items-center gap-2.5">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer border border-border"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <Link
              href="/automation"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Daily Automation Alerts"
            >
              <Bell className="h-4 w-4" />
            </Link>

            <Link
              href="/profile"
              className="flex items-center gap-2 p-1 pl-2 pr-3 rounded-xl bg-accent border border-border hover:border-primary text-xs font-semibold text-foreground transition-colors"
            >
              <div className="size-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-[11px]">
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
