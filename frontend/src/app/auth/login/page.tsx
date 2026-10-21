"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { loginUser } from "@/lib/api";
import { AuthenticationCard } from "@/components/ui/authentication-card";
import { useTheme } from "@/lib/theme-context";
import { Sun, Moon, ArrowLeft, Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/dashboard";

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await loginUser({ email, password });
      login(res.access_token, res.user);
      router.push(redirectTarget);
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
      setLoading(false);
    }
  };

  const registerHref =
    redirectTarget && redirectTarget !== "/dashboard"
      ? `/auth/register?redirect=${encodeURIComponent(redirectTarget)}`
      : "/auth/register";

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-background text-foreground p-4 sm:p-6 transition-colors duration-200">
      {/* Minimal Top Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <img
            src="/logo.jpg"
            alt="Rozgar Radar Logo"
            className="w-7 h-7 rounded-lg object-contain bg-white p-0.5 border border-border"
          />
          <span className="font-semibold text-sm tracking-tight text-foreground">Rozgar Radar</span>
        </Link>

        {/* Dark/Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* Centered Auth Card */}
      <main className="flex-1 flex items-center justify-center py-6">
        <AuthenticationCard
          mode="login"
          title="Sign in to your account"
          description={
            redirectTarget && redirectTarget !== "/dashboard"
              ? "Sign in to access your Resume Builder & ATS tools."
              : "Enter your credentials to access your Rozgar Radar account."
          }
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          keepLoggedIn={keepLoggedIn}
          setKeepLoggedIn={setKeepLoggedIn}
          loading={loading}
          error={error}
          onSubmit={handleSubmit}
          footerLink={
            <span>
              Don&apos;t have an account?{" "}
              <Link href={registerHref} className="text-primary font-medium hover:underline">
                Create one now
              </Link>
            </span>
          }
        />
      </main>

      {/* Minimal Bottom Copyright */}
      <footer className="w-full text-center py-2 text-xs text-muted-foreground">
        © 2026 Rozgar Radar. All rights reserved.
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
