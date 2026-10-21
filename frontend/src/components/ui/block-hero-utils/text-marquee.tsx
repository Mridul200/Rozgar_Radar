"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TextMarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  duration?: number;
  gap?: string;
  repeat?: number;
  pauseOnHover?: boolean;
}

export function TextMarquee({
  children,
  duration = 20,
  gap = "1rem",
  repeat = 3,
  pauseOnHover = true,
  className,
  ...props
}: TextMarqueeProps) {
  return (
    <div
      className={cn(
        "group flex overflow-hidden select-none [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-around gap-[--gap] animate-marquee",
          pauseOnHover && "group-hover:[animation-play-state:paused]",
        )}
        style={
          {
            "--gap": gap,
            animationDuration: `${duration}s`,
          } as React.CSSProperties
        }
      >
        {Array.from({ length: repeat }).map((_, i) => (
          <React.Fragment key={i}>{children}</React.Fragment>
        ))}
      </div>
      <div
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-around gap-[--gap] animate-marquee",
          pauseOnHover && "group-hover:[animation-play-state:paused]",
        )}
        style={
          {
            "--gap": gap,
            animationDuration: `${duration}s`,
          } as React.CSSProperties
        }
      >
        {Array.from({ length: repeat }).map((_, i) => (
          <React.Fragment key={i}>{children}</React.Fragment>
        ))}
      </div>
    </div>
  );
}

