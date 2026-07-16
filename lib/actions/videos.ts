"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { videos } from "@/lib/db/schema";
import { snapshotVideo } from "@/lib/db/revisions";
import {
  VIDEO_STATUSES,
  VIDEO_TYPES,
  type ActionResult,
  type VideoStatus,
} from "@/lib/types";

function fail(error: unknown, fallback: string): { ok: false; error: string } {
  return {
    ok: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

function minIdeaSortOrder(): number {
  const row = db
    .select({ min: sql<number | null>`min(${videos.sortOrder})` })
    .from(videos)
    .where(and(eq(videos.status, "idea"), isNull(videos.archivedAt)))
    .get();
  return (row?.min ?? 2000) - 1000;
}

const createVideoSchema = z.object({
  // Client-generated so the optimistic card and the row share identity.
  id: z.uuid(),
  title: z.string().trim().min(1).max(300),
  type: z.enum(VIDEO_TYPES),
  scheduledDate: z.iso.date().optional(),
  scriptBody: z.string().optional(),
  structureId: z.uuid().optional(),
});

export async function createVideo(input: unknown): Promise<ActionResult> {
  try {
    const data = createVideoSchema.parse(input);
    db.insert(videos)
      .values({ ...data, status: "idea", sortOrder: minIdeaSortOrder() })
      .run();
    revalidateAll();
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not create video");
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
    if (result.changes === 0) return { ok: false, error: "Video not found" };
    revalidateAll();
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not move video");
  }
}

const updateVideoSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(300).optional(),
  type: z.enum(VIDEO_TYPES).optional(),
  status: z.enum(VIDEO_STATUSES).optional(),
  notes: z.string().nullable().optional(),
  hookVerbal: z.string().nullable().optional(),
  hookWritten: z.string().nullable().optional(),
  hookVisual: z.string().nullable().optional(),
  scriptBody: z.string().nullable().optional(),
  shotNotes: z.string().nullable().optional(),
  structureId: z.uuid().nullable().optional(),
  seriesId: z.uuid().nullable().optional(),
  episodeNumber: z.number().int().min(1).nullable().optional(),
  scheduledDate: z.iso.date().nullable().optional(),
  views: z.number().int().min(0).optional(),
  likes: z.number().int().min(0).optional(),
  comments: z.number().int().min(0).optional(),
  saves: z.number().int().min(0).optional(),
  shares: z.number().int().min(0).optional(),
});

export async function updateVideo(input: unknown): Promise<ActionResult> {
  try {
    const { id, ...rest } = updateVideoSchema.parse(input);
    const fields = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined),
    );
    if (Object.keys(fields).length === 0) return { ok: true };
    const result = db
      .update(videos)
      .set(fields)
      .where(eq(videos.id, id))
      .run();
    if (result.changes === 0) return { ok: false, error: "Video not found" };
    revalidateAll();
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not save video");
  }
}

const scheduleSchema = z.object({
  id: z.uuid(),
  scheduledDate: z.iso.date().nullable(),
});

export async function scheduleVideo(input: unknown): Promise<ActionResult> {
  try {
    const data = scheduleSchema.parse(input);
    const result = db
      .update(videos)
      .set({ scheduledDate: data.scheduledDate })
      .where(eq(videos.id, data.id))
      .run();
    if (result.changes === 0) return { ok: false, error: "Video not found" };
    revalidateAll();
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not schedule video");
  }
}

export async function archiveVideo(input: unknown): Promise<ActionResult> {
  try {
    const { id } = z.object({ id: z.uuid() }).parse(input);
    const result = db
      .update(videos)
      .set({ archivedAt: Date.now() })
      .where(eq(videos.id, id))
      .run();
    if (result.changes === 0) return { ok: false, error: "Video not found" };
    revalidateAll();
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not archive video");
  }
}

export async function advanceStatus(
  input: unknown,
): Promise<ActionResult<{ status: VideoStatus }>> {
  try {
    const { id } = z.object({ id: z.uuid() }).parse(input);
    const video = db.select().from(videos).where(eq(videos.id, id)).get();
    if (!video) return { ok: false, error: "Video not found" };
    const index = VIDEO_STATUSES.indexOf(video.status);
    if (index >= VIDEO_STATUSES.length - 1) {
      return { ok: false, error: "Already published" };
    }
    const next = VIDEO_STATUSES[index + 1];
    // PRD §6: a status advance snapshots the script + hooks.
    snapshotVideo(id);
    db.update(videos)
      .set({
        status: next,
        ...(next === "published" ? { publishedAt: Date.now() } : {}),
      })
      .where(eq(videos.id, id))
      .run();
    revalidateAll();
    return { ok: true, data: { status: next } };
  } catch (error) {
    return fail(error, "Could not advance status");
  }
}

const doubleDownSchema = z.object({
  id: z.uuid(),
  plan: z.string().trim().min(1).max(2000),
});

export async function doubleDown(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const data = doubleDownSchema.parse(input);
    const parent = db
      .select()
      .from(videos)
      .where(eq(videos.id, data.id))
      .get();
    if (!parent) return { ok: false, error: "Video not found" };
    const id = crypto.randomUUID();
    db.insert(videos)
      .values({
        id,
        title: `DD: ${parent.title}`,
        type: parent.type,
        status: "idea",
        notes: data.plan,
        doubleDownOf: parent.id,
        sortOrder: minIdeaSortOrder(),
      })
      .run();
    revalidateAll();
    return { ok: true, data: { id } };
  } catch (error) {
    return fail(error, "Could not create double-down card");
  }
}
