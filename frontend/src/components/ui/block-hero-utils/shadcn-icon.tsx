import * as React from "react";

export default function Shadcn({
  className = "size-6",
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 256 256"
      className={className}
      fill="currentColor"
      {...props}
    >
      <line
        x1="208"
        y1="128"
        x2="128"
        y2="208"
        stroke="currentColor"
        strokeWidth="24"
        strokeLinecap="round"
      />
      <line
        x1="192"
        y1="40"
        x2="40"
        y2="192"
        stroke="currentColor"
        strokeWidth="24"
        strokeLinecap="round"
      />
    </svg>
  );
}

