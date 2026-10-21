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
} from "@tabler/icons-react";

//  ------------------------------ | CONSTANTS | ------------------------------  //

const branding = {
  brandName: "UIAble",
  title: "Components to Complete Interfaces",
};

const techIcons = [
  { name: "React", Icon: IconBrandReact },
  { name: "Next.js", Icon: IconBrandNextjs },
  { name: "Shadcn", Icon: Shadcn },
  { name: "Base UI", Icon: BaseUi },
  { name: "Tailwind CSS", Icon: Tailwind },
  { name: "TypeScript", Icon: IconBrandTypescript },
];

const stats = [
  { label: "Blocks", value: "400+" },
  { label: "Templates", value: "7" },
  { label: "Components", value: "790+" },
  { label: "Dashboards", value: "2" },
];

//  ------------------------------ | HELPERS | ------------------------------  //

function StatItems() {
  return (
    <>
      {stats.map((item, index) => (
        <Fragment key={item.label}>
          <span className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs whitespace-nowrap sm:text-sm">
            <span className="text-muted-foreground">{item.value}</span>
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

export default function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative mx-auto flex w-full flex-col items-center gap-9 overflow-hidden px-4 pt-20 pb-12.5 sm:px-8 lg:px-24"
    >
      <div
        className="pointer-events-none absolute -top-30 left-1/2 z-0 h-96 w-226 -translate-x-1/2 opacity-30 dark:opacity-60"
        style={{
          background:
            "linear-gradient(90deg, var(--color-violet-500) 0%, var(--primary) 50%, var(--color-teal-500) 100%)",
          filter: "blur(260px)",
        }}
      />

      <HoverBg className="opacity-60 dark:opacity-60" />

      <div className="relative z-10 flex w-full justify-center">
        {/* Mobile: scrolling marquee */}
        <div className="w-full max-w-xs overflow-hidden rounded-full border border-border bg-card px-1.5 py-1 shadow-sm sm:hidden">
          <TextMarquee duration={16} gap="0px" repeat={3}>
            <div className="flex items-center">
              <StatItems />
              <span aria-hidden className="h-3.5 w-px shrink-0 bg-border" />
            </div>
          </TextMarquee>
        </div>

        {/* sm and up: single-row pill */}
        <div className="hidden max-w-full flex-wrap items-center justify-center rounded-full border border-border bg-card px-1.5 py-1 shadow-sm sm:inline-flex">
          <StatItems />
        </div>
      </div>

      <div className="relative z-10 flex w-full flex-col items-center gap-7">
        <h1
          id="hero-heading"
          className="text-center text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl md:leading-none lg:text-7xl"
        >
          Components to{" "}
          <span className="block whitespace-nowrap text-primary">
            Complete Interfaces
          </span>
        </h1>

        <p className="max-w-182 text-center text-base font-normal text-foreground md:text-lg md:leading-7">
          {branding.brandName} is a structured, shadcn-based UI system designed
          to help developers build scalable, production-ready applications
          faster.
        </p>
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-center gap-4">
        <Button
          size="lg"
          id="cta-start-building"
          nativeButton={false}
          render={<Link href="/doc/introduction" />}
          className="h-11 rounded-lg bg-foreground px-6 font-medium text-background hover:bg-foreground/90"
        >
          Start Building
        </Button>
        <Button
          variant="outline"
          size="lg"
          id="cta-view-components"
          nativeButton={false}
          render={<Link href="/components" />}
          className="h-11 gap-2 rounded-lg border-border bg-card px-6 font-medium text-foreground hover:bg-accent dark:border-border dark:bg-card dark:hover:bg-accent/10"
        >
          View Components
          <IconArrowUpRight className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="relative z-10 flex items-center justify-center gap-4">
        {techIcons.map((item) => {
          const IconComponent = item.Icon;
          return (
            <Button
              key={item.name}
              size="icon-lg"
              className="h-11 w-11 border-0 bg-transparent text-foreground shadow-none hover:bg-transparent"
              title={item.name}
              aria-label={item.name}
            >
              <IconComponent
                className="size-6"
                stroke="1.5"
                aria-hidden="true"
              />
            </Button>
          );
        })}
      </div>

      <div className="relative z-10 flex items-center justify-center">
        <Link
          href="https://codedthemes.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Badge
            variant="outline"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-primary/20"
          >
            Product by
            <img
              src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAOdEVYdFNvZnR3YXJlAEZpZ21hnrGWYwAAAlJJREFUeAGdlUty2kAQhrtHPIqEBSkuQG6gI8AJkmxiCqgynMBkmcQUUiCVZZQTRIvYDt6EG+CcwLqBdQFiqmJMgZDaM3oZqfRwuVcz09Pf9LT+HiFkWP/bpmHZhRNAegsEDX/Z4GOjuLdVXa2YabGY5uhNdhohnEC2aWenpQ9PBnenW527jg+WDOJZugHoZt4MPQT62ag0yAXHoCuHaHAxKs8P97R5iZgjLdAvDyHNS7vSQFdxlQiOQwl3rfPPVQMSLA4XtypaxVYAx+dAnwJnYtabbJUs6O/l3XB2u765/Le+nS3/K+H6x4rpMLslYvwl2SpY392MPUlJN2nQ2XKt8HuNDzPlGerv6y/DD9b5eicjlRZ8WBNzrhRkliM9BhEM86DuNoT+5XL9M5iLGJEQH14ROkP38O7UuuZbZSIyz0fl13lQiKauHb2qJuqYCai/6yoSg/AG8oxwmOZiqTF+vZ5rjF/XdEcIcgRM9CMvmAi1dDDh3OOC3J5smoGjXa9qQExJh4Lerr8I69v5sul3p7vrjitdDralfZiZhNKf/njTCOZH9YqaBPegj3LrC7kxSahERkT3gzMhcgAnOLlmFdgiDnccW0AMXneTF1+JQ/eehsND/Qp41ptuxwSo+F6TmPUur6Xd5uItHbzV/GDjnrf0nLd05BGKwHPeiyyoW4rDzb9OyyoCBeCaaNPuZHcch/YmVjMLGilFRuZ+aZgBDq3Qk2UozSRoKjgRnmza2iqqcWgmWJh4b5H/TLnYm3zaANGNvKEcoX0G84tPxb9psQ+CXlM4i1QKLQAAAABJRU5ErkJggg=="
              alt=""
              width={16}
              height={16}
              className="size-4"
            />
            <span className="font-semibold">CodedThemes</span>
          </Badge>
        </Link>
      </div>
    </section>
  );
}

