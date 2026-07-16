import { asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { getFlagContext } from "@/lib/db/flags";
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
      format: videos.format,
      status: videos.status,
      scheduledDate: videos.scheduledDate,
      sortOrder: videos.sortOrder,
      episodeNumber: videos.episodeNumber,
      doubleDownOf: videos.doubleDownOf,
      clipOf: videos.clipOf,
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

  // Flags are format-scoped; the board shows both formats' flames.
  const flaggedIds = new Set([
    ...getFlagContext("short").flaggedIds,
    ...getFlagContext("long").flaggedIds,
  ]);
  const boardVideos: BoardVideo[] = rows.map((row) => ({
    ...row,
    flagged: flaggedIds.has(row.id),
  }));

  return <PipelineBoard initialVideos={boardVideos} rhythmSlots={slots} />;
}
