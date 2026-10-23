"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { BrandLogo } from "@/components/ui/BrandLogo";
import {
  Home,
  Compass,
  Sparkles,
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
  ShieldAlert,
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
    { title: "For You", href: "/recommended", Icon: Sparkles },
    { title: "Daily Automation", href: "/automation", Icon: Zap },
    { title: "Resume Builder", href: "/resume-builder", Icon: FileText },
    { title: "ATS Scorer", href: "/ats-checker", Icon: CheckCircle2 },
    { title: "Tracker", href: "/saved-jobs", Icon: BookmarkCheck },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground transition-colors duration-200">
      {/* COLLAPSIBLE SIDEBAR */}
      <aside
        className={`sticky top-0 h-screen shrink-0 border-r border-border bg-card transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-64" : "w-16"
        } p-3 flex flex-col justify-between z-40 select-none shadow-xs`}
      >
        <div>
          {/* Brand Header */}
          <div className="mb-6 border-b border-border pb-4">
            {sidebarOpen ? (
              <BrandLogo size="md" href="/" showSubtitle />
            ) : (
              <Link href="/" className="grid size-10 place-content-center mx-auto rounded-xl bg-primary text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                  <circle cx="12" cy="12" r="9" strokeOpacity="0.4" />
                  <circle cx="12" cy="12" r="5" strokeOpacity="0.8" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
              </Link>
            )}
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
                      ? "bg-primary/10 text-primary border-l-3 border-primary font-semibold"
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
              <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Preferences
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-9 w-full items-center justify-between rounded-xl px-2.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
              >
                <div className="flex items-center">
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4 mr-2.5 text-amber-400" />
                  ) : (
                    <Moon className="h-4 w-4 mr-2.5 text-slate-700" />
                  )}
                  <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-foreground uppercase font-bold">
                  {theme}
                </span>
              </button>

              <Link
                href="/profile"
                className={`flex h-9 w-full items-center rounded-xl px-2.5 text-xs font-medium transition-colors ${
                  pathname === "/profile"
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Settings className="h-4 w-4 mr-2.5 text-muted-foreground" />
                <span>Profile & Skills</span>
              </Link>
              {user && (
                <button
                  type="button"
                  onClick={logout}
                  className="flex h-9 w-full items-center rounded-xl px-2.5 text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2.5" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Collapse Toggle & User Profile Card */}
        <div>
          {sidebarOpen && user && (
            <div className="mb-2 p-2 rounded-xl bg-muted/60 border border-border flex items-center gap-2.5">
              {user.profile_photo_url ? (
                <img
                  src={user.profile_photo_url}
                  alt={user.full_name || "Profile"}
                  className="w-8 h-8 rounded-full object-cover border border-primary/30 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs uppercase shrink-0 shadow-xs">
                  {user.full_name ? user.full_name.charAt(0) : "U"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">{user.full_name || "Job Seeker"}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={toggleSidebar}
            className="w-full border-t border-border transition-colors hover:bg-accent rounded-xl mt-2 cursor-pointer"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <div className="flex items-center p-2">
              <div className="grid size-8 place-content-center shrink-0 text-muted-foreground">
                <ChevronsRight
                  className={`h-4 w-4 transition-transform duration-300 ${
                    sidebarOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
              {sidebarOpen && (
                <span className="text-[11px] font-medium text-muted-foreground">
                  Collapse Sidebar
                </span>
              )}
            </div>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppSidebarLayout;
