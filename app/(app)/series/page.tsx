import { asc, eq, isNull, and } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { series, videos, videoSeries } from "@/lib/db/schema";
import {
  SeriesList,
  type SeriesWithProgress,
} from "@/components/series/series-list";

export const dynamic = "force-dynamic";

export default async function SeriesPage() {
  const db = await getDb();
  const seriesRows = await db
    .select()
    .from(series)
    .orderBy(asc(series.name))
    .all();
  const withProgress: SeriesWithProgress[] = await Promise.all(
    seriesRows.map(async (s) => {
      const episodes = await db
        .select({ status: videos.status })
        .from(videoSeries)
        .innerJoin(videos, eq(videoSeries.videoId, videos.id))
        .where(and(eq(videoSeries.seriesId, s.id), isNull(videos.archivedAt)))
        .all();
      return {
        ...s,
        episodeCount: episodes.length,
        publishedCount: episodes.filter((e) => e.status === "published").length,
      };
    }),
  );

  return <SeriesList series={withProgress} />;
}
