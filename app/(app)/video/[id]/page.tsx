import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { getFlagContext } from "@/lib/db/flags";
import {
  outliers,
  scriptDrafts,
  scriptRevisions,
  series,
  structures,
  videos,
  videoSeries,
} from "@/lib/db/schema";
import { VideoWorkspace } from "@/components/workspace/video-workspace";

export const dynamic = "force-dynamic";

export default async function VideoPage(props: PageProps<"/video/[id]">) {
  const { id } = await props.params;
  const { series: fromSeriesId } = await props.searchParams;
  const db = await getDb();
  const video = await db.select().from(videos).where(eq(videos.id, id)).get();
  if (!video) notFound();

  const seriesOptions = await db
    .select({ id: series.id, name: series.name })
    .from(series)
    .orderBy(asc(series.name))
    .all();

  const allStructures = await db
    .select()
    .from(structures)
    .orderBy(asc(structures.name))
    .all();

  const outlierHooks = await db
    .select({
      id: outliers.id,
      creator: outliers.creator,
      niche: outliers.niche,
      hookVerbal: outliers.hookVerbal,
      hookWritten: outliers.hookWritten,
      hookVisual: outliers.hookVisual,
    })
    .from(outliers)
    .all();

  const revisions = await db
    .select()
    .from(scriptRevisions)
    .where(eq(scriptRevisions.videoId, id))
    .orderBy(desc(scriptRevisions.createdAt))
    .all();

  const drafts = await db
    .select()
    .from(scriptDrafts)
    .where(eq(scriptDrafts.videoId, id))
    .orderBy(asc(scriptDrafts.createdAt))
    .all();

  const videoSeriesRows = await db
    .select({
      seriesId: videoSeries.seriesId,
      name: series.name,
      episodeNumber: videoSeries.episodeNumber,
    })
    .from(videoSeries)
    .innerJoin(series, eq(videoSeries.seriesId, series.id))
    .where(eq(videoSeries.videoId, id))
    .orderBy(asc(series.name))
    .all();

  const parent = video.doubleDownOf
    ? ((await db
        .select({ id: videos.id, title: videos.title })
        .from(videos)
        .where(eq(videos.id, video.doubleDownOf))
        .get()) ?? null)
    : null;
  const variants = await db
    .select({ id: videos.id, title: videos.title })
    .from(videos)
    .where(eq(videos.doubleDownOf, id))
    .all();

  // Cross-format lineage: the video this one was clipped/expanded from, and
  // the videos derived from this one.
  const clipParent = video.clipOf
    ? ((await db
        .select({ id: videos.id, title: videos.title, format: videos.format })
        .from(videos)
        .where(eq(videos.id, video.clipOf))
        .get()) ?? null)
    : null;
  const clips = await db
    .select({ id: videos.id, title: videos.title, format: videos.format })
    .from(videos)
    .where(eq(videos.clipOf, id))
    .all();

  const { flaggedIds } = await getFlagContext(video.format);

  // Arrived from a series page (?series=id) — point the back link there,
  // but only if the video really belongs to that series.
  const fromSeries =
    typeof fromSeriesId === "string"
      ? (videoSeriesRows.find((m) => m.seriesId === fromSeriesId) ?? null)
      : null;

  return (
    <VideoWorkspace
      backLink={
        fromSeries
          ? { href: `/series/${fromSeries.seriesId}`, label: fromSeries.name }
          : { href: "/", label: "Pipeline" }
      }
      video={video}
      seriesOptions={seriesOptions}
      structures={allStructures}
      outliers={outlierHooks}
      revisions={revisions}
      drafts={drafts}
      seriesMemberships={videoSeriesRows}
      flagged={flaggedIds.has(id)}
      lineage={{ parent, variants, clipParent, clips }}
    />
  );
}
