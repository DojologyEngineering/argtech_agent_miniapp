"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/misc";
import { bindBackButton, haptic } from "@/lib/telegram";
import { useTelegram } from "@/app/providers";

/**
 * Green chrome shared by every screen. Variants mirror the design:
 * a plain title bar for lists, and a back + title (optionally with an
 * identity block and a corner action) for detail and form screens.
 */
export function ScreenHeader({
  title,
  subtitle,
  backHref,
  onBack,
  action,
  avatarName,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  onBack?: () => void;
  action?: React.ReactNode;
  avatarName?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const { inTelegram } = useTelegram();
  const showBack = Boolean(backHref || onBack);

  const handleBack = React.useCallback(() => {
    haptic("light");
    if (onBack) return onBack();
    if (backHref) return router.push(backHref);
    router.back();
  }, [onBack, backHref, router]);

  // Inside Telegram, the native BackButton replaces the "Close" chevron in
  // the app's own chrome — so this screen doesn't need to spend header space
  // on its own back row. Outside Telegram (plain browser) there's no such
  // chrome, so the in-header button below is the only way back.
  React.useEffect(() => {
    if (!showBack || !inTelegram) return;
    return bindBackButton(handleBack);
  }, [showBack, inTelegram, handleBack]);

  return (
    <header
      className={cn(
        "sticky top-0 z-[800] bg-brand-600 px-4 pb-5 pt-[calc(var(--safe-top)+14px)] text-white",
        className,
      )}
    >
      {showBack && !inTelegram ? (
        <button
          type="button"
          onClick={handleBack}
          className="-ml-1 mb-3 flex items-center gap-1 text-[15px] font-medium text-white/90"
        >
          <ChevronLeft className="size-5" />
          Back
        </button>
      ) : null}

      <div className="flex items-center gap-3">
        {avatarName ? (
          <Avatar
            name={avatarName}
            size="lg"
            className="border-[3px] border-white bg-white text-brand-700"
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[26px] font-extrabold leading-tight">{title}</h1>
          {subtitle ? <p className="mt-0.5 truncate text-sm text-white/80">{subtitle}</p> : null}
        </div>

        {action}
      </div>

      {children ? <div className="mt-4">{children}</div> : null}
    </header>
  );
}

/** Circular icon button used at the top-right of headers (edit, add). */
export function HeaderIconButton({
  href,
  onClick,
  label,
  children,
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  children: React.ReactNode;
}) {
  const className =
    "flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25";

  if (href) {
    return (
      <Link href={href} aria-label={label} className={className} onClick={() => haptic("light")}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} className={className} onClick={onClick}>
      {children}
    </button>
  );
}
