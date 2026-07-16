"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartColumn,
  Clapperboard,
  Columns3,
  Ellipsis,
  Library,
  ListVideo,
  Plus,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/kbd";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { href: "/", label: "Pipeline", icon: Columns3 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/banks", label: "Banks", icon: Library },
  { href: "/series", label: "Series", icon: ListVideo },
  { href: "/review", label: "Review", icon: ChartColumn },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/video");
  return pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-svh w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-6">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Clapperboard className="size-3.5" aria-hidden />
        </span>
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-sidebar-foreground"
        >
          Content OS
        </Link>
      </div>
      <div className="px-3 pb-4">
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("content-os:capture"))
          }
          className="flex w-full items-center gap-2 rounded-lg border bg-card px-2.5 py-2 text-sm font-medium text-sidebar-foreground shadow-xs transition-shadow hover:shadow-card-hover"
        >
          <Plus className="size-4 text-sidebar-foreground/50" aria-hidden />
          Capture idea
          <Kbd className="ms-auto">⌘K</Kbd>
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Main">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                active &&
                  "bg-sidebar-accent font-medium text-sidebar-foreground shadow-none",
              )}
            >
              <Icon
                className={cn(
                  "size-4 text-sidebar-foreground/40 transition-colors group-hover:text-sidebar-foreground/70",
                  active && "text-sidebar-foreground/80",
                )}
                aria-hidden
              />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center justify-between px-5 pb-4">
        <p className="text-xs text-sidebar-foreground/45">
          <Kbd>?</Kbd> shortcuts
        </p>
        <ThemeToggle />
      </div>
    </aside>
  );
}

/* Bottom tab bar — thumb-reachable nav with a prominent capture button.
   Banks / Series / Settings live behind “More”. */

const MOBILE_TABS = [
  { href: "/", label: "Pipeline", icon: Columns3 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
] as const;

const MORE_LINKS = [
  { href: "/banks", label: "Banks", icon: Library },
  { href: "/series", label: "Series", icon: ListVideo },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function MobileTab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-1 py-2 text-2xs font-medium",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <Icon className={cn("size-5", !active && "opacity-70")} aria-hidden />
      {label}
    </Link>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreActive = MORE_LINKS.some(({ href }) => isActive(pathname, href));

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {moreOpen && (
        <div className="absolute inset-x-3 bottom-full mb-2 rounded-2xl border bg-popover p-1.5 shadow-card-hover">
          {MORE_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMoreOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-popover-foreground",
                isActive(pathname, href) && "bg-accent font-medium",
              )}
            >
              <Icon className="size-4 text-muted-foreground" aria-hidden />
              {label}
            </Link>
          ))}
          <div className="flex items-center justify-between rounded-xl px-3 py-1.5">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      )}
      <div className="grid grid-cols-5 items-center px-2">
        {MOBILE_TABS.map((tab) => (
          <MobileTab
            key={tab.href}
            {...tab}
            active={isActive(pathname, tab.href)}
          />
        ))}
        <div className="flex justify-center">
          <button
            type="button"
            aria-label="Capture idea"
            onClick={() => {
              setMoreOpen(false);
              window.dispatchEvent(new CustomEvent("content-os:capture"));
            }}
            className="-mt-5 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card-hover"
          >
            <Plus className="size-5" aria-hidden />
          </button>
        </div>
        <MobileTab
          href="/review"
          label="Review"
          icon={ChartColumn}
          active={isActive(pathname, "/review")}
        />
        <button
          type="button"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((prev) => !prev)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-2 text-2xs font-medium",
            moreActive || moreOpen ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <Ellipsis
            className={cn("size-5", !(moreActive || moreOpen) && "opacity-70")}
            aria-hidden
          />
          More
        </button>
      </div>
    </nav>
  );
}
