"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { scriptDrafts, scriptRevisions, videos } from "@/lib/db/schema";
import { snapshotVideo } from "@/lib/db/revisions";
import {
  VIDEO_FORMATS,
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

async function minIdeaSortOrder(): Promise<number> {
  const db = await getDb();
  const row = await db
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
  format: z.enum(VIDEO_FORMATS).optional(),
  scheduledDate: z.iso.date().optional(),
  scriptBody: z.string().optional(),
  structureId: z.uuid().optional(),
});

export async function createVideo(input: unknown): Promise<ActionResult> {
  try {
    const data = createVideoSchema.parse(input);
    const db = await getDb();
    await db
      .insert(videos)
      .values({ ...data, status: "idea", sortOrder: await minIdeaSortOrder() })
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
    const db = await getDb();
    const result = await db
      .update(videos)
      .set({ status: data.status, sortOrder: data.sortOrder })
      .where(eq(videos.id, data.id))
      .run();
    if (result.rowsAffected === 0)
      return { ok: false, error: "Video not found" };
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
  format: z.enum(VIDEO_FORMATS).optional(),
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
    const db = await getDb();
    const result = await db
      .update(videos)
      .set(fields)
      .where(eq(videos.id, id))
      .run();
    if (result.rowsAffected === 0)
      return { ok: false, error: "Video not found" };
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
    const db = await getDb();
    const result = await db
      .update(videos)
      .set({ scheduledDate: data.scheduledDate })
      .where(eq(videos.id, data.id))
      .run();
    if (result.rowsAffected === 0)
      return { ok: false, error: "Video not found" };
    revalidateAll();
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not schedule video");
  }
}

export async function archiveVideo(input: unknown): Promise<ActionResult> {
  try {
    const { id } = z.object({ id: z.uuid() }).parse(input);
    const db = await getDb();
    const result = await db
      .update(videos)
      .set({ archivedAt: Date.now() })
      .where(eq(videos.id, id))
      .run();
    if (result.rowsAffected === 0)
      return { ok: false, error: "Video not found" };
    revalidateAll();
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not archive video");
  }
}

const duplicateSchema = z.object({
  id: z.uuid(),
  // Client-generated so the optimistic card and the row share identity.
  newId: z.uuid(),
});

export async function duplicateVideo(input: unknown): Promise<ActionResult> {
  try {
    const { id, newId } = duplicateSchema.parse(input);
    const db = await getDb();
    const source = await db
      .select()
      .from(videos)
      .where(eq(videos.id, id))
      .get();
    if (!source) return { ok: false, error: "Video not found" };
    await db
      .insert(videos)
      .values({
        id: newId,
        title: `${source.title} (copy)`,
        type: source.type,
        format: source.format,
        status: source.status,
        notes: source.notes,
        hookVerbal: source.hookVerbal,
        hookWritten: source.hookWritten,
        hookVisual: source.hookVisual,
        scriptBody: source.scriptBody,
        shotNotes: source.shotNotes,
        structureId: source.structureId,
        // Metrics, schedule, series slot, and lineage stay behind — a copy
        // is a fresh take on the content, not a second record of the video.
        sortOrder: source.sortOrder + 1,
      })
      .run();
    revalidateAll();
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not duplicate video");
  }
}

export async function deleteVideo(input: unknown): Promise<ActionResult> {
  try {
    const { id } = z.object({ id: z.uuid() }).parse(input);
    const db = await getDb();
    // Detach lineage references, drop revisions, then the row — explicit so
    // it doesn't depend on the connection's foreign-key/cascade settings.
    await db
      .update(videos)
      .set({ doubleDownOf: null })
      .where(eq(videos.doubleDownOf, id))
      .run();
    await db
      .update(videos)
      .set({ clipOf: null })
      .where(eq(videos.clipOf, id))
      .run();
    await db
      .delete(scriptRevisions)
      .where(eq(scriptRevisions.videoId, id))
      .run();
    await db
      .delete(scriptDrafts)
      .where(eq(scriptDrafts.videoId, id))
      .run();
    const result = await db.delete(videos).where(eq(videos.id, id)).run();
    if (result.rowsAffected === 0)
      return { ok: false, error: "Video not found" };
    revalidateAll();
    return { ok: true };
  } catch (error) {
    return fail(error, "Could not delete video");
  }
}

