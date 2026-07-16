"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { scriptRevisions, videos } from "@/lib/db/schema";
import { snapshotVideo } from "@/lib/db/revisions";
import type { ActionResult } from "@/lib/types";

function fail(error: unknown, fallback: string): { ok: false; error: string } {
  return {
    ok: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

/** Idle-snapshot trigger (PRD §6a: editor idle 60s after changes). */
export async function createSnapshot(input: unknown): Promise<ActionResult> {
  try {
    const { videoId } = z.object({ videoId: z.uuid() }).parse(input);
    snapshotVideo(videoId);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not snapshot revision");
  }
}

export type RestoredFields = {
  scriptBody: string | null;
  hookVerbal: string | null;
  hookWritten: string | null;
  hookVisual: string | null;
};

export async function restoreRevision(
  input: unknown,
): Promise<ActionResult<RestoredFields>> {
  try {
    const { revisionId } = z.object({ revisionId: z.uuid() }).parse(input);
    const revision = db
      .select()
      .from(scriptRevisions)
      .where(eq(scriptRevisions.id, revisionId))
      .get();
    if (!revision) return { ok: false, error: "Revision not found" };
    // PRD §4.2: restore itself creates a snapshot first.
    snapshotVideo(revision.videoId);
    db.update(videos)
      .set({
        scriptBody: revision.scriptBody,
        hookVerbal: revision.hookVerbal,
        hookWritten: revision.hookWritten,
        hookVisual: revision.hookVisual,
      })
      .where(eq(videos.id, revision.videoId))
      .run();
    revalidatePath("/", "layout");
    return {
      ok: true,
      data: {
        scriptBody: revision.scriptBody,
        hookVerbal: revision.hookVerbal,
        hookWritten: revision.hookWritten,
        hookVisual: revision.hookVisual,
      },
    };
  } catch (error) {
    return fail(error, "Could not restore revision");
  }
}
