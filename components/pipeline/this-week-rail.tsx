"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { WeekSlot } from "@/lib/week";
import { TypeBadge } from "./type-badge";

export function ThisWeekRail({
  slots,
  onGhostClick,
}: {
  slots: WeekSlot[];
  onGhostClick: (slot: WeekSlot) => void;
}) {
  if (slots.length === 0) return null;
  return (
    <section aria-label="This week" className="flex flex-col gap-2">
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        This week
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {slots.map((slot) =>
          slot.video ? (
            <Link
              key={slot.slotId}
              href={`/video/${slot.video.id}`}
              className={cn(
                "flex max-w-52 shrink-0 items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-xs transition-colors hover:bg-accent",
                slot.isToday && "ring-1 ring-ring/40",
              )}
            >
              <span className="font-medium text-muted-foreground">
                {slot.dayLabel}
              </span>
              <TypeBadge type={slot.video.type} />
              <span className="truncate">{slot.video.title}</span>
            </Link>
          ) : (
            <button
              key={slot.slotId}
              type="button"
              onClick={() => onGhostClick(slot)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-solid hover:bg-accent hover:text-foreground",
                slot.isToday && "ring-1 ring-ring/40",
              )}
            >
              <span className="font-medium">{slot.dayLabel}</span>
              <span className="capitalize">{slot.type} due</span>
            </button>
          ),
        )}
      </div>
    </section>
  );
}
