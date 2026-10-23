"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { loginUser } from "@/lib/api";
import { AuthenticationCard } from "@/components/ui/authentication-card";
import { Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/dashboard";

  const { login } = useAuth();
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
      const res = await loginUser({ email: email.trim().toLowerCase(), password });
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
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-4 sm:p-6 transition-colors duration-200">
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
