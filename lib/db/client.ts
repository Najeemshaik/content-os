import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";
import { seedIfEmpty } from "./seed";

type Db = BetterSQLite3Database<typeof schema>;

// Cached on globalThis so Turbopack HMR module re-evaluation in dev reuses
// the same connection instead of leaking handles and re-running migrations.
const globalForDb = globalThis as unknown as { contentOsDb?: Db };

function createDb(): Db {
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });

  const sqlite = new Database(path.join(dataDir, "content.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite, { schema });
  const migrationsFolder = path.join(process.cwd(), "lib", "db", "migrations");
  try {
    migrate(db, { migrationsFolder });
  } catch {
    // Concurrent processes (Next build workers) can race a migration whose
    // DDL isn't idempotent (e.g. ALTER TABLE ADD COLUMN). The loser retries:
    // by then the winner's journal row is visible, so it's a no-op.
    migrate(db, { migrationsFolder });
  }
  seedIfEmpty(db);
  return db;
}

export const db =
  globalForDb.contentOsDb ?? (globalForDb.contentOsDb = createDb());
