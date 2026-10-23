"use client";

import { cn } from "@/lib/utils";
import React, { useState } from "react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

import { EyeIcon, EyeOffIcon, AlertCircle, Loader2 } from "lucide-react";

export interface AuthenticationCardProps {
  mode?: "login" | "register";
  title?: string;
  description?: string;
  email?: string;
  setEmail?: (val: string) => void;
  password?: string;
  setPassword?: (val: string) => void;
  fullName?: string;
  setFullName?: (val: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
  loading?: boolean;
  error?: string | null;
  keepLoggedIn?: boolean;
  setKeepLoggedIn?: (val: boolean) => void;
  footerLink?: React.ReactNode;
}

export const AuthenticationCard = ({
  mode = "login",
  title,
  description,
  email = "",
  setEmail,
  password = "",
  setPassword,
  fullName = "",
  setFullName,
  onSubmit,
  loading = false,
  error = null,
  keepLoggedIn = false,
  setKeepLoggedIn,
  footerLink,
}: AuthenticationCardProps) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const toggleVisibility = () => setIsVisible((prevState) => !prevState);

  const defaultTitle = mode === "login" ? "Sign in to your account" : "Create an account";
  const defaultDesc =
    mode === "login"
      ? "Enter your credentials to access your account."
      : "Start discovering verified jobs with your AI career copilot.";

  return (
    <Card className="flex w-full max-w-[440px] shadow-md flex-col gap-6 p-6 sm:p-8 bg-card border-border rounded-3xl">
      <CardHeader className="flex flex-col items-center gap-3 p-0 text-center">
        <BrandLogo size="lg" href="/" />

        <div className="flex flex-col space-y-1.5 mt-2">
          <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {title || defaultTitle}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {description || defaultDesc}
          </CardDescription>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="p-0">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {mode === "register" && setFullName && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName" className="text-xs font-semibold text-foreground">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Aarav Sharma"
                className="rounded-xl bg-background border-border text-foreground"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-xs font-semibold text-foreground">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="candidate@example.com"
              className="rounded-xl bg-background border-border text-foreground"
              value={email}
              onChange={(e) => setEmail && setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="text-xs font-semibold text-foreground">Password</Label>
            <div className="relative">
              <Input
                id="password"
                className="pe-10 rounded-xl bg-background border-border text-foreground"
                placeholder="••••••••••••"
                type={isVisible ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword && setPassword(e.target.value)}
                required
              />
              <button
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 end-0 flex h-full w-10 items-center justify-center cursor-pointer transition-colors"
                type="button"
                onClick={toggleVisibility}
                aria-label={isVisible ? "Hide password" : "Show password"}
              >
                {isVisible ? (
                  <EyeOffIcon size={16} aria-hidden="true" />
                ) : (
                  <EyeIcon size={16} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {mode === "login" && (
            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="keep-me-logged-in"
                  checked={keepLoggedIn}
                  onCheckedChange={(checked) => setKeepLoggedIn && setKeepLoggedIn(!!checked)}
                />
                <Label
                  htmlFor="keep-me-logged-in"
                  className="block cursor-pointer text-xs text-muted-foreground font-medium"
                >
                  Keep me logged in
                </Label>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full mt-2 rounded-full py-5 text-sm font-bold bg-primary hover:bg-[--primary-hover] text-white shadow-sm cursor-pointer transition-all"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </span>
            ) : mode === "login" ? (
              "Sign In to Account"
            ) : (
              "Create Free Account"
            )}
          </Button>

          {footerLink && <div className="mt-3 text-center text-xs text-muted-foreground">{footerLink}</div>}
        </form>
      </CardContent>
    </Card>
  );
};

export default AuthenticationCard;
export const Component = AuthenticationCard;
