"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { outliers } from "@/lib/db/schema";
import { OUTLIER_STATUSES, type ActionResult } from "@/lib/types";

function fail(error: unknown, fallback: string): { ok: false; error: string } {
  return {
    ok: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

const outlierFields = z.object({
  url: z.string().trim().min(1),
  creator: z.string().nullable().optional(),
  creatorFollowers: z.number().int().min(0).nullable().optional(),
  views: z.number().int().min(0).nullable().optional(),
  niche: z.string().nullable().optional(),
  hookVerbal: z.string().nullable().optional(),
  hookWritten: z.string().nullable().optional(),
  hookVisual: z.string().nullable().optional(),
  transcript: z.string().nullable().optional(),
  whyItWorked: z.string().nullable().optional(),
  status: z.enum(OUTLIER_STATUSES).optional(),
});

function multiplierOf(views?: number | null, followers?: number | null) {
  if (!views || !followers || followers <= 0) return null;
  return views / followers;
}

export async function createOutlier(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const data = outlierFields.parse(input);
    const id = crypto.randomUUID();
    db.insert(outliers)
      .values({
        id,
        ...data,
        multiplier: multiplierOf(data.views, data.creatorFollowers),
      })
      .run();
    revalidatePath("/", "layout");
    return { ok: true, data: { id } };
  } catch (error) {
    return fail(error, "Could not save outlier");
  }
}

export async function updateOutlier(input: unknown): Promise<ActionResult> {
  try {
    const { id, ...fields } = outlierFields
      .partial()
      .extend({ id: z.uuid() })
      .parse(input);
    const clean = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined),
    );
    if (Object.keys(clean).length === 0) return { ok: true };
    const existing = db
      .select()
      .from(outliers)
      .where(eq(outliers.id, id))
      .get();
    if (!existing) return { ok: false, error: "Outlier not found" };
    const views = (clean.views as number | null | undefined) ?? existing.views;
    const followers =
      (clean.creatorFollowers as number | null | undefined) ??
      existing.creatorFollowers;
    db.update(outliers)
      .set({ ...clean, multiplier: multiplierOf(views, followers) })
      .where(eq(outliers.id, id))
      .run();
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not update outlier");
  }
}

export async function deleteOutlier(input: unknown): Promise<ActionResult> {
  try {
    const { id } = z.object({ id: z.uuid() }).parse(input);
    db.delete(outliers).where(eq(outliers.id, id)).run();
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not delete outlier");
  }
}
