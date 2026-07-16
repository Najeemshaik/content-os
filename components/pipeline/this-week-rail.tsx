"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeekSlot } from "@/lib/week";
import { TypeDot } from "./type-badge";

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
      <h2 className="text-xs font-medium tracking-widest text-muted-foreground/80 uppercase">
        This week
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {slots.map((slot) =>
          slot.video ? (
            <Link
              key={slot.slotId}
              href={`/video/${slot.video.id}`}
              className={cn(
                "flex max-w-56 shrink-0 items-center gap-2.5 rounded-xl bg-card py-2 pr-3.5 pl-2.5 text-xs shadow-card transition-shadow hover:shadow-card-hover",
                slot.isToday && "ring-2 ring-ring/30",
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs leading-none font-semibold text-muted-foreground">
                {slot.dayLabel.slice(0, 2)}
              </span>
              <TypeDot type={slot.video.type} />
              <span className="truncate font-medium">{slot.video.title}</span>
            </Link>
          ) : (
            <button
              key={slot.slotId}
              type="button"
              onClick={() => onGhostClick(slot)}
              className={cn(
                "group flex shrink-0 items-center gap-2.5 rounded-xl border border-dashed border-border bg-transparent py-2 pr-3.5 pl-2.5 text-xs text-muted-foreground transition-colors hover:border-solid hover:bg-card hover:text-foreground hover:shadow-card",
                slot.isToday && "ring-2 ring-ring/30",
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-xs leading-none font-semibold">
                {slot.dayLabel.slice(0, 2)}
              </span>
              <TypeDot type={slot.type} className="opacity-50" />
              <span className="capitalize">{slot.type} due</span>
              <Plus
                className="size-3 opacity-0 transition-opacity group-hover:opacity-60"
                aria-hidden
              />
            </button>
          ),
        )}
      </div>
    </section>
  );
}
