import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  // Used only by the drizzle-kit CLI (studio); the app opens the file itself.
  dbCredentials: { url: "file:./data/content.db" },
  strict: true,
  verbose: true,
});
