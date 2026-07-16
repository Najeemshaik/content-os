import "server-only";
import { and, desc, eq, isNull, isNotNull } from "drizzle-orm";
import { getDb } from "./client";
import { settings, videos } from "./schema";
import type { VideoFormat } from "@/lib/types";

export type FlagContext = {
  /** Rolling average of views over the last N published videos, or null when
   * fewer than 3 videos are published (flagging inactive per PRD §4.6). */
  average: number | null;
  windowSize: number;
  flaggedIds: Set<string>;
};

export async function getRollingWindow(): Promise<number> {
  const db = await getDb();
  const row = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "rolling_average_window"))
    .get();
  const parsed = Number(row?.value);
  return Number.isFinite(parsed) && parsed >= 3 ? Math.floor(parsed) : 10;
}

// Baselines are format-scoped: a short is only ever compared against other
// shorts, a long against other longs.
export async function getFlagContext(
  format: VideoFormat,
): Promise<FlagContext> {
  const db = await getDb();
  const windowSize = await getRollingWindow();
  const published = await db
    .select({ id: videos.id, views: videos.views })
    .from(videos)
    .where(
      and(
        eq(videos.status, "published"),
        eq(videos.format, format),
        isNull(videos.archivedAt),
        isNotNull(videos.publishedAt),
      ),
    )
    .orderBy(desc(videos.publishedAt))
    .all();

  const window = published.slice(0, windowSize);
  if (window.length < 3) {
    return { average: null, windowSize, flaggedIds: new Set() };
  }
  const total = window.reduce((sum, v) => sum + v.views, 0);
  const average = total / window.length;

  // Flag against the average of the OTHER videos in the window (leave-one-out)
  // — otherwise a breakout video inflates its own baseline and, with a small
  // window, could mathematically never reach 5×.
  const flaggedIds = new Set<string>();
  for (const video of published) {
    const inWindow = window.some((w) => w.id === video.id);
    const otherCount = inWindow ? window.length - 1 : window.length;
    if (otherCount < 2) continue;
    const otherAverage =
      (inWindow ? total - video.views : total) / otherCount;
    if (otherAverage > 0 && video.views >= 5 * otherAverage) {
      flaggedIds.add(video.id);
    }
  }
  return { average, windowSize, flaggedIds };
}
