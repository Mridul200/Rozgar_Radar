"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { sendRegisterOTP, verifyRegisterOTP, resendRegisterOTP, registerUser } from "@/lib/api";
import {
  isValidEmail,
  EMAIL_ERROR_MESSAGE,
  isValidIndianMobile,
  MOBILE_ERROR_MESSAGE,
  normalizeIndianMobile,
} from "@/lib/email-validation";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Mail,
  User as UserIcon,
  Phone,
  MapPin,
  Lock,
  Briefcase,
  GraduationCap,
  UploadCloud,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  FileText,
  X,
} from "lucide-react";

const POPULAR_CITIES = [
  "Bengaluru",
  "Pune",
  "Hyderabad",
  "Delhi NCR",
  "Mumbai",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Noida",
  "Gurgaon",
  "Remote India",
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect");

  const { login } = useAuth();
  const [step, setStep] = useState<"form" | "otp">("form");

  // Step 1 Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mobileNumber, setMobileNumber] = useState("");
  const [workStatus, setWorkStatus] = useState<"fresher" | "experienced">("fresher");
  const [currentCity, setCurrentCity] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Field Validation Errors (Inline)
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [cityError, setCityError] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // OTP Verification State
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [expirySeconds, setExpirySeconds] = useState(300);
  const [resendLoading, setResendLoading] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // OTP Timer
  useEffect(() => {
    if (step !== "otp") return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    }
  }, [step]);

  // Validation handlers on Blur
  const handleNameBlur = () => {
    if (!fullName.trim()) {
      setNameError("Full Name is required.");
    } else if (fullName.trim().length < 2) {
      setNameError("Full Name must be at least 2 characters.");
    } else {
      setNameError(null);
    }
  };

  const handleEmailBlur = () => {
    if (!email.trim()) {
      setEmailError(EMAIL_ERROR_MESSAGE);
    } else if (!isValidEmail(email)) {
      setEmailError(EMAIL_ERROR_MESSAGE);
    } else {
      setEmailError(null);
    }
  };

  const handlePasswordBlur = () => {
    if (!password) {
      setPasswordError("Password is required.");
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
    } else {
      setPasswordError(null);
    }
  };

  const handleMobileBlur = () => {
    if (!mobileNumber.trim()) {
      setMobileError("Mobile number is required.");
    } else if (!isValidIndianMobile(mobileNumber)) {
      setMobileError(MOBILE_ERROR_MESSAGE);
    } else {
      setMobileError(null);
    }
  };

  const handleCityBlur = () => {
    if (!currentCity.trim()) {
      setCityError("Current City is required.");
    } else {
      setCityError(null);
    }
  };

  // Resume File Selection (Optional)
  const handleResumeSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResumeError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validExts = [".pdf", ".docx"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!validExts.includes(ext)) {
      setResumeError("Please upload a PDF or DOCX resume file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setResumeError("File size exceeds maximum 5 MB limit.");
      return;
    }
    setResumeFile(file);
  };

  const handleRemoveResume = () => {
    setResumeFile(null);
    setResumeError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Submit Step 1: Send OTP
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    // Validate all required fields
    let hasError = false;

    if (!fullName.trim() || fullName.trim().length < 2) {
      setNameError("Full Name is required (minimum 2 characters).");
      hasError = true;
    } else {
      setNameError(null);
    }

    if (!email.trim() || !isValidEmail(email)) {
      setEmailError(EMAIL_ERROR_MESSAGE);
      hasError = true;
    } else {
      setEmailError(null);
    }

    if (!password || password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      hasError = true;
    } else {
      setPasswordError(null);
    }

    if (!mobileNumber.trim() || !isValidIndianMobile(mobileNumber)) {
      setMobileError(MOBILE_ERROR_MESSAGE);
      hasError = true;
    } else {
      setMobileError(null);
    }

    if (!currentCity.trim()) {
      setCityError("Please enter your current city.");
      hasError = true;
    } else {
      setCityError(null);
    }

    if (hasError) {
      setGeneralError("Please complete all required fields correctly.");
      return;
    }

    setLoading(true);

    try {
      const res = await registerUser({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        mobile_number: normalizeIndianMobile(mobileNumber) || undefined,
        work_status: workStatus,
        current_city: currentCity.trim(),
        resume_filename: resumeFile?.name,
      });

      login(res.access_token, res.user);
      router.push(redirectTarget || "/dashboard");
    } catch (err: any) {
      setGeneralError(err.message || "Failed to create account. Please verify your details.");
    } finally {
      setLoading(false);
    }
  };

  // OTP Handlers
  const handleOtpChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const updated = [...otpDigits];
      updated[index] = "";
      setOtpDigits(updated);
      return;
    }
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
    const updated = [...otpDigits];
    updated[index] = cleaned[cleaned.length - 1];
    setOtpDigits(updated);
    setOtpError(null);
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

      // If user selected a resume file during registration, upload it now
      if (resumeFile && res.access_token) {
        try {
          const { uploadProfileResume } = await import("@/lib/api");
          await uploadProfileResume(resumeFile, res.access_token);
        } catch (uploadErr) {
          console.warn("Auto resume upload deferred to wizard:", uploadErr);
        }
      }

      setTimeout(() => {
        if (redirectTarget) {
          router.push(redirectTarget);
        } else {
          router.push("/onboarding");
        }
      }, 900);
    } catch (err: any) {
      setOtpError(err.message || "Invalid or expired verification code. Please try again.");
      setOtpLoading(false);
    }
  };

  // Resend OTP
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
      setOtpError(err.message || "Failed to resend code. Please try again later.");
    } finally {
      setResendLoading(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const loginHref = redirectTarget
    ? `/auth/login?redirect=${encodeURIComponent(redirectTarget)}`
    : "/auth/login";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-4 sm:p-6 transition-colors duration-200">
      {step === "form" ? (
        <Card className="flex w-full max-w-[560px] shadow-lg flex-col gap-6 p-6 sm:p-8 bg-card border-border rounded-3xl">
          <CardHeader className="flex flex-col items-center gap-3 p-0 text-center">
            <BrandLogo size="lg" href="/" />

            <div className="flex flex-col space-y-1 mt-1">
              <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#087F68] dark:text-[#21A67A] text-xs font-semibold w-fit mx-auto mb-1">
                <span>Step 1 of 4: Account Registration</span>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Create your career profile
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md">
                Join verified job seekers across India. Get matched directly to top ATS tech openings.
              </CardDescription>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="p-0">
            {generalError && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{generalError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4.5">
              {/* 1. Full Name */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fullName" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Full Name <span className="text-destructive">*</span></span>
                </Label>
                <Input
                  id="fullName"
                  name="name"
                  autoComplete="name"
                  placeholder="Aarav Sharma"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (nameError && e.target.value.trim().length >= 2) setNameError(null);
                  }}
                  onBlur={handleNameBlur}
                  className={`rounded-xl bg-background border-border text-foreground transition-colors ${
                    nameError ? "border-destructive focus-visible:ring-destructive" : ""
                  }`}
                  required
                />
                {nameError && (
                  <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{nameError}</span>
                  </p>
                )}
              </div>

              {/* 2. Email Address */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Email Address <span className="text-destructive">*</span></span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="candidate@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError && isValidEmail(e.target.value)) setEmailError(null);
                  }}
                  onBlur={handleEmailBlur}
                  className={`rounded-xl bg-background border-border text-foreground transition-colors ${
                    emailError ? "border-destructive focus-visible:ring-destructive" : ""
                  }`}
                  required
                />
                {emailError && (
                  <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{emailError}</span>
                  </p>
                )}
              </div>

              {/* 3. Password */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Password <span className="text-destructive">*</span></span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError && e.target.value.length >= 6) setPasswordError(null);
                    }}
                    onBlur={handlePasswordBlur}
                    className={`pe-10 rounded-xl bg-background border-border text-foreground transition-colors ${
                      passwordError ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-muted-foreground hover:text-foreground absolute inset-y-0 end-0 flex h-full w-10 items-center justify-center cursor-pointer transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{passwordError}</span>
                  </p>
                )}
              </div>

              {/* 4. Mobile Number */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mobileNumber" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Mobile Number (10 digits) <span className="text-destructive">*</span></span>
                </Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-semibold text-muted-foreground border-r border-border pr-2 select-none">
                    +91
                  </span>
                  <Input
                    id="mobileNumber"
                    name="tel"
                    type="tel"
                    autoComplete="tel"
                    placeholder="9876543210"
                    value={mobileNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setMobileNumber(val);
                      if (mobileError && isValidIndianMobile(val)) setMobileError(null);
                    }}
                    onBlur={handleMobileBlur}
                    className={`pl-14 rounded-xl bg-background border-border text-foreground transition-colors font-mono ${
                      mobileError ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                    maxLength={10}
                    required
                  />
                </div>
                {mobileError && (
                  <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{mobileError}</span>
                  </p>
                )}
              </div>

              {/* 5. Work Status (Fresher vs Experienced) */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Work Status <span className="text-destructive">*</span></span>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setWorkStatus("fresher")}
                    className={`flex flex-col items-start p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                      workStatus === "fresher"
                        ? "border-primary bg-primary/10 shadow-xs"
                        : "border-border bg-card/60 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <GraduationCap className={`w-4 h-4 ${workStatus === "fresher" ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-xs font-bold text-foreground">Fresher</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      Student or have not worked full-time yet
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWorkStatus("experienced")}
                    className={`flex flex-col items-start p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                      workStatus === "experienced"
                        ? "border-primary bg-primary/10 shadow-xs"
                        : "border-border bg-card/60 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Briefcase className={`w-4 h-4 ${workStatus === "experienced" ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-xs font-bold text-foreground">Experienced</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      Have full-time or contract work history
                    </span>
                  </button>
                </div>
              </div>

              {/* 6. Current City */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="currentCity" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Current City <span className="text-destructive">*</span></span>
                </Label>
                <Input
                  id="currentCity"
                  name="city"
                  placeholder="e.g. Bengaluru, Pune, Hyderabad, Delhi NCR..."
                  value={currentCity}
                  onChange={(e) => {
                    setCurrentCity(e.target.value);
                    if (cityError && e.target.value.trim().length >= 2) setCityError(null);
                  }}
                  onBlur={handleCityBlur}
                  className={`rounded-xl bg-background border-border text-foreground transition-colors ${
                    cityError ? "border-destructive focus-visible:ring-destructive" : ""
                  }`}
                  required
                />
                {cityError && (
                  <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{cityError}</span>
                  </p>
                )}

                {/* Popular City Suggestions */}
                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                  <span className="text-[11px] text-muted-foreground">Quick select:</span>
                  {POPULAR_CITIES.slice(0, 6).map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => {
                        setCurrentCity(city);
                        setCityError(null);
                      }}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-muted/60 hover:bg-primary/15 hover:text-primary transition-colors text-muted-foreground cursor-pointer"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              {/* 7. Resume Upload (Optional at this stage) */}
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Resume Upload <span className="text-xs font-normal text-muted-foreground">(Optional)</span></span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">PDF or DOCX ≤ 5 MB</span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleResumeSelect}
                  className="hidden"
                  id="regResumeUpload"
                />

                {resumeFile ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-primary/30 bg-primary/10">
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-bold text-foreground truncate">{resumeFile.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to parse
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveResume}
                      className="p-1 rounded-md text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="regResumeUpload"
                    className="border border-dashed border-border hover:border-primary/50 bg-background/50 hover:bg-background rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-all text-xs text-muted-foreground"
                  >
                    <UploadCloud className="w-4 h-4 text-primary shrink-0" />
                    <span>Upload resume to auto-fill your profile details</span>
                  </label>
                )}

                {resumeError && (
                  <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{resumeError}</span>
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full mt-2 rounded-full py-5 text-sm font-bold bg-primary hover:bg-[--primary-hover] text-white shadow-sm cursor-pointer transition-all"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </Button>

              <div className="text-center text-xs text-muted-foreground mt-1">
                Already registered?{" "}
                <Link href={loginHref} className="text-primary font-medium hover:underline">
                  Sign in here
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        /* STEP 2: EMAIL OTP VERIFICATION */
        <Card className="flex w-full max-w-[460px] shadow-lg flex-col gap-6 p-6 sm:p-8 bg-card border-border rounded-3xl">
          <CardHeader className="flex flex-col items-center gap-3 p-0 text-center">
            <BrandLogo size="lg" href="/" />

            <div className="flex flex-col space-y-1 mt-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[#087F68] dark:text-[#21A67A] flex items-center justify-center mx-auto mb-2 shadow-2xs">
                <Mail className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Verify your email address
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
                  Setting up your profile builder and opening Step 2...
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
                      Verify & Open Profile Builder
                    </span>
                  )}
                </Button>
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
