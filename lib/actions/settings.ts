"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import {
  outliers,
  rhythmSlots,
  scriptDrafts,
  scriptRevisions,
  series,
  settings,
  structures,
  videos,
} from "@/lib/db/schema";
import { VIDEO_TYPES, type ActionResult } from "@/lib/types";

function fail(error: unknown, fallback: string): { ok: false; error: string } {
  return {
    ok: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

export async function setRollingWindow(input: unknown): Promise<ActionResult> {
  try {
    const { value } = z
      .object({ value: z.number().int().min(3).max(100) })
      .parse(input);
    const db = await getDb();
    await db
      .insert(settings)
      .values({ key: "rolling_average_window", value: String(value) })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: String(value), updatedAt: Date.now() },
      })
      .run();
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not save setting");
  }
}

const rhythmSchema = z.object({
  slots: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        type: z.enum(VIDEO_TYPES),
      }),
    )
    .max(21),
});

export async function saveRhythm(input: unknown): Promise<ActionResult> {
  try {
    const { slots } = rhythmSchema.parse(input);
    const db = await getDb();
    await db.transaction(async (tx) => {
      await tx.delete(rhythmSlots).run();
      if (slots.length > 0) await tx.insert(rhythmSlots).values(slots).run();
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not save rhythm");
  }
}

export type ExportPayload = {
  app: "content-os";
  version: 1;
  exportedAt: number;
  tables: {
    videos: unknown[];
    scriptRevisions: unknown[];
    scriptDrafts?: unknown[];
    series: unknown[];
    structures: unknown[];
    outliers: unknown[];
    rhythmSlots: unknown[];
    settings: unknown[];
  };
};

export async function exportData(): Promise<ActionResult<ExportPayload>> {
  try {
    const db = await getDb();
    const payload: ExportPayload = {
      app: "content-os",
      version: 1,
      exportedAt: Date.now(),
      tables: {
        videos: await db.select().from(videos).all(),
        scriptRevisions: await db.select().from(scriptRevisions).all(),
        scriptDrafts: await db.select().from(scriptDrafts).all(),
        series: await db.select().from(series).all(),
        structures: await db.select().from(structures).all(),
        outliers: await db.select().from(outliers).all(),
        rhythmSlots: await db.select().from(rhythmSlots).all(),
        settings: await db.select().from(settings).all(),
      },
    };
    return { ok: true, data: payload };
  } catch (error) {
    return fail(error, "Could not export data");
  }
}

const importSchema = z.object({
  app: z.literal("content-os"),
  version: z.literal(1),
  tables: z.object({
    videos: z.array(z.record(z.string(), z.unknown())),
    scriptRevisions: z.array(z.record(z.string(), z.unknown())),
    // Absent in exports made before script drafts existed.
    scriptDrafts: z.array(z.record(z.string(), z.unknown())).default([]),
    series: z.array(z.record(z.string(), z.unknown())),
    structures: z.array(z.record(z.string(), z.unknown())),
    outliers: z.array(z.record(z.string(), z.unknown())),
    rhythmSlots: z.array(z.record(z.string(), z.unknown())),
    settings: z.array(z.record(z.string(), z.unknown())),
  }),
});

/** Replaces ALL current data (confirmed client-side). Row shapes are enforced
 * by the database schema inside one transaction — bad files roll back whole. */
export async function importData(input: unknown): Promise<ActionResult> {
  try {
    const data = importSchema.parse(input);
    const t = data.tables;
    const db = await getDb();
    await db.transaction(async (tx) => {
      await tx.delete(scriptRevisions).run();
      await tx.delete(scriptDrafts).run();
      await tx.delete(videos).run();
      await tx.delete(outliers).run();
      await tx.delete(structures).run();
      await tx.delete(series).run();
      await tx.delete(rhythmSlots).run();
      await tx.delete(settings).run();
      type Rows = Record<string, unknown>[];
      if (t.series.length)
        await tx.insert(series).values(t.series as Rows as never).run();
      if (t.structures.length)
        await tx.insert(structures).values(t.structures as Rows as never).run();
      if (t.videos.length)
        await tx.insert(videos).values(t.videos as Rows as never).run();
      if (t.scriptRevisions.length)
        await tx
          .insert(scriptRevisions)
          .values(t.scriptRevisions as Rows as never)
          .run();
      if (t.scriptDrafts.length)
        await tx
          .insert(scriptDrafts)
          .values(t.scriptDrafts as Rows as never)
          .run();
      if (t.outliers.length)
        await tx.insert(outliers).values(t.outliers as Rows as never).run();
      if (t.rhythmSlots.length)
        await tx.insert(rhythmSlots).values(t.rhythmSlots as Rows as never).run();
      if (t.settings.length)
        await tx.insert(settings).values(t.settings as Rows as never).run();
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error, "Import failed — data unchanged");
  }
}
