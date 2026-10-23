"use client";
import { cn } from "@/lib/utils";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Moon, Send, Sun, Phone, Mail, MapPin } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
    </svg>
  );
}

import { isValidEmail, EMAIL_ERROR_MESSAGE } from "@/lib/email-validation";

function Footerdemo() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const isDarkMode = theme === "dark";
  const [emailInput, setEmailInput] = React.useState("");
  const [emailError, setEmailError] = React.useState<string | null>(null);

  const handleBlur = () => {
    if (emailInput.trim() && !isValidEmail(emailInput)) {
      setEmailError(EMAIL_ERROR_MESSAGE);
    } else {
      setEmailError(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailInput(e.target.value);
    if (emailError && isValidEmail(e.target.value)) {
      setEmailError(null);
    }
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = emailInput.trim();
    if (!clean || !isValidEmail(clean)) {
      setEmailError(EMAIL_ERROR_MESSAGE);
      return;
    }
    setEmailError(null);
    router.push(`/auth/register?email=${encodeURIComponent(clean)}`);
  };

  return (
    <footer className="relative border-t border-border bg-card text-foreground transition-colors duration-200">
      <div className="container mx-auto px-4 py-12 md:px-6 lg:px-8 max-w-7xl">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <div className="mb-4">
              <BrandLogo size="md" href="/" showSubtitle />
            </div>
            <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
              Find the right job. Build a better future with India&apos;s verified ATS job platform and AI career assistant.
            </p>
            <form onSubmit={handleSubscribe} className="relative">
              <Input
                type="email"
                value={emailInput}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter email to get job alerts"
                className={cn(
                  "pr-12 bg-background border-border text-foreground placeholder:text-muted-foreground rounded-full text-xs transition-colors",
                  emailError && "border-destructive focus-visible:ring-destructive"
                )}
                required
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 top-1 h-8 w-8 rounded-full bg-primary text-white hover:bg-[--primary-hover] transition-transform hover:scale-105 cursor-pointer shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
                <span className="sr-only">Get Started</span>
              </Button>
              {emailError && (
                <p className="text-[11px] font-medium text-destructive mt-1.5 px-3">
                  {emailError}
                </p>
              )}
            </form>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-bold text-foreground tracking-wider uppercase">Career Platform</h3>
            <nav className="space-y-2.5 text-sm">
              <Link href="/" className="block text-muted-foreground transition-colors hover:text-primary">
                Home
              </Link>
              <Link href="/jobs" className="block text-muted-foreground transition-colors hover:text-primary">
                Explore Jobs
              </Link>
              <Link href="/automation" className="block text-muted-foreground transition-colors hover:text-primary">
                Daily Email Automation
              </Link>
              <Link href="/resume-builder" className="block text-muted-foreground transition-colors hover:text-primary">
                Resume Builder
              </Link>
              <Link href="/ats-checker" className="block text-muted-foreground transition-colors hover:text-primary">
                ATS Scorer
              </Link>
              <Link href="/saved-jobs" className="block text-muted-foreground transition-colors hover:text-primary">
                Application Tracker
              </Link>
            </nav>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-bold text-foreground tracking-wider uppercase">Verified Sources</h3>
            <div className="space-y-2.5 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Greenhouse ATS
              </p>
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                Lever Board Ingestion
              </p>
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                Ashby Jobs
              </p>
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Workday Career Sites
              </p>
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                SmartRecruiters India
              </p>
            </div>
          </div>

          <div className="relative">
            <h3 className="mb-4 text-xs font-bold text-foreground tracking-wider uppercase">Preferences & Theme</h3>
            <div className="mb-6 flex space-x-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full bg-background border-border text-foreground hover:bg-accent cursor-pointer">
                      <LinkedinIcon className="h-4 w-4" />
                      <span className="sr-only">LinkedIn</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>LinkedIn</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full bg-background border-border text-foreground hover:bg-accent cursor-pointer">
                      <TwitterIcon className="h-4 w-4" />
                      <span className="sr-only">Twitter</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Twitter</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full bg-background border-border text-foreground hover:bg-accent cursor-pointer">
                      <FacebookIcon className="h-4 w-4" />
                      <span className="sr-only">Facebook</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Facebook</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex items-center space-x-3 text-muted-foreground text-xs p-3 rounded-2xl border border-border bg-background w-fit">
              <Sun className="h-4 w-4 text-amber-500" />
              <Switch
                id="dark-mode"
                checked={isDarkMode}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
              <Moon className="h-4 w-4 text-slate-400" />
              <Label htmlFor="dark-mode" className="text-xs text-foreground font-medium cursor-pointer">
                {isDarkMode ? "Dark Theme" : "Light Theme"}
              </Label>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-center md:flex-row text-xs text-muted-foreground">
          <p>© 2026 Rozgar Radar. All rights reserved. 100% direct official ATS application links.</p>
          <nav className="flex gap-6">
            <Link href="/admin/sources" className="transition-colors hover:text-primary">
              Source Health
            </Link>
            <Link href="/embed" className="transition-colors hover:text-primary">
              Web Embed
            </Link>
            <Link href="/jobs" className="transition-colors hover:text-primary">
              All Openings
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export { Footerdemo };
