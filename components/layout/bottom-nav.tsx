"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Home, Map, ShoppingCart, Sprout, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/telegram";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/farmers", label: "Farmer", icon: Users },
  { href: "/plots", label: "Plots", icon: Map },
  { href: "/crops", label: "Crops", icon: Sprout },
  { href: "/calendar", label: "Calendar", icon: CalendarClock },
  { href: "/orders", label: "Order", icon: ShoppingCart },
] as const;

/** The six root destinations. Nested screens hide the bar (see AppShell). */
export const ROOT_ROUTES = NAV_ITEMS.map((item) => item.href);

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[900] border-t border-line bg-white pb-[max(var(--safe-bottom),10px)]"
      aria-label="Main navigation"
    >
      <ul className="mx-auto flex h-[var(--nav-height)] max-w-md items-stretch">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                onClick={() => haptic("light")}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                  active ? "text-brand-600" : "text-muted",
                )}
              >
                <Icon className={cn("size-5", active && "stroke-[2.4]")} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
