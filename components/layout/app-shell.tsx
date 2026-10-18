"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { BottomNav, ROOT_ROUTES } from "./bottom-nav";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Nested screens (details, forms) carry their own footer actions instead.
  const showNav = ROOT_ROUTES.includes(pathname as (typeof ROOT_ROUTES)[number]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-canvas md:shadow-[0_0_0_1px_rgba(16,33,24,0.06),0_8px_40px_rgba(16,33,24,0.08)]">
      {children}
      {showNav ? <BottomNav /> : null}
    </div>
  );
}

/** Standard scrollable page body. `withNav` reserves room for the tab bar. */
export function Content({
  children,
  className,
  withNav = false,
  withFooter = false,
}: {
  children: React.ReactNode;
  className?: string;
  withNav?: boolean;
  withFooter?: boolean;
}) {
  return (
    <main
      className={cn(
        "flex-1 px-4 py-4",
        withNav && "pb-[calc(var(--nav-height)+max(var(--safe-bottom),10px)+24px)]",
        withFooter && "pb-[calc(max(var(--safe-bottom),10px)+104px)]",
        !withNav && !withFooter && "pb-[calc(max(var(--safe-bottom),10px)+32px)]",
        className,
      )}
    >
      {children}
    </main>
  );
}

/** Pinned action bar for form screens (Cancel / Save, status actions). */
export function StickyFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[850] border-t border-line bg-white/95 pb-[max(var(--safe-bottom),12px)] pt-3 backdrop-blur">
      <div className="mx-auto flex max-w-md gap-3 px-4">{children}</div>
    </div>
  );
}
