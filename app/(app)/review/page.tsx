import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { getFlagContext } from "@/lib/db/flags";
import { videos } from "@/lib/db/schema";
import {
  ReviewView,
  type FormatStats,
  type ReviewVideo,
  type TypeHealth,
} from "@/components/review/review-view";
import { VIDEO_FORMATS, type VideoFormat, type VideoType } from "@/lib/types";

export const dynamic = "force-dynamic";

// PRD §4.6 — the health metric per type.
const HEALTH_METRIC: Record<VideoType, "saves" | "shares" | "comments"> = {
  teach: "saves",
  take: "shares",
  story: "comments",
};

export default async function ReviewPage() {
  const db = await getDb();
  const published = await db
    .select()
    .from(videos)
    .where(and(eq(videos.status, "published"), isNull(videos.archivedAt)))
    .orderBy(desc(videos.publishedAt))
    .all();

  // Baselines, flags, and health are all computed within a format — a
  // long-form view count never touches the shorts average.
  const stats = {} as Record<VideoFormat, FormatStats>;
  const flaggedIds = new Set<string>();
  for (const format of VIDEO_FORMATS) {
    const context = await getFlagContext(format);
    const ofFormat = published.filter((v) => v.format === format);
    stats[format] = {
      average: context.average,
      windowSize: context.windowSize,
      health: (["teach", "take", "story"] as VideoType[]).map((type) => {
        const ofType = ofFormat.filter((v) => v.type === type);
        const metric = HEALTH_METRIC[type];
        return {
          type,
          metric,
          average:
            ofType.length > 0
              ? ofType.reduce((sum, v) => sum + v[metric], 0) / ofType.length
              : null,
        } satisfies TypeHealth;
      }),
    };
    for (const id of context.flaggedIds) flaggedIds.add(id);
  }

  const rows: ReviewVideo[] = published.map((v) => ({
    id: v.id,
    title: v.title,
    type: v.type,
    format: v.format,
    publishedAt: v.publishedAt,
    views: v.views,
    likes: v.likes,
    comments: v.comments,
    saves: v.saves,
    shares: v.shares,
    flagged: flaggedIds.has(v.id),
  }));

  return <ReviewView videos={rows} stats={stats} />;
}
