import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import {
  OUTLIER_STATUSES,
  SERIES_STATUSES,
  SERIES_TYPES,
  STRUCTURE_CATEGORIES,
  VIDEO_FORMATS,
  VIDEO_STATUSES,
  VIDEO_TYPES,
} from "@/lib/types";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now());

const updatedAt = () =>
  integer("updated_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdateFn(() => Date.now());

export const series = sqliteTable("series", {
  id: id(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type", { enum: SERIES_TYPES }).notNull().default("custom"),
  targetEpisodes: integer("target_episodes"),
  status: text("status", { enum: SERIES_STATUSES }).notNull().default("active"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const structures = sqliteTable("structures", {
  id: id(),
  name: text("name").notNull(),
  category: text("category", { enum: STRUCTURE_CATEGORIES }).notNull(),
  template: text("template").notNull(),
  sourceUrl: text("source_url"),
  sourceCreator: text("source_creator"),
  notes: text("notes"),
  timesUsed: integer("times_used").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const videos = sqliteTable(
  "videos",
  {
    id: id(),
    title: text("title").notNull(),
    type: text("type", { enum: VIDEO_TYPES }).notNull(),
    format: text("format", { enum: VIDEO_FORMATS }).notNull().default("short"),
    status: text("status", { enum: VIDEO_STATUSES }).notNull().default("idea"),
    notes: text("notes"),
    hookVerbal: text("hook_verbal"),
    hookWritten: text("hook_written"),
    hookVisual: text("hook_visual"),
    scriptBody: text("script_body"),
    // Label of the script draft currently living in script_body; parallel
    // drafts are shelved in script_drafts and swapped in via tabs.
    scriptDraftName: text("script_draft_name").notNull().default("V1"),
    shotNotes: text("shot_notes"),
    structureId: text("structure_id").references(() => structures.id),
    seriesId: text("series_id").references(() => series.id),
    episodeNumber: integer("episode_number"),
    scheduledDate: text("scheduled_date"),
    publishedAt: integer("published_at", { mode: "number" }),
    views: integer("views").notNull().default(0),
    likes: integer("likes").notNull().default(0),
    comments: integer("comments").notNull().default(0),
    saves: integer("saves").notNull().default(0),
    shares: integer("shares").notNull().default(0),
    doubleDownOf: text("double_down_of").references(
      (): AnySQLiteColumn => videos.id,
    ),
    // Cross-format lineage: on a short, the long it was clipped from;
    // on a long, the short it expands.
    clipOf: text("clip_of").references((): AnySQLiteColumn => videos.id),
    sortOrder: real("sort_order").notNull(),
    archivedAt: integer("archived_at", { mode: "number" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("videos_status_sort_idx").on(table.status, table.sortOrder),
    index("videos_scheduled_date_idx").on(table.scheduledDate),
  ],
);

/** Shelved parallel script versions — the active one lives on the video. */
export const scriptDrafts = sqliteTable(
  "script_drafts",
  {
    id: id(),
    videoId: text("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    body: text("body"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("script_drafts_video_idx").on(table.videoId)],
);

export const scriptRevisions = sqliteTable(
  "script_revisions",
  {
    id: id(),
    videoId: text("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    scriptBody: text("script_body"),
    hookVerbal: text("hook_verbal"),
    hookWritten: text("hook_written"),
    hookVisual: text("hook_visual"),
    createdAt: createdAt(),
  },
  (table) => [index("script_revisions_video_idx").on(table.videoId)],
);

export const outliers = sqliteTable("outliers", {
  id: id(),
  url: text("url").notNull(),
  creator: text("creator"),
  creatorFollowers: integer("creator_followers"),
  views: integer("views"),
  multiplier: real("multiplier"),
  niche: text("niche"),
  hookVerbal: text("hook_verbal"),
  hookWritten: text("hook_written"),
  hookVisual: text("hook_visual"),
  transcript: text("transcript"),
  whyItWorked: text("why_it_worked"),
  status: text("status", { enum: OUTLIER_STATUSES })
    .notNull()
    .default("unprocessed"),
  structureId: text("structure_id").references(() => structures.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const rhythmSlots = sqliteTable("rhythm_slots", {
  id: id(),
  // 0 = Sunday, matching JS Date#getDay(); display order starts Monday.
  weekday: integer("weekday").notNull(),
  type: text("type", { enum: VIDEO_TYPES }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
export type ScriptRevision = typeof scriptRevisions.$inferSelect;
export type ScriptDraft = typeof scriptDrafts.$inferSelect;
export type Series = typeof series.$inferSelect;
export type Structure = typeof structures.$inferSelect;
export type Outlier = typeof outliers.$inferSelect;
export type RhythmSlot = typeof rhythmSlots.$inferSelect;
export type Setting = typeof settings.$inferSelect;