export async function advanceStatus(
  input: unknown,
): Promise<ActionResult<{ status: VideoStatus }>> {
  try {
    const { id } = z.object({ id: z.uuid() }).parse(input);
    const db = await getDb();
    const video = await db.select().from(videos).where(eq(videos.id, id)).get();
    if (!video) return { ok: false, error: "Video not found" };
    const index = VIDEO_STATUSES.indexOf(video.status);
    if (index >= VIDEO_STATUSES.length - 1) {
      return { ok: false, error: "Already published" };
    }
    const next = VIDEO_STATUSES[index + 1];
    // PRD §6: a status advance snapshots the script + hooks.
    await snapshotVideo(id);
    await db
      .update(videos)
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
    const db = await getDb();
    const parent = await db
      .select()
      .from(videos)
      .where(eq(videos.id, data.id))
      .get();
    if (!parent) return { ok: false, error: "Video not found" };
    const id = crypto.randomUUID();
    await db
      .insert(videos)
      .values({
        id,
        title: `DD: ${parent.title}`,
        type: parent.type,
        format: parent.format,
        status: "idea",
        notes: data.plan,
        doubleDownOf: parent.id,
        sortOrder: await minIdeaSortOrder(),
      })
      .run();
    revalidateAll();
    return { ok: true, data: { id } };
  } catch (error) {
    return fail(error, "Could not create double-down card");
  }
}

// First line of the excerpt, cut at a word boundary near 60 chars.
function excerptTitle(excerpt: string): string {
  const line = excerpt.trim().split("\n")[0].trim();
  if (line.length <= 60) return line;
  const cut = line.slice(0, 60);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 30 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

const clipToShortSchema = z.object({
  id: z.uuid(),
  excerpt: z.string().trim().min(1).max(20000),
  title: z.string().trim().min(1).max(300).optional(),
});

export async function clipToShort(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const data = clipToShortSchema.parse(input);
    const db = await getDb();
    const parent = await db
      .select()
      .from(videos)
      .where(eq(videos.id, data.id))
      .get();
    if (!parent) return { ok: false, error: "Video not found" };
    const id = crypto.randomUUID();
    await db
      .insert(videos)
      .values({
        id,
        title: data.title ?? excerptTitle(data.excerpt),
        type: parent.type,
        format: "short",
        status: "idea",
        scriptBody: data.excerpt,
        notes: `Clipped from “${parent.title}”.`,
        clipOf: parent.id,
        sortOrder: await minIdeaSortOrder(),
      })
      .run();
    revalidateAll();
    return { ok: true, data: { id } };
  } catch (error) {
    return fail(error, "Could not clip a short");
  }
}

export async function expandToLong(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { id: sourceId } = z.object({ id: z.uuid() }).parse(input);
    const db = await getDb();
    const parent = await db
      .select()
      .from(videos)
      .where(eq(videos.id, sourceId))
      .get();
    if (!parent) return { ok: false, error: "Video not found" };
    const outline = [
      `Expanded from the short “${parent.title}”.`,
      parent.hookVerbal && `Hook that worked: ${parent.hookVerbal}`,
      parent.scriptBody && `Short's script as the seed:\n${parent.scriptBody}`,
      "Outline: widen the promise, add depth per point, keep the short's pacing in the intro.",
    ]
      .filter(Boolean)
      .join("\n\n");
    const id = crypto.randomUUID();
    await db
      .insert(videos)
      .values({
        id,
        title: `Long: ${parent.title}`,
        type: parent.type,
        format: "long",
        status: "idea",
        notes: outline,
        clipOf: parent.id,
        sortOrder: await minIdeaSortOrder(),
      })
      .run();
    revalidateAll();
    return { ok: true, data: { id } };
  } catch (error) {
    return fail(error, "Could not create the long-form card");
  }
}
