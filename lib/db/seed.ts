import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import type { VideoFormat, VideoType } from "@/lib/types";

type Db = BetterSQLite3Database<typeof schema>;

const STRUCTURES: (typeof schema.structures.$inferInsert)[] = [
  {
    name: "Take",
    category: "other",
    template:
      "{Claim, stated flat}\nWhat most people believe instead: {assumption}\nProof from my own work: {example}\nThe reframe: {reframe}\n{Follow CTA}",
  },
  {
    name: "Teach",
    category: "educational",
    template:
      "The promise: {what they'll get}\n{Point 1}\n{Point 2}\n{Point 3}\nOne-line recap + {CTA}",
  },
  {
    name: "Story",
    category: "storytelling",
    template:
      "Open mid-scene at the most dramatic moment: {scene}\nOne line of context: {context}\nWhat happened: {beat 1} → {beat 2} → {beat 3}\nThe lesson: {lesson}\n{CTA}",
  },
];

// weekday: 0 = Sunday (JS Date#getDay() convention)
const RHYTHM_SLOTS: (typeof schema.rhythmSlots.$inferInsert)[] = [
  { weekday: 1, type: "take" },
  { weekday: 2, type: "teach" },
  { weekday: 4, type: "teach" },
  { weekday: 5, type: "take" },
  { weekday: 6, type: "story" },
];

const SEED_VIDEOS: {
  type: VideoType;
  format?: VideoFormat;
  title: string;
  notes: string;
}[] = [
  {
    type: "take",
    title:
      "AI didn't make design skills worthless — it made them the whole game",
    notes:
      "Flag-planting thesis. 45s, face + camera. Claim → assumption → proof (10 yrs craft, 3 shipped products) → reframe.",
  },
  {
    type: "teach",
    title: "This app feels expensive. This one feels cheap. Here's why",
    notes:
      "3 details doing the work — spacing, motion, type. Screen recordings of two real apps.",
  },
  {
    type: "story",
    title: "I spent 10 years on design and music before AI could build",
    notes:
      "Right order, it turns out. Compressed origin → lesson: taste compounds.",
  },
  {
    type: "teach",
    title: "AI built it in 20 minutes. I spent 2 hours on the last 5%",
    notes: "That 5% is the job now. Real polish-pass screen recording.",
  },
  {
    type: "take",
    title: "Reactive slot: this week's AI news through the craft lens",
    notes:
      "Recurring — swap in whatever moved this week. Film same-day, raw.",
  },
  {
    type: "teach",
    title: "My exact AI building stack — how one person ships real software",
    notes: "Deep-dive, end to end. Save-bait.",
  },
  {
    type: "story",
    title:
      "I posted beats daily for years and built the biggest channel in the niche",
    notes: "Lesson: output beats strategy.",
  },
  {
    type: "take",
    title: "Everyone can build now. Almost nobody can make it feel good",
    notes: "Short, quotable, comment-bait. One built-vs-felt example.",
  },
  {
    type: "teach",
    title: "3 details Apple never skips — and your app shouldn't either",
    notes: 'Concrete, screenshot-driven. "Save this" ending.',
  },
  {
    type: "teach",
    title: "Making AI-built software look hand-crafted — full design pass",
    notes: "Before/after of one screen, start to finish.",
  },
  {
    type: "story",
    title:
      "The app icon took longer than the feature. That was the right call",
    notes: "Build story → lesson: the parts people touch deserve the hours.",
  },
  {
    type: "teach",
    title: "5 things AI still gets wrong in UI — and how to catch them",
    notes: "Listicle teach, examples from own builds.",
  },
  {
    type: "story",
    title: "What a build session actually looks like",
    notes: "Lectures by day, desk by night. B-roll heavy.",
  },
  {
    type: "teach",
    format: "long",
    title: "My full AI building stack, explained end to end",
    notes:
      "Long-form deep dive. Chapters: capture → scripting → build → polish. Clip shorts out of each chapter while scripting.",
  },
  {
    type: "story",
    format: "long",
    title: "30 days of daily posting — everything I learned",
    notes:
      "Long-form retro. Numbers, what flopped, what 5×'d. Each lesson is a candidate short.",
  },
];

export function seedIfEmpty(db: Db) {
  // The emptiness check lives inside an immediate transaction so concurrent
  // processes (e.g. Next build workers) serialize instead of double-seeding.
  db.transaction(
    (tx) => {
      const existing = tx
        .select({ id: schema.videos.id })
        .from(schema.videos)
        .limit(1)
        .all();
      if (existing.length > 0) return;

      tx.insert(schema.structures).values(STRUCTURES).run();
    tx.insert(schema.rhythmSlots).values(RHYTHM_SLOTS).run();
    tx.insert(schema.videos)
      .values(
        SEED_VIDEOS.map((video, i) => ({
          ...video,
          status: "idea" as const,
          sortOrder: (i + 1) * 1000,
        })),
      )
      .run();
      tx.insert(schema.settings)
        .values({ key: "rolling_average_window", value: "10" })
        .run();
    },
    { behavior: "immediate" },
  );
}
