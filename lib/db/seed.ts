import type { Db } from "./client";
import * as schema from "./schema";

export async function seedIfEmpty(db: Db) {
  // The app ships empty — no demo videos, structures, or rhythm. Only the
  // functional default the Settings page expects is ensured here. Conflict
  // handling makes concurrent bootstraps (Next build workers) race-safe.
  await db
    .insert(schema.settings)
    .values({ key: "rolling_average_window", value: "10" })
    .onConflictDoNothing();
}
