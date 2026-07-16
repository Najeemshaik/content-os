import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

type Db = BetterSQLite3Database<typeof schema>;

export function seedIfEmpty(db: Db) {
  // The app ships empty — no demo videos, structures, or rhythm. Only the
  // functional default the Settings page expects is ensured here.
  db.transaction(
    (tx) => {
      const existing = tx
        .select({ key: schema.settings.key })
        .from(schema.settings)
        .limit(1)
        .all();
      if (existing.length > 0) return;

      tx.insert(schema.settings)
        .values({ key: "rolling_average_window", value: "10" })
        .run();
    },
    { behavior: "immediate" },
  );
}
