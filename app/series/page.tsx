import { asc, eq, isNull, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { series, videos } from "@/lib/db/schema";
import {
  SeriesList,
  type SeriesWithProgress,
} from "@/components/series/series-list";

export const dynamic = "force-dynamic";

export default function SeriesPage() {
  const seriesRows = db.select().from(series).orderBy(asc(series.name)).all();
  const withProgress: SeriesWithProgress[] = seriesRows.map((s) => {
    const episodes = db
      .select({ status: videos.status })
      .from(videos)
      .where(and(eq(videos.seriesId, s.id), isNull(videos.archivedAt)))
      .all();
    return {
      ...s,
      episodeCount: episodes.length,
      publishedCount: episodes.filter((e) => e.status === "published").length,
    };
  });

  return <SeriesList series={withProgress} />;
}
