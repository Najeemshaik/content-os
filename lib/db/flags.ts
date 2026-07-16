import "server-only";
import { and, desc, eq, isNull, isNotNull } from "drizzle-orm";
import { db } from "./client";
import { settings, videos } from "./schema";

export type FlagContext = {
  /** Rolling average of views over the last N published videos, or null when
   * fewer than 3 videos are published (flagging inactive per PRD §4.6). */
  average: number | null;
  windowSize: number;
  flaggedIds: Set<string>;
};

export function getRollingWindow(): number {
  const row = db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "rolling_average_window"))
    .get();
  const parsed = Number(row?.value);
  return Number.isFinite(parsed) && parsed >= 3 ? Math.floor(parsed) : 10;
}

export function getFlagContext(): FlagContext {
  const windowSize = getRollingWindow();
  const published = db
    .select({ id: videos.id, views: videos.views })
    .from(videos)
    .where(
      and(
        eq(videos.status, "published"),
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
