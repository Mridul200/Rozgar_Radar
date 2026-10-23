import React from "react";
import Link from "next/link";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
  showSubtitle?: boolean;
}

export function BrandLogo({
  size = "md",
  href = "/",
  className = "",
  showSubtitle = false,
}: BrandLogoProps) {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
  };

  const content = (
    <div className={`flex items-center gap-2.5 group cursor-pointer ${className}`}>
      {/* Radar Target Icon */}
      <div
        className={`${iconSizes[size]} rounded-xl bg-gradient-to-br from-[#087F68] to-[#0D8B70] text-white flex items-center justify-center shadow-sm shrink-0 transition-transform group-hover:scale-105`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          {/* Concentric radar rings */}
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.4" />
          <circle cx="12" cy="12" r="5" stroke="currentColor" strokeOpacity="0.75" />
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
          {/* Scanning radar indicator line */}
          <path d="M12 12 L18 6" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      </div>

      <div className="flex flex-col leading-tight">
        <span
          className={`font-extrabold ${textSizes[size]} tracking-tight text-foreground transition-colors group-hover:text-primary flex items-center gap-1.5`}
        >
          Rozgar Radar
        </span>
        {showSubtitle && (
          <span className="text-[10px] text-muted-foreground font-medium tracking-normal -mt-0.5">
            AI Career Copilot
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export default BrandLogo;
