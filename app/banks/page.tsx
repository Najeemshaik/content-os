import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { outliers, structures } from "@/lib/db/schema";
import { BanksView } from "@/components/banks/banks-view";

export const dynamic = "force-dynamic";

export default function BanksPage() {
  const outlierRows = db
    .select()
    .from(outliers)
    .orderBy(desc(outliers.createdAt))
    .all();
  const structureRows = db
    .select()
    .from(structures)
    .orderBy(desc(structures.timesUsed), desc(structures.createdAt))
    .all();

  return <BanksView outliers={outlierRows} structures={structureRows} />;
}
