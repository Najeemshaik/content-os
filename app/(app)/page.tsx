import { asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { getFlagContext } from "@/lib/db/flags";
import { parseScenes } from "@/lib/scenes";
import { rhythmSlots, series, videos } from "@/lib/db/schema";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import type { BoardVideo } from "@/components/pipeline/video-card";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const db = await getDb();
  const rows = await db
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
      scriptBody: videos.scriptBody,
    })
    .from(videos)
    .leftJoin(series, eq(videos.seriesId, series.id))
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

  // Flags are format-scoped; the board shows both formats' flames.
  const flaggedIds = new Set([
    ...(await getFlagContext("short")).flaggedIds,
    ...(await getFlagContext("long")).flaggedIds,
  ]);
  // Scene tallies are computed here so full scripts never ship to the board.
  const boardVideos: BoardVideo[] = rows.map(({ scriptBody, ...row }) => {
    const tagged = parseScenes(scriptBody ?? "").filter((s) => s.tag);
    return {
      ...row,
      sceneCount: tagged.length,
      shotTypeCount: new Set(tagged.map((s) => s.tag)).size,
      flagged: flaggedIds.has(row.id),
    };
  });

  return <PipelineBoard initialVideos={boardVideos} rhythmSlots={slots} />;
}
