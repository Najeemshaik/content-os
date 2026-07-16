"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoType } from "@/lib/types";
import type { WeekSlot } from "@/lib/week";
import { TypeDot } from "./type-badge";

export type WeekLong = {
  id: string;
  title: string;
  type: VideoType;
  scheduledDate: string | null;
};

function DayBlock({ slot }: { slot: WeekSlot }) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-lg text-2xs leading-none font-semibold",
        slot.isToday
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground",
      )}
      title={slot.isToday ? "Today" : undefined}
    >
      {slot.dayLabel.slice(0, 2)}
    </span>
  );
}

export function ThisWeekRail({
  slots,
  longs = [],
  onGhostClick,
}: {
  slots: WeekSlot[];
  longs?: WeekLong[];
  onGhostClick: (slot: WeekSlot) => void;
}) {
  if (slots.length === 0 && longs.length === 0) return null;
  return (
    <section aria-label="This week" className="flex items-center gap-3">
      <h2 className="shrink-0 text-2xs font-semibold tracking-widest text-muted-foreground/70 uppercase">
        This
        <br />
        week
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {slots.map((slot) =>
          slot.video ? (
            <Link
              key={slot.slotId}
              href={`/video/${slot.video.id}`}
              className="flex max-w-60 shrink-0 items-center gap-2.5 rounded-xl bg-card py-1.5 pr-3.5 pl-1.5 text-xs shadow-card transition-shadow hover:shadow-card-hover"
            >
              <DayBlock slot={slot} />
              <TypeDot type={slot.video.type} />
              <span className="truncate font-medium">{slot.video.title}</span>
            </Link>
          ) : (
            <button
              key={slot.slotId}
              type="button"
              onClick={() => onGhostClick(slot)}
              className="group flex shrink-0 items-center gap-2.5 rounded-xl border border-dashed border-border py-1.5 pr-3.5 pl-1.5 text-xs text-muted-foreground transition-all hover:border-solid hover:border-transparent hover:bg-card hover:text-foreground hover:shadow-card"
            >
              <DayBlock slot={slot} />
              <TypeDot type={slot.type} className="opacity-50" />
              <span className="capitalize">{slot.type} due</span>
              <Plus
                className="size-3 opacity-0 transition-opacity group-hover:opacity-60"
                aria-hidden
              />
            </button>
          ),
        )}
        {longs.map((video) => (
          <Link
            key={video.id}
            href={`/video/${video.id}`}
            className="flex max-w-60 shrink-0 items-center gap-2.5 rounded-xl border border-border bg-transparent py-1.5 pr-3.5 pl-2.5 text-xs transition-all hover:bg-card hover:shadow-card"
          >
            <span className="shrink-0 text-2xs leading-none font-semibold tracking-widest text-muted-foreground uppercase">
              Long
              {video.scheduledDate &&
                ` · ${format(parseISO(video.scheduledDate), "EEE")}`}
            </span>
            <TypeDot type={video.type} />
            <span className="truncate font-medium">{video.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
