"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { registerUser } from "@/lib/api";
import { AuthenticationCard } from "@/components/ui/authentication-card";
import { Loader2 } from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect");

  const { login } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await registerUser({
        full_name: fullName,
        email,
        password,
      });
      login(res.access_token, res.user);
      if (redirectTarget) {
        router.push(redirectTarget);
      } else {
        router.push("/onboarding");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
      setLoading(false);
    }
  };

  const loginHref =
    redirectTarget
      ? `/auth/login?redirect=${encodeURIComponent(redirectTarget)}`
      : "/auth/login";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-4 sm:p-6 transition-colors duration-200">
      <AuthenticationCard
        mode="register"
        title="Create your account"
        description={
          redirectTarget
            ? "Create your account to unlock Resume Builder & ATS Scorer."
            : "Start discovering verified tech jobs and building ATS-ready resumes."
        }
        fullName={fullName}
        setFullName={setFullName}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        loading={loading}
        error={error}
        onSubmit={handleSubmit}
        footerLink={
          <span>
            Already have an account?{" "}
            <Link href={loginHref} className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </span>
        }
      />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
