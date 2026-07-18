"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { scriptDrafts, videos } from "@/lib/db/schema";
import type { ActionResult } from "@/lib/types";

function fail(error: unknown, fallback: string): { ok: false; error: string } {
  return {
    ok: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

const shelfSchema = z.object({
  videoId: z.uuid(),
  // Client-generated so the optimistic tab and the row share identity.
  shelfId: z.uuid(),
  nextName: z.string().trim().min(1).max(40),
});

/** Shelve the current script as a draft and start a fresh, empty one. */
export async function newDraft(input: unknown): Promise<ActionResult> {
  try {
    const { videoId, shelfId, nextName } = shelfSchema.parse(input);
    const db = await getDb();
    await db.transaction(async (tx) => {
      const video = await tx
        .select({
          scriptBody: videos.scriptBody,
          scriptDraftName: videos.scriptDraftName,
        })
        .from(videos)
        .where(eq(videos.id, videoId))
        .get();
      if (!video) throw new Error("Video not found");
      await tx
        .insert(scriptDrafts)
        .values({
          id: shelfId,
          videoId,
          name: video.scriptDraftName,
          body: video.scriptBody,
        })
        .run();
      await tx
        .update(videos)
        .set({ scriptBody: null, scriptDraftName: nextName })
        .where(eq(videos.id, videoId))
        .run();
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not create a new draft");
  }
}

const switchSchema = shelfSchema.extend({ draftId: z.uuid() }).omit({
  nextName: true,
});

/** Swap a shelved draft in: current script shelves out, the draft becomes
 *  the active script, its row is removed. */
export async function switchDraft(input: unknown): Promise<ActionResult> {
  try {
    const { videoId, draftId, shelfId } = switchSchema.parse(input);
    const db = await getDb();
    await db.transaction(async (tx) => {
      const video = await tx
        .select({
          scriptBody: videos.scriptBody,
          scriptDraftName: videos.scriptDraftName,
        })
        .from(videos)
        .where(eq(videos.id, videoId))
        .get();
      if (!video) throw new Error("Video not found");
      const draft = await tx
        .select()
        .from(scriptDrafts)
        .where(eq(scriptDrafts.id, draftId))
        .get();
      if (!draft || draft.videoId !== videoId)
        throw new Error("Draft not found");
      await tx
        .insert(scriptDrafts)
        .values({
          id: shelfId,
          videoId,
          name: video.scriptDraftName,
          body: video.scriptBody,
        })
        .run();
      await tx
        .update(videos)
        .set({ scriptBody: draft.body, scriptDraftName: draft.name })
        .where(eq(videos.id, videoId))
        .run();
      await tx.delete(scriptDrafts).where(eq(scriptDrafts.id, draftId)).run();
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not switch drafts");
  }
}

export async function deleteDraft(input: unknown): Promise<ActionResult> {
  try {
    const { id } = z.object({ id: z.uuid() }).parse(input);
    const db = await getDb();
    const result = await db
      .delete(scriptDrafts)
      .where(eq(scriptDrafts.id, id))
      .run();
    if (result.rowsAffected === 0)
      return { ok: false, error: "Draft not found" };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not delete draft");
  }
}

const restoreSchema = z.object({
  id: z.uuid(),
  videoId: z.uuid(),
  name: z.string().trim().min(1).max(40),
  body: z.string().nullable(),
});

/** Undo for deleteDraft — re-creates the shelved row. */
export async function restoreDraft(input: unknown): Promise<ActionResult> {
  try {
    const data = restoreSchema.parse(input);
    const db = await getDb();
    await db.insert(scriptDrafts).values(data).run();
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not restore draft");
  }
}
