"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { format } from "date-fns";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  exportData,
  importData,
  saveRhythm,
  setRollingWindow,
} from "@/lib/actions/settings";
import { VIDEO_TYPES, type VideoType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PageHeader } from "@/components/app-shell/page-header";
import { TypeDot } from "@/components/pipeline/type-badge";

// Display order Monday-first; weekday values use JS getDay() (0 = Sunday).
const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-card p-5 shadow-card">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {description && (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SettingsView({
  rhythm,
  rollingWindow,
}: {
  rhythm: { weekday: number; type: VideoType }[];
  rollingWindow: number;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  // False during SSR/hydration, true on the client — no effect needed.
  const mounted = React.useSyncExternalStore(
    React.useCallback(() => () => {}, []),
    () => true,
    () => false,
  );
  const [slots, setSlots] = React.useState<Map<number, VideoType | "none">>(
    () =>
      new Map(
        WEEKDAYS.map((d) => [
          d.value,
          rhythm.find((r) => r.weekday === d.value)?.type ?? "none",
        ]),
      ),
  );
  const [window, setWindow] = React.useState(String(rollingWindow));
  const [importPayload, setImportPayload] = React.useState<unknown | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function updateSlot(weekday: number, type: VideoType | "none") {
    const next = new Map(slots);
    next.set(weekday, type);
    setSlots(next);
    const payload = [...next.entries()]
      .filter(([, t]) => t !== "none")
      .map(([w, t]) => ({ weekday: w, type: t as VideoType }));
    const result = await saveRhythm({ slots: payload });
    if (!result.ok) {
      setSlots(slots);
      toast.error(`Couldn't save rhythm — ${result.error}`);
    } else {
      router.refresh();
    }
  }

  async function commitWindow() {
    const parsed = Math.min(100, Math.max(3, Math.floor(Number(window) || 10)));
    setWindow(String(parsed));
    const result = await setRollingWindow({ value: parsed });
    if (!result.ok) toast.error(`Couldn't save — ${result.error}`);
    else router.refresh();
  }

  async function handleExport() {
    const result = await exportData();
    if (!result.ok || !result.data) {
      toast.error("Export failed");
      return;
    }
    const blob = new Blob([JSON.stringify(result.data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `content-os-export-${format(new Date(), "yyyy-MM-dd")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Exported — keep it somewhere safe");
  }

  async function handleFile(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { app?: string };
      if (parsed?.app !== "content-os") {
        throw new Error("Not a Content OS export file");
      }
      setImportPayload(parsed);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't read that file",
      );
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function confirmImport() {
    const payload = importPayload;
    setImportPayload(null);
    const result = await importData(payload);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Import complete — data replaced");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-5 md:px-8 md:py-6">
      <PageHeader
        title="Settings"
        description="Rhythm, review window, appearance, and your data."
      />

      <Section
        title="Weekly rhythm"
        description="Which type is due on which weekday — drives the This Week rail and calendar ghosts."
      >
        <div className="grid gap-1.5">
          {WEEKDAYS.map((day) => {
            const value = slots.get(day.value) ?? "none";
            return (
              <div
                key={day.value}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-1 hover:bg-muted/50"
              >
                <span
                  className={cn(
                    "text-sm",
                    value === "none" && "text-muted-foreground",
                  )}
                >
                  {day.label}
                </span>
                <Select
                  value={value}
                  onValueChange={(v) =>
                    updateSlot(day.value, v as VideoType | "none")
                  }
                >
                  <SelectTrigger
                    size="sm"
                    aria-label={`${day.label} type`}
                    className={cn(
                      "w-28 capitalize",
                      value === "none" && "text-muted-foreground",
                    )}
                  >
                    <span className="flex items-center gap-1.5 capitalize">
                      {value !== "none" && <TypeDot type={value} />}
                      {value === "none" ? "Rest day" : value}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Rest day</SelectItem>
                    {VIDEO_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        title="Review"
        description="How many recent published videos feed the rolling view average (flagging needs at least 3 published)."
      >
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={3}
            max={100}
            value={window}
            onChange={(e) => setWindow(e.target.value)}
            onBlur={commitWindow}
            onKeyDown={(e) => e.key === "Enter" && commitWindow()}
            aria-label="Rolling average window"
            className="h-8 w-24 text-sm tabular-nums"
          />
          <span className="text-sm text-muted-foreground">
            videos in the rolling average
          </span>
        </div>
      </Section>

      <Section title="Appearance">
        {mounted && (
          <ToggleGroup
            value={[theme ?? "system"]}
            onValueChange={(values: unknown[]) =>
              setTheme((values[0] as string | undefined) ?? "system")
            }
            variant="outline"
            size="sm"
            aria-label="Theme"
          >
            <ToggleGroupItem value="light">Light</ToggleGroupItem>
            <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
            <ToggleGroupItem value="system">System</ToggleGroupItem>
          </ToggleGroup>
        )}
      </Section>

      <Section
        title="Data"
        description="Everything lives in ./data/content.db on this machine. Export a JSON snapshot, or restore one."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExport}
          >
            <Download className="size-3.5" aria-hidden />
            Export JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-3.5" aria-hidden />
            Import JSON…
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </div>
      </Section>

      <Dialog
        open={!!importPayload}
        onOpenChange={(open) => !open && setImportPayload(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Replace all data?</DialogTitle>
            <DialogDescription>
              Importing replaces everything currently in Content OS with the
              file&apos;s contents. This can&apos;t be undone — export first
              if unsure.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportPayload(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmImport}>
              Replace data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
