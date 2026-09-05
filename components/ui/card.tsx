import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-card border border-line/70 bg-white shadow-[0_1px_2px_rgba(16,33,24,0.04)]", className)}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

/** Grey section caption + hint used above card groups throughout the app. */
export function SectionHeading({
  title,
  hint,
  className,
  action,
}: {
  title: string;
  hint?: string;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("mb-2 flex items-end justify-between gap-3 px-1", className)}>
      <div>
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}
