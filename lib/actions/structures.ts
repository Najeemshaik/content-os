"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { outliers, structures, videos } from "@/lib/db/schema";
import { STRUCTURE_CATEGORIES, type ActionResult } from "@/lib/types";

function fail(error: unknown, fallback: string): { ok: false; error: string } {
  return {
    ok: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

const structureFields = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.enum(STRUCTURE_CATEGORIES),
  template: z.string().trim().min(1),
  sourceUrl: z.string().nullable().optional(),
  sourceCreator: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function createStructure(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const data = structureFields
      .extend({ outlierId: z.uuid().optional() })
      .parse(input);
    const { outlierId, ...fields } = data;
    const id = crypto.randomUUID();
    db.transaction((tx) => {
      tx.insert(structures).values({ id, ...fields }).run();
      if (outlierId) {
        // Templatize flow: link the outlier and flip its status.
        tx.update(outliers)
          .set({ status: "templatized", structureId: id })
          .where(eq(outliers.id, outlierId))
          .run();
      }
    });
    revalidatePath("/", "layout");
    return { ok: true, data: { id } };
  } catch (error) {
    return fail(error, "Could not create structure");
  }
}

export async function updateStructure(input: unknown): Promise<ActionResult> {
  try {
    const { id, ...fields } = structureFields
      .partial()
      .extend({ id: z.uuid() })
      .parse(input);
    const clean = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined),
    );
    if (Object.keys(clean).length === 0) return { ok: true };
    const result = db
      .update(structures)
      .set(clean)
      .where(eq(structures.id, id))
      .run();
    if (result.changes === 0)
      return { ok: false, error: "Structure not found" };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not update structure");
  }
}

export async function deleteStructure(input: unknown): Promise<ActionResult> {
  try {
    const { id } = z.object({ id: z.uuid() }).parse(input);
    db.transaction((tx) => {
      // Detach references (videos keep their scripts; outliers keep status).
      tx.update(videos)
        .set({ structureId: null })
        .where(eq(videos.structureId, id))
        .run();
      tx.update(outliers)
        .set({ structureId: null })
        .where(eq(outliers.structureId, id))
        .run();
      tx.delete(structures).where(eq(structures.id, id)).run();
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not delete structure");
  }
}

/** Template inserted into a script from the editor toolbar (PRD §4.2). */
export async function markStructureUsed(input: unknown): Promise<ActionResult> {
  try {
    const { id } = z.object({ id: z.uuid() }).parse(input);
    db.update(structures)
      .set({ timesUsed: sql`${structures.timesUsed} + 1` })
      .where(eq(structures.id, id))
      .run();
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not update usage count");
  }
}

/** "Use in new video" (PRD §4.4): idea card with the template pre-inserted. */
export async function createVideoFromStructure(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { id } = z.object({ id: z.uuid() }).parse(input);
    const structure = db
      .select()
      .from(structures)
      .where(eq(structures.id, id))
      .get();
    if (!structure) return { ok: false, error: "Structure not found" };
    const videoId = crypto.randomUUID();
    const type =
      structure.category === "educational"
        ? "teach"
        : structure.category === "storytelling"
          ? "story"
          : "take";
    db.transaction((tx) => {
      const row = tx
        .select({ min: sql<number | null>`min(${videos.sortOrder})` })
        .from(videos)
        .where(eq(videos.status, "idea"))
        .get();
      tx.insert(videos)
        .values({
          id: videoId,
          title: `${structure.name} — new video`,
          type,
          status: "idea",
          scriptBody: structure.template,
          structureId: structure.id,
          sortOrder: (row?.min ?? 2000) - 1000,
        })
        .run();
      tx.update(structures)
        .set({ timesUsed: sql`${structures.timesUsed} + 1` })
        .where(eq(structures.id, id))
        .run();
    });
    revalidatePath("/", "layout");
    return { ok: true, data: { id: videoId } };
  } catch (error) {
    return fail(error, "Could not create video from structure");
  }
}
