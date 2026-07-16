import { addDays, format, startOfWeek } from "date-fns";
import type { VideoType } from "@/lib/types";

export type WeekRhythmSlot = { id: string; weekday: number; type: VideoType };

export type WeekSlotVideo = { id: string; title: string; type: VideoType };

export type WeekSlot = {
  slotId: string;
  date: string; // yyyy-MM-dd
  dayLabel: string; // Mon, Tue, …
  isToday: boolean;
  type: VideoType;
  video: WeekSlotVideo | null;
};

type SchedulableVideo = WeekSlotVideo & { scheduledDate: string | null };

/** The current week's dates (Mon–Sun) as yyyy-MM-dd. */
export function thisWeekDates(now: Date = new Date()): string[] {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) =>
    format(addDays(weekStart, i), "yyyy-MM-dd"),
  );
}

/**
 * Resolve the current week's rhythm slots (Mon–Sun) against scheduled videos.
 * A slot is filled by a video scheduled on its date — preferring one whose
 * type matches the slot, falling back to any video scheduled that day.
 */
export function computeThisWeek(
  slots: WeekRhythmSlot[],
  videos: SchedulableVideo[],
  now: Date = new Date(),
): WeekSlot[] {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const today = format(now, "yyyy-MM-dd");
  const result: WeekSlot[] = [];

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const date = format(day, "yyyy-MM-dd");
    for (const slot of slots.filter((s) => s.weekday === day.getDay())) {
      const scheduled = videos.filter((v) => v.scheduledDate === date);
      const match =
        scheduled.find((v) => v.type === slot.type) ?? scheduled[0] ?? null;
      result.push({
        slotId: slot.id,
        date,
        dayLabel: format(day, "EEE"),
        isToday: date === today,
        type: slot.type,
        video: match ? { id: match.id, title: match.title, type: match.type } : null,
      });
    }
  }
  return result;
}
