import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";
import { seedIfEmpty } from "./seed";

export type Db = LibSQLDatabase<typeof schema>;

// Cached on globalThis so Turbopack HMR module re-evaluation in dev reuses
// the same connection instead of leaking handles and re-running migrations.
const globalForDb = globalThis as unknown as { contentOsDbReady?: Promise<Db> };

function connect(): Db {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    // Hosted Turso/libSQL — the deployed configuration.
    return drizzle(
      createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN }),
      { schema },
    );
  }
  // No TURSO_DATABASE_URL → local file database (zero-setup dev, PRD §6).
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const client = createClient({
    url: `file:${path.join(dataDir, "content.db")}`,
  });
  return drizzle(client, { schema });
}

async function init(): Promise<Db> {
  const db = connect();
  const migrationsFolder = path.join(process.cwd(), "lib", "db", "migrations");
  try {
    await migrate(db, { migrationsFolder });
  } catch {
    // Concurrent processes (Next build workers) can race a migration whose
    // DDL isn't idempotent (e.g. ALTER TABLE ADD COLUMN). The loser retries:
    // by then the winner's journal row is visible, so it's a no-op.
    await migrate(db, { migrationsFolder });
  }
  await seedIfEmpty(db);
  return db;
}

/** The database, migrated and seeded. Await once per request path. */
export function getDb(): Promise<Db> {
  return (globalForDb.contentOsDbReady ??= init());
}
