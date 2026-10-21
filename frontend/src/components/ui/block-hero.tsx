"use client";

// react
import { Fragment } from "react";

// next
import Link from "next/link";

// shadcn
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/block-hero-utils/button";
import { TextMarquee } from "@/components/ui/block-hero-utils/text-marquee";

// project-imports
import HoverBg from "@/components/ui/block-hero-utils/hover-bg";
import BaseUi from "@/components/ui/block-hero-utils/baseui-icon";
import Shadcn from "@/components/ui/block-hero-utils/shadcn-icon";
import Tailwind from "@/components/ui/block-hero-utils/tailwind-icon";

// assets
import {
  IconArrowUpRight,
  IconBrandNextjs,
  IconBrandReact,
  IconBrandTypescript,
  IconShieldCheck,
  IconCompass,
  IconSparkles,
} from "@tabler/icons-react";

//  ------------------------------ | CONSTANTS | ------------------------------  //

const branding = {
  brandName: "HirePulse",
  title: "Direct ATS Feeds to In-Demand Careers",
};

const techIcons = [
  { name: "React", Icon: IconBrandReact },
  { name: "Next.js", Icon: IconBrandNextjs },
  { name: "TypeScript", Icon: IconBrandTypescript },
  { name: "Tailwind CSS", Icon: Tailwind },
  { name: "Shadcn UI", Icon: Shadcn },
  { name: "Direct ATS", Icon: BaseUi },
];

interface HeroProps {
  totalJobs?: number;
}

//  ------------------------------ | HELPERS | ------------------------------  //

function StatItems({ totalJobs }: { totalJobs?: number }) {
  const stats = [
    { label: "Verified Openings", value: totalJobs && totalJobs > 0 ? `${totalJobs.toLocaleString()}+` : "2,080+" },
    { label: "Official ATS Sources", value: "10+" },
    { label: "Sync Cadence", value: "12h" },
    { label: "Ghost Postings", value: "0%" },
  ];

  return (
    <>
      {stats.map((item, index) => (
        <Fragment key={item.label}>
          <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs whitespace-nowrap sm:text-sm">
            <span className="font-bold text-foreground">{item.value}</span>
            <span className="text-muted-foreground">{item.label}</span>
          </span>
          {index < stats.length - 1 && (
            <span aria-hidden className="h-3.5 w-px shrink-0 bg-border" />
          )}
        </Fragment>
      ))}
    </>
  );
}

//  ------------------------------ | HERO | ------------------------------  //

export default function Hero({ totalJobs }: HeroProps) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative mx-auto flex w-full flex-col items-center gap-8 overflow-hidden px-4 pt-16 pb-12 sm:px-8 lg:px-24 border-b border-border"
    >
      <div
        className="pointer-events-none absolute -top-28 left-1/2 z-0 h-96 w-[680px] -translate-x-1/2 opacity-35 dark:opacity-60"
        style={{
          background:
            "linear-gradient(90deg, var(--color-violet-500) 0%, var(--primary) 50%, var(--color-teal-500) 100%)",
          filter: "blur(240px)",
        }}
      />

      <HoverBg className="opacity-60 dark:opacity-60" />

      {/* Pill marquee / stats bar */}
      <div className="relative z-10 flex w-full justify-center">
        {/* Mobile: scrolling marquee */}
        <div className="w-full max-w-sm overflow-hidden rounded-full border border-border bg-card/80 backdrop-blur-md px-1.5 py-1 shadow-sm sm:hidden">
          <TextMarquee duration={18} gap="0px" repeat={3}>
            <div className="flex items-center">
              <StatItems totalJobs={totalJobs} />
              <span aria-hidden className="h-3.5 w-px shrink-0 bg-border" />
            </div>
          </TextMarquee>
        </div>

        {/* sm and up: single-row pill */}
        <div className="hidden max-w-full flex-wrap items-center justify-center rounded-full border border-border bg-card/80 backdrop-blur-md px-2 py-1 shadow-sm sm:inline-flex">
          <StatItems totalJobs={totalJobs} />
        </div>
      </div>

      {/* Heading & Subtitle */}
      <div className="relative z-10 flex w-full flex-col items-center gap-5 text-center">
        <h1
          id="hero-heading"
          className="text-center text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl md:leading-tight lg:text-7xl max-w-5xl"
        >
          Discover Verified Jobs.{" "}
          <span className="block whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-teal-400">
            Automate Your Hunt.
          </span>
        </h1>

        <p className="max-w-2xl text-center text-base font-normal text-muted-foreground md:text-lg md:leading-relaxed">
          Stop scrolling duplicate spam and ghost postings. {branding.brandName} aggregates
          direct official ATS feeds, matches your exact eligibility, dispatches daily morning alerts,
          and optimizes your applications for top recruiters.
        </p>
      </div>

      {/* CTAs */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-4 pt-2">
        <Button
          size="lg"
          id="cta-start-building"
          nativeButton={false}
          render={<Link href="/jobs" />}
          className="h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-7 font-bold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-sky-400 transition-all transform hover:-translate-y-0.5"
        >
          <IconCompass className="size-4 mr-2" aria-hidden="true" />
          Explore Verified Jobs
        </Button>
        <Button
          variant="outline"
          size="lg"
          id="cta-view-components"
          nativeButton={false}
          render={<Link href="/automation" />}
          className="h-12 gap-2 rounded-xl border-border bg-card/90 px-6 font-semibold text-foreground hover:bg-accent/40 hover:border-slate-700 transition-all"
        >
          Automate Job Search
          <IconArrowUpRight className="size-4 text-sky-400" aria-hidden="true" />
        </Button>
      </div>

      {/* Tech & ATS Platform Badges */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 pt-2">
        <span className="text-xs font-semibold text-muted-foreground mr-1 uppercase tracking-wider">
          Direct ATS Integrations:
        </span>
        {techIcons.map((item) => {
          const IconComponent = item.Icon;
          return (
            <div
              key={item.name}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-card/60 text-xs font-medium text-foreground hover:border-border transition-colors shadow-none"
              title={item.name}
            >
              <IconComponent
                className="size-4 text-sky-400"
                stroke="1.5"
                aria-hidden="true"
              />
              <span>{item.name}</span>
            </div>
          );
        })}
      </div>

      {/* Verified Product Badge */}
      <div className="relative z-10 flex items-center justify-center pt-2">
        <Badge
          variant="outline"
          className="inline-flex items-center gap-2 rounded-full border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-medium text-indigo-300"
        >
          <IconSparkles className="size-3.5 text-indigo-400" />
          <span className="font-semibold">HirePulse</span>
          <span className="text-indigo-400/60">&bull;</span>
          <span>AI Career Copilot &amp; Multi-Source Aggregator</span>
        </Badge>
      </div>
    </section>
  );
}
