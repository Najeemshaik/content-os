import { db } from "@/lib/db/client";
import { getRollingWindow } from "@/lib/db/flags";
import { rhythmSlots } from "@/lib/db/schema";
import { SettingsView } from "@/components/settings/settings-view";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const slots = db
    .select({ weekday: rhythmSlots.weekday, type: rhythmSlots.type })
    .from(rhythmSlots)
    .all();

  return <SettingsView rhythm={slots} rollingWindow={getRollingWindow()} />;
}
