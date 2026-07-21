"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { videoSeries } from "@/lib/db/schema";
import type { ActionResult } from "@/lib/types";

function fail(error: unknown, fallback: string): { ok: false; error: string } {
  return {
    ok: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

const membershipSchema = z.object({
  videoId: z.uuid(),
  seriesId: z.uuid(),
});

/** Add a video to a series, auto-numbering it as the next episode. Returns
 *  the assigned episode number so the client can show it optimistically. */
export async function addToSeries(
  input: unknown,
): Promise<ActionResult<{ episodeNumber: number }>> {
  try {
    const { videoId, seriesId } = membershipSchema.parse(input);
    const db = await getDb();
    const latest = await db
      .select({ episodeNumber: videoSeries.episodeNumber })
      .from(videoSeries)
      .where(eq(videoSeries.seriesId, seriesId))
      .orderBy(desc(videoSeries.episodeNumber))
      .get();
    const episodeNumber = (latest?.episodeNumber ?? 0) + 1;
    await db
      .insert(videoSeries)
      .values({ videoId, seriesId, episodeNumber })
      .onConflictDoNothing()
      .run();
    revalidatePath("/", "layout");
    return { ok: true, data: { episodeNumber } };
  } catch (error) {
    return fail(error, "Could not add to series");
  }
}

export async function removeFromSeries(input: unknown): Promise<ActionResult> {
  try {
    const { videoId, seriesId } = membershipSchema.parse(input);
    const db = await getDb();
    await db
      .delete(videoSeries)
      .where(
        and(
          eq(videoSeries.videoId, videoId),
          eq(videoSeries.seriesId, seriesId),
        ),
      )
      .run();
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not remove from series");
  }
}

const episodeSchema = membershipSchema.extend({
  episodeNumber: z.number().int().min(1).nullable(),
});

export async function setEpisodeNumber(input: unknown): Promise<ActionResult> {
  try {
    const { videoId, seriesId, episodeNumber } = episodeSchema.parse(input);
    const db = await getDb();
    const result = await db
      .update(videoSeries)
      .set({ episodeNumber })
      .where(
        and(
          eq(videoSeries.videoId, videoId),
          eq(videoSeries.seriesId, seriesId),
        ),
      )
      .run();
    if (result.rowsAffected === 0)
      return { ok: false, error: "Not in that series" };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not set episode number");
  }
}
