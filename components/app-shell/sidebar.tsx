"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartColumn,
  Columns3,
  Library,
  ListVideo,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-svh w-52 shrink-0 flex-col border-r bg-sidebar md:flex">
      <div className="px-6 pt-6 pb-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Content OS
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-4" aria-label="Main">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(pathname, href) ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
              isActive(pathname, href) &&
                "bg-sidebar-accent font-medium text-sidebar-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center justify-between px-4 py-4">
        <span className="px-2 text-xs text-muted-foreground">v1</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 flex items-center gap-1 overflow-x-auto border-b bg-background/95 px-2 py-2 backdrop-blur md:hidden">
      <nav className="flex flex-1 items-center gap-1" aria-label="Main">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(pathname, href) ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
              isActive(pathname, href) && "bg-accent font-medium text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            <span className="sr-only sm:not-sr-only">{label}</span>
          </Link>
        ))}
      </nav>
      <ThemeToggle />
    </header>
  );
}
