import { asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rhythmSlots, series, videos } from "@/lib/db/schema";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import type { BoardVideo } from "@/components/pipeline/video-card";

export const dynamic = "force-dynamic";

export default function PipelinePage() {
  const rows = db
    .select({
      id: videos.id,
      title: videos.title,
      type: videos.type,
      status: videos.status,
      scheduledDate: videos.scheduledDate,
      sortOrder: videos.sortOrder,
      episodeNumber: videos.episodeNumber,
      seriesName: series.name,
    })
    .from(videos)
    .leftJoin(series, eq(videos.seriesId, series.id))
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

  // 5×-flame flagging arrives with the Review module (Phase 6).
  const boardVideos: BoardVideo[] = rows.map((row) => ({
    ...row,
    flagged: false,
  }));

  return <PipelineBoard initialVideos={boardVideos} rhythmSlots={slots} />;
}
