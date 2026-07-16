import { asc, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { rhythmSlots, videos } from "@/lib/db/schema";
import {
  CalendarView,
  type CalendarVideo,
} from "@/components/calendar/calendar-view";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const db = await getDb();
  const rows: CalendarVideo[] = await db
    .select({
      id: videos.id,
      title: videos.title,
      type: videos.type,
      format: videos.format,
      status: videos.status,
      scheduledDate: videos.scheduledDate,
    })
    .from(videos)
    .where(isNull(videos.archivedAt))
    .orderBy(asc(videos.sortOrder))
    .all();

  const slots = await db
    .select({
      id: rhythmSlots.id,
      weekday: rhythmSlots.weekday,
      type: rhythmSlots.type,
    })
    .from(rhythmSlots)
    .all();

  return <CalendarView initialVideos={rows} rhythmSlots={slots} />;
}
