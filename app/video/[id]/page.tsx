import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { getFlagContext } from "@/lib/db/flags";
import {
  outliers,
  scriptRevisions,
  series,
  structures,
  videos,
} from "@/lib/db/schema";
import { VideoWorkspace } from "@/components/workspace/video-workspace";

export const dynamic = "force-dynamic";

export default async function VideoPage(props: PageProps<"/video/[id]">) {
  const { id } = await props.params;
  const video = db.select().from(videos).where(eq(videos.id, id)).get();
  if (!video) notFound();

  const seriesOptions = db
    .select({ id: series.id, name: series.name })
    .from(series)
    .orderBy(asc(series.name))
    .all();

  const allStructures = db
    .select()
    .from(structures)
    .orderBy(asc(structures.name))
    .all();

  const outlierHooks = db
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

  const revisions = db
    .select()
    .from(scriptRevisions)
    .where(eq(scriptRevisions.videoId, id))
    .orderBy(desc(scriptRevisions.createdAt))
    .all();

  const parent = video.doubleDownOf
    ? (db
        .select({ id: videos.id, title: videos.title })
        .from(videos)
        .where(eq(videos.id, video.doubleDownOf))
        .get() ?? null)
    : null;
  const variants = db
    .select({ id: videos.id, title: videos.title })
    .from(videos)
    .where(eq(videos.doubleDownOf, id))
    .all();

  // Cross-format lineage: the video this one was clipped/expanded from, and
  // the videos derived from this one.
  const clipParent = video.clipOf
    ? (db
        .select({ id: videos.id, title: videos.title, format: videos.format })
        .from(videos)
        .where(eq(videos.id, video.clipOf))
        .get() ?? null)
    : null;
  const clips = db
    .select({ id: videos.id, title: videos.title, format: videos.format })
    .from(videos)
    .where(eq(videos.clipOf, id))
    .all();

  const { flaggedIds } = getFlagContext(video.format);

  return (
    <VideoWorkspace
      video={video}
      seriesOptions={seriesOptions}
      structures={allStructures}
      outliers={outlierHooks}
      revisions={revisions}
      flagged={flaggedIds.has(id)}
      lineage={{ parent, variants, clipParent, clips }}
    />
  );
}
