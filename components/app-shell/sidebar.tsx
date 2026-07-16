"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartColumn,
  Clapperboard,
  Columns3,
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

export function MobileNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 flex items-center gap-1 overflow-x-auto border-b bg-background/90 px-2 py-2 backdrop-blur md:hidden">
      <nav className="flex flex-1 items-center gap-1" aria-label="Main">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
                active && "bg-accent font-medium text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              <span className="sr-only sm:not-sr-only">{label}</span>
            </Link>
          );
        })}
      </nav>
      <ThemeToggle />
    </header>
  );
}
