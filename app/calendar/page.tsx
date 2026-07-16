import { asc, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rhythmSlots, videos } from "@/lib/db/schema";
import {
  CalendarView,
  type CalendarVideo,
} from "@/components/calendar/calendar-view";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  const rows: CalendarVideo[] = db
    .select({
      id: videos.id,
      title: videos.title,
      type: videos.type,
      status: videos.status,
      scheduledDate: videos.scheduledDate,
    })
    .from(videos)
    .where(isNull(videos.archivedAt))
    .orderBy(asc(videos.sortOrder))
    .all();

  const slots = db
    .select({
      id: rhythmSlots.id,
      weekday: rhythmSlots.weekday,
      type: rhythmSlots.type,
    })
    .from(rhythmSlots)
    .all();

  return <CalendarView initialVideos={rows} rhythmSlots={slots} />;
}
