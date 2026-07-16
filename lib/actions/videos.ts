"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { videos } from "@/lib/db/schema";
import {
  VIDEO_STATUSES,
  VIDEO_TYPES,
  type ActionResult,
} from "@/lib/types";

const createVideoSchema = z.object({
  // Client-generated so the optimistic card and the row share identity.
  id: z.uuid(),
  title: z.string().trim().min(1).max(300),
  type: z.enum(VIDEO_TYPES),
  scheduledDate: z.iso.date().optional(),
});

export async function createVideo(input: unknown): Promise<ActionResult> {
  try {
    const data = createVideoSchema.parse(input);
    const [row] = db
      .select({ min: sql<number | null>`min(${videos.sortOrder})` })
      .from(videos)
      .where(and(eq(videos.status, "idea"), isNull(videos.archivedAt)))
      .all();
    db.insert(videos)
      .values({
        id: data.id,
        title: data.title,
        type: data.type,
        scheduledDate: data.scheduledDate,
        status: "idea",
        sortOrder: (row?.min ?? 2000) - 1000,
      })
      .run();
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not create video",
    };
  }
}

const moveVideoSchema = z.object({
  id: z.uuid(),
  status: z.enum(VIDEO_STATUSES),
  sortOrder: z.number().finite(),
});

export async function moveVideo(input: unknown): Promise<ActionResult> {
  try {
    const data = moveVideoSchema.parse(input);
    const result = db
      .update(videos)
      .set({ status: data.status, sortOrder: data.sortOrder })
      .where(eq(videos.id, data.id))
      .run();
    if (result.changes === 0) {
      return { ok: false, error: "Video not found" };
    }
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not move video",
    };
  }
}
