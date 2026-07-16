import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { getFlagContext } from "@/lib/db/flags";
import { videos } from "@/lib/db/schema";
import {
  ReviewView,
  type ReviewVideo,
  type TypeHealth,
} from "@/components/review/review-view";
import type { VideoType } from "@/lib/types";

export const dynamic = "force-dynamic";

// PRD §4.6 — the health metric per type.
const HEALTH_METRIC: Record<VideoType, "saves" | "shares" | "comments"> = {
  teach: "saves",
  take: "shares",
  story: "comments",
};

export default function ReviewPage() {
  const published = db
    .select()
    .from(videos)
    .where(and(eq(videos.status, "published"), isNull(videos.archivedAt)))
    .orderBy(desc(videos.publishedAt))
    .all();

  const { average, windowSize, flaggedIds } = getFlagContext();

  const rows: ReviewVideo[] = published.map((v) => ({
    id: v.id,
    title: v.title,
    type: v.type,
    publishedAt: v.publishedAt,
    views: v.views,
    likes: v.likes,
    comments: v.comments,
    saves: v.saves,
    shares: v.shares,
    flagged: flaggedIds.has(v.id),
  }));

  const health: TypeHealth[] = (
    ["teach", "take", "story"] as VideoType[]
  ).map((type) => {
    const ofType = published.filter((v) => v.type === type);
    const metric = HEALTH_METRIC[type];
    return {
      type,
      metric,
      average:
        ofType.length > 0
          ? ofType.reduce((sum, v) => sum + v[metric], 0) / ofType.length
          : null,
    };
  });

  return (
    <ReviewView
      videos={rows}
      average={average}
      windowSize={windowSize}
      health={health}
    />
  );
}
