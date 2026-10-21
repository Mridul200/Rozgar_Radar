"use client";

import { cn } from "@/lib/utils";
import React, { useState } from "react";

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
import { RiUserFill } from "@remixicon/react";

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
      : "Start discovering verified jobs with your AI agent.";

  return (
    <Card className="flex w-full max-w-[440px] shadow-none flex-col gap-6 p-5 md:p-8 bg-card border-border/80">
      <CardHeader className="flex flex-col items-center gap-2 p-0">
        <div className="relative flex size-[68px] shrink-0 items-center justify-center rounded-full backdrop-blur-xl md:size-24 before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-b before:from-neutral-500 before:to-transparent before:opacity-10">
          <div className="relative z-10 flex size-12 items-center justify-center rounded-full bg-background dark:bg-muted/80 shadow-xs ring-1 ring-inset ring-border md:size-16">
            <RiUserFill className="size-6 text-muted-foreground/80 md:size-8" />
          </div>
        </div>

        <div className="flex flex-col space-y-1.5 text-center">
          <CardTitle className="md:text-xl font-medium">
            {title || defaultTitle}
          </CardTitle>
          <CardDescription className="tracking-[-0.006em]">
            {description || defaultDesc}
          </CardDescription>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="p-0">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {mode === "register" && setFullName && (
            <div className="flex flex-col gap-2.5">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Aarav Sharma"
                className="rounded-lg"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              className="rounded-lg"
              value={email}
              onChange={(e) => setEmail && setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                className="pe-9 rounded-lg"
                placeholder="Password"
                type={isVisible ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword && setPassword(e.target.value)}
                required
              />
              <button
                className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={toggleVisibility}
                aria-label={isVisible ? "Hide password" : "Show password"}
                aria-pressed={isVisible}
                aria-controls="password"
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
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="keep-me-logged-in"
                  checked={keepLoggedIn}
                  onCheckedChange={(checked) => setKeepLoggedIn && setKeepLoggedIn(!!checked)}
                />
                <Label
                  htmlFor="keep-me-logged-in"
                  className="block cursor-pointer text-xs sm:text-sm"
                >
                  Keep me logged in
                </Label>
              </div>
              <Button variant="link" size="sm" type="button" className="p-0 text-xs text-primary">
                Forgot password?
              </Button>
            </div>
          )}

          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </span>
            ) : mode === "login" ? (
              "Continue"
            ) : (
              "Create Account"
            )}
          </Button>

          {footerLink && <div className="mt-2 text-center text-xs text-muted-foreground">{footerLink}</div>}
        </form>
      </CardContent>
    </Card>
  );
};

export const Component = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const toggleVisibility = () => setIsVisible((prevState) => !prevState);

  return (
    <Card className="flex w-full max-w-[440px] shadow-none flex-col gap-6 p-5 md:p-8">
      <CardHeader className="flex flex-col items-center gap-2">
        <div className="relative flex size-[68px] shrink-0 items-center justify-center rounded-full backdrop-blur-xl md:size-24 before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-b before:from-neutral-500 before:to-transparent before:opacity-10">
          <div className="relative z-10 flex size-12 items-center justify-center rounded-full bg-background dark:bg-muted/80 shadow-xs ring-1 ring-inset ring-border md:size-16">
            <RiUserFill className="size-6 text-muted-foreground/80 md:size-8" />
          </div>
        </div>

        <div className="flex flex-col space-y-1.5 text-center">
          <CardTitle className="md:text-xl font-medium">
            Sign in to your account
          </CardTitle>
          <CardDescription className="tracking-[-0.006em]">
            Enter your credentials to access your account.
          </CardDescription>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="p-0">
        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="email-preview">Email</Label>
            <Input
              id="email-preview"
              placeholder="Enter your email"
              className="rounded-lg"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <Label htmlFor="password-preview">Password</Label>
            <div className="relative">
              <Input
                id="password-preview"
                className="pe-9 rounded-lg"
                placeholder="Password"
                type={isVisible ? "text" : "password"}
              />
              <button
                className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={toggleVisibility}
                aria-label={isVisible ? "Hide password" : "Show password"}
                aria-pressed={isVisible}
                aria-controls="password-preview"
              >
                {isVisible ? (
                  <EyeOffIcon size={16} aria-hidden="true" />
                ) : (
                  <EyeIcon size={16} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-2">
              <Checkbox id="keep-me-logged-in-preview" />
              <Label
                htmlFor="keep-me-logged-in-preview"
                className="block cursor-pointer"
              >
                Keep me logged in
              </Label>
            </div>
            <Button variant="link" size="sm" className="p-0">
              Forgot password?
            </Button>
          </div>

          <Button type="button" className="w-full">
            Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

