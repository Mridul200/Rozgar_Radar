"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { BrandLogo } from "@/components/ui/BrandLogo";
import {
  Compass,
  FileText,
  CheckCircle2,
  BookmarkCheck,
  Zap,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  Sun,
  Moon,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Jobs", href: "/jobs" },
    { label: "For You", href: "/recommended" },
    { label: "Resume Builder", href: "/resume-builder" },
    { label: "ATS Checker", href: "/ats-checker" },
    { label: "Daily Automation", href: "/automation" },
    { label: "Tracker", href: "/saved-jobs" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Left: Brand Logo & Navigation Links */}
        <div className="flex items-center gap-10">
          <BrandLogo size="md" href="/" />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "text-primary font-semibold bg-primary/10 border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Theme Toggle & Actions */}
        <div className="hidden md:flex items-center gap-4">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="w-9 h-9 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent flex items-center justify-center transition-all cursor-pointer shadow-xs"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-border bg-card text-sm font-medium text-foreground hover:bg-accent transition-all shadow-xs cursor-pointer"
              >
                {user.profile_photo_url ? (
                  <img
                    src={user.profile_photo_url}
                    alt={user.full_name || "Profile"}
                    className="w-7 h-7 rounded-full object-cover border border-primary/30 shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold uppercase shadow-xs shrink-0">
                    {user.full_name ? user.full_name.charAt(0) : "U"}
                  </div>
                )}
                <span className="max-w-[120px] truncate text-xs font-semibold">{user.full_name || user.email}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-border bg-card p-2 shadow-xl backdrop-blur-xl z-20 animate-in">
                    <div className="px-3 py-2 border-b border-border mb-1">
                      <p className="text-[11px] font-medium text-muted-foreground">Signed in as</p>
                      <p className="text-xs font-semibold text-foreground truncate">{user.email}</p>
                    </div>

                    <Link
                      href="/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-accent hover:text-primary transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                      Dashboard Overview
                    </Link>

                    <Link
                      href="/recommended"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-accent transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      Recommended For You
                    </Link>

                    <Link
                      href="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-accent hover:text-primary transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                      Candidate Profile
                    </Link>

                    <Link
                      href="/saved-jobs"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-accent hover:text-primary transition-colors"
                    >
                      <BookmarkCheck className="w-4 h-4 text-muted-foreground" />
                      Saved & Applied Jobs
                    </Link>

                    <Link
                      href="/automation"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-accent hover:text-primary transition-colors"
                    >
                      <Zap className="w-4 h-4 text-primary" />
                      Daily Email Alerts
                    </Link>

                    <Link
                      href="/resume-builder"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-accent hover:text-primary transition-colors"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      Resume Builder
                    </Link>

                    <Link
                      href="/ats-checker"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-accent hover:text-primary transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                      ATS Scorer
                    </Link>

                    <div className="border-t border-border my-1" />

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/auth/login"
                className="px-4 py-2 text-sm font-semibold text-foreground/80 hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-primary hover:bg-[--primary-hover] shadow-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Controls */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="w-9 h-9 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer shadow-xs"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
          {user && (
            <Link
              href="/dashboard"
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent"
              aria-label="Go to Dashboard"
            >
              <LayoutDashboard className="w-5 h-5" />
            </Link>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card px-4 py-4 space-y-2 animate-in shadow-lg">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? "text-primary bg-primary/10 font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="pt-3 border-t border-border flex flex-col gap-2">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3.5 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4 text-primary" />
                  Candidate Dashboard
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3.5 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted flex items-center gap-2"
                >
                  <UserIcon className="w-4 h-4 text-muted-foreground" />
                  Profile & Preferences
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-xl text-sm font-medium text-foreground border border-border hover:bg-muted"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-full text-sm font-semibold text-white bg-primary hover:bg-[--primary-hover] shadow-sm flex items-center justify-center gap-1.5"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
