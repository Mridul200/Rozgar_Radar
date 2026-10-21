"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { loginUser } from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AuthenticationCard } from "@/components/ui/authentication-card";

export default function LoginPage() {
  const router = useRouter();
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
      const res = await loginUser({ email, password });
      login(res.access_token, res.user);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <AuthenticationCard
          mode="login"
          title="Sign in to your account"
          description="Enter your credentials to access your Rozgar Radar account."
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
              <Link href="/auth/register" className="text-primary font-medium hover:underline">
                Create one now
              </Link>
            </span>
          }
        />
      </main>

      <Footer />
    </div>
  );
}
