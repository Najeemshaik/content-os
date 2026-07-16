import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { series, videos } from "@/lib/db/schema";
import { SeriesDetail } from "@/components/series/series-detail";

export const dynamic = "force-dynamic";

export default async function SeriesDetailPage(
  props: PageProps<"/series/[id]">,
) {
  const { id } = await props.params;
  const row = db.select().from(series).where(eq(series.id, id)).get();
  if (!row) notFound();

  const episodes = db
    .select({
      id: videos.id,
      title: videos.title,
      type: videos.type,
      status: videos.status,
      episodeNumber: videos.episodeNumber,
    })
    .from(videos)
    .where(and(eq(videos.seriesId, id), isNull(videos.archivedAt)))
    .orderBy(asc(videos.episodeNumber), asc(videos.createdAt))
    .all();

  return <SeriesDetail series={row} episodes={episodes} />;
}
