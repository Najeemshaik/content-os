import { z } from "zod";

export const VIDEO_TYPES = ["take", "teach", "story"] as const;
export type VideoType = (typeof VIDEO_TYPES)[number];

export const VIDEO_STATUSES = [
  "idea",
  "scripted",
  "production",
  "published",
] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export const SERIES_TYPES = ["daily", "progress", "lesson", "custom"] as const;
export type SeriesType = (typeof SERIES_TYPES)[number];

export const SERIES_STATUSES = ["active", "done", "paused"] as const;
export type SeriesStatus = (typeof SERIES_STATUSES)[number];

export const STRUCTURE_CATEGORIES = [
  "simple",
  "complex",
  "educational",
  "storytelling",
  "other",
] as const;
export type StructureCategory = (typeof STRUCTURE_CATEGORIES)[number];

export const OUTLIER_STATUSES = ["unprocessed", "templatized"] as const;
export type OutlierStatus = (typeof OUTLIER_STATUSES)[number];

export const videoTypeSchema = z.enum(VIDEO_TYPES);
export const videoStatusSchema = z.enum(VIDEO_STATUSES);

export type ActionResult = { ok: true } | { ok: false; error: string };
