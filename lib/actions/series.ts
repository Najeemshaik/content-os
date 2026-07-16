"use server";

import { revalidatePath } from "next/cache";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { series, videos } from "@/lib/db/schema";
import {
  SERIES_STATUSES,
  SERIES_TYPES,
  type ActionResult,
} from "@/lib/types";

function fail(error: unknown, fallback: string): { ok: false; error: string } {
  return {
    ok: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

const seriesFields = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().nullable().optional(),
  type: z.enum(SERIES_TYPES),
  targetEpisodes: z.number().int().min(1).nullable().optional(),
  status: z.enum(SERIES_STATUSES).optional(),
});

export async function createSeries(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const data = seriesFields.parse(input);
    const id = crypto.randomUUID();
    db.insert(series).values({ id, ...data }).run();
    revalidatePath("/", "layout");
    return { ok: true, data: { id } };
  } catch (error) {
    return fail(error, "Could not create series");
  }
}

export async function updateSeries(input: unknown): Promise<ActionResult> {
  try {
    const { id, ...fields } = seriesFields
      .partial()
      .extend({ id: z.uuid() })
      .parse(input);
    const clean = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined),
    );
    if (Object.keys(clean).length === 0) return { ok: true };
    const result = db
      .update(series)
      .set(clean)
      .where(eq(series.id, id))
      .run();
    if (result.changes === 0) return { ok: false, error: "Series not found" };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not update series");
  }
}

export async function deleteSeries(input: unknown): Promise<ActionResult> {
  try {
    const { id } = z.object({ id: z.uuid() }).parse(input);
    db.transaction((tx) => {
      tx.update(videos)
        .set({ seriesId: null, episodeNumber: null })
        .where(eq(videos.seriesId, id))
        .run();
      tx.delete(series).where(eq(series.id, id)).run();
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not delete series");
  }
}

/** Inline "add episode N+1" (PRD §4.5): pre-linked idea card, next number,
 * typed like the latest episode (falls back to story). */
export async function addNextEpisode(
  input: unknown,
): Promise<ActionResult<{ id: string; episodeNumber: number }>> {
  try {
    const { seriesId } = z.object({ seriesId: z.uuid() }).parse(input);
    const parent = db
      .select()
      .from(series)
      .where(eq(series.id, seriesId))
      .get();
    if (!parent) return { ok: false, error: "Series not found" };
    const latest = db
      .select({
        episodeNumber: videos.episodeNumber,
        type: videos.type,
      })
      .from(videos)
      .where(eq(videos.seriesId, seriesId))
      .orderBy(desc(videos.episodeNumber))
      .get();
    const episodeNumber = (latest?.episodeNumber ?? 0) + 1;
    const id = crypto.randomUUID();
    const row = db
      .select({ min: sql<number | null>`min(${videos.sortOrder})` })
      .from(videos)
      .where(eq(videos.status, "idea"))
      .get();
    db.insert(videos)
      .values({
        id,
        title: `${parent.name} — episode ${episodeNumber}`,
        type: latest?.type ?? "story",
        status: "idea",
        seriesId,
        episodeNumber,
        sortOrder: (row?.min ?? 2000) - 1000,
      })
      .run();
    revalidatePath("/", "layout");
    return { ok: true, data: { id, episodeNumber } };
  } catch (error) {
    return fail(error, "Could not add episode");
  }
}
