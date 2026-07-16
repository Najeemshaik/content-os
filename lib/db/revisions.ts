import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "./client";
import { scriptRevisions, videos } from "./schema";

const MAX_REVISIONS = 50;

/** Snapshot a video's script + hook stack into revision history, pruning to
 * the newest 50 (PRD §6). No-ops when there is nothing to snapshot yet. */
export function snapshotVideo(videoId: string): void {
  const video = db.select().from(videos).where(eq(videos.id, videoId)).get();
  if (!video) return;
  if (
    !video.scriptBody &&
    !video.hookVerbal &&
    !video.hookWritten &&
    !video.hookVisual
  ) {
    return;
  }

  db.insert(scriptRevisions)
    .values({
      videoId,
      scriptBody: video.scriptBody,
      hookVerbal: video.hookVerbal,
      hookWritten: video.hookWritten,
      hookVisual: video.hookVisual,
    })
    .run();

  const all = db
    .select({ id: scriptRevisions.id })
    .from(scriptRevisions)
    .where(eq(scriptRevisions.videoId, videoId))
    .orderBy(asc(scriptRevisions.createdAt))
    .all();
  for (const row of all.slice(0, Math.max(0, all.length - MAX_REVISIONS))) {
    db.delete(scriptRevisions).where(eq(scriptRevisions.id, row.id)).run();
  }
}
