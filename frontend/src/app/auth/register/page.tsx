"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { sendRegisterOTP, verifyRegisterOTP, resendRegisterOTP } from "@/lib/api";
import { isValidEmail, EMAIL_ERROR_MESSAGE } from "@/lib/email-validation";
import { AuthenticationCard } from "@/components/ui/authentication-card";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Mail,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect");

  const { login } = useAuth();
  const [step, setStep] = useState<"form" | "otp">("form");

  // Registration Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP Verification State
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [expirySeconds, setExpirySeconds] = useState(300); // 5 minutes
  const [resendLoading, setResendLoading] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown & Expiration Timers
  useEffect(() => {
    if (step !== "otp") return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  // Focus first OTP input on step switch
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // Submit Step 1: Send OTP
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!fullName.trim() || !cleanEmail || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setError(EMAIL_ERROR_MESSAGE);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await sendRegisterOTP({
        full_name: fullName.trim(),
        email: cleanEmail,
        password,
      });
      setStep("otp");
      setResendCooldown(60);
      setExpirySeconds(300);
      setOtpDigits(["", "", "", "", "", ""]);
      setOtpError(null);
    } catch (err: any) {
      setError(err.message || "Failed to initiate registration. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  // OTP Input Handlers
  const handleOtpChange = (index: number, value: string) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const updated = [...otpDigits];
      updated[index] = "";
      setOtpDigits(updated);
      return;
    }

    // Handle paste of full 6-digit code
    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, 6).split("");
      const updated = [...otpDigits];
      chars.forEach((c, i) => {
        if (i < 6) updated[i] = c;
      });
      setOtpDigits(updated);
      const nextIndex = Math.min(chars.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    // Single digit entry
    const updated = [...otpDigits];
    updated[index] = cleaned[cleaned.length - 1];
    setOtpDigits(updated);
    setOtpError(null);

    // Auto-advance to next input
    if (index < 5 && cleaned) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Submit Step 2: Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullCode = otpDigits.join("");
    if (fullCode.length !== 6) {
      setOtpError("Please enter the complete 6-digit verification code.");
      return;
    }

    setOtpLoading(true);
    setOtpError(null);

    try {
      const res = await verifyRegisterOTP({
        email: email.trim().toLowerCase(),
        otp: fullCode,
      });

      setOtpSuccess(true);
      login(res.access_token, res.user);

      // Smooth transition to dashboard or onboarding
      setTimeout(() => {
        if (redirectTarget) {
          router.push(redirectTarget);
        } else {
          router.push("/onboarding");
        }
      }, 1000);
    } catch (err: any) {
      setOtpError(err.message || "Invalid or expired verification code. Please try again.");
      setOtpLoading(false);
    }
  };

  // Resend OTP Action
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setOtpError(null);

    try {
      const res = await resendRegisterOTP({ email: email.trim().toLowerCase() });
      setResendCooldown(res.cooldown_seconds || 60);
      setExpirySeconds(300);
      setOtpDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setOtpError(err.message || "Failed to resend verification code. Please try again later.");
    } finally {
      setResendLoading(false);
    }
  };

  const loginHref = redirectTarget
    ? `/auth/login?redirect=${encodeURIComponent(redirectTarget)}`
    : "/auth/login";

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-4 sm:p-6 transition-colors duration-200">
      {step === "form" ? (
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
          onSubmit={handleRegisterSubmit}
          footerLink={
            <span>
              Already have an account?{" "}
              <Link href={loginHref} className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </span>
          }
        />
      ) : (
        <Card className="flex w-full max-w-[460px] shadow-md flex-col gap-6 p-6 sm:p-8 bg-card border-border rounded-3xl">
          <CardHeader className="flex flex-col items-center gap-3 p-0 text-center">
            <BrandLogo size="lg" href="/" />

            <div className="flex flex-col space-y-1.5 mt-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[#087F68] dark:text-[#21A67A] flex items-center justify-center mx-auto mb-2 shadow-2xs">
                <Mail className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Verify your email
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                We sent a 6-digit verification code to:
                <br />
                <span className="font-semibold text-foreground break-all">{email.trim()}</span>
              </CardDescription>

              <button
                type="button"
                onClick={() => setStep("form")}
                className="inline-flex items-center justify-center gap-1.5 text-xs text-primary hover:underline font-medium mt-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Wrong email? Change address</span>
              </button>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="p-0">
            {otpSuccess ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Email Verified!</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Setting up your career profile and redirecting...
                </p>
                <Loader2 className="w-5 h-5 text-primary animate-spin mt-4" />
              </div>
            ) : (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
                {otpError && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{otpError}</span>
                  </div>
                )}

                {/* 6 Individual Digit Inputs */}
                <div className="flex items-center justify-between gap-2 sm:gap-3 py-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      autoComplete="one-time-code"
                      className="w-11 h-13 sm:w-13 sm:h-14 text-center text-xl sm:text-2xl font-bold bg-background text-foreground border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl outline-none transition-all shadow-2xs"
                    />
                  ))}
                </div>

                {/* Expiry & Resend Information */}
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>
                    Code expires in:{" "}
                    <span className="font-semibold text-foreground">
                      {formatTime(expirySeconds)}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || resendLoading}
                    className="text-primary font-medium hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer flex items-center gap-1"
                  >
                    {resendLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                    <span>
                      {resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : "Resend Code"}
                    </span>
                  </button>
                </div>

                {/* Submit Verification Button */}
                <Button
                  type="submit"
                  disabled={otpLoading || otpDigits.join("").length !== 6}
                  className="w-full mt-1 rounded-full py-5 text-sm font-bold bg-primary hover:bg-[--primary-hover] text-white shadow-sm cursor-pointer transition-all"
                >
                  {otpLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying Code...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      Verify & Activate Account
                    </span>
                  )}
                </Button>

                <div className="mt-2 text-center text-xs text-muted-foreground">
                  Need help? Check your spam folder or{" "}
                  <button
                    type="button"
                    onClick={() => setStep("form")}
                    className="text-primary hover:underline font-medium"
                  >
                    try a different email
                  </button>
                  .
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}
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
