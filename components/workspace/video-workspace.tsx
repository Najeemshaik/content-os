"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  ChartColumn,
  FilePlus2,
  Flame,
  GitBranch,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { advanceStatus, archiveVideo, updateVideo } from "@/lib/actions/videos";
import { createSnapshot } from "@/lib/actions/revisions";
import { markStructureUsed } from "@/lib/actions/structures";
import { runtimeLabel, wordCount } from "@/lib/script";
import {
  VIDEO_TYPES,
  type VideoStatus,
  type VideoType,
} from "@/lib/types";
import type {
  Outlier,
  ScriptRevision,
  Structure,
  Video,
} from "@/lib/db/schema";
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
import { Textarea } from "@/components/ui/textarea";
import { TypeBadge } from "@/components/pipeline/type-badge";
import { HookStack } from "./hook-stack";
import { RevisionSheet } from "./revision-sheet";
import { SaveIndicator, type SaveState } from "./save-indicator";
import { TemplatePicker } from "./template-picker";

const ADVANCE_LABELS: Partial<Record<VideoStatus, string>> = {
  idea: "Mark Scripted",
  scripted: "Start Production",
  production: "Mark Published",
};

const STATUS_LABELS: Record<VideoStatus, string> = {
  idea: "Idea",
  scripted: "Scripted",
  production: "Production",
  published: "Published",
};

type Editable = {
  title: string;
  type: VideoType;
  status: VideoStatus;
  notes: string;
  hookVerbal: string;
  hookWritten: string;
  hookVisual: string;
  scriptBody: string;
  shotNotes: string;
  seriesId: string | null;
  episodeNumber: number | null;
  scheduledDate: string | null;
};

type PendingPatch = Partial<
  Omit<Editable, "notes" | "hookVerbal" | "hookWritten" | "hookVisual" | "scriptBody" | "shotNotes"> & {
    notes: string | null;
    hookVerbal: string | null;
    hookWritten: string | null;
    hookVisual: string | null;
    scriptBody: string | null;
    shotNotes: string | null;
  }
>;

function toEditable(video: Video): Editable {
  return {
    title: video.title,
    type: video.type,
    status: video.status,
    notes: video.notes ?? "",
    hookVerbal: video.hookVerbal ?? "",
    hookWritten: video.hookWritten ?? "",
    hookVisual: video.hookVisual ?? "",
    scriptBody: video.scriptBody ?? "",
    shotNotes: video.shotNotes ?? "",
    seriesId: video.seriesId,
    episodeNumber: video.episodeNumber,
    scheduledDate: video.scheduledDate,
  };
}

export function VideoWorkspace({
  video,
  seriesOptions,
  structures,
  outliers,
  revisions,
  flagged,
  lineage,
}: {
  video: Video;
  seriesOptions: { id: string; name: string }[];
  structures: Structure[];
  outliers: Pick<
    Outlier,
    "id" | "creator" | "niche" | "hookVerbal" | "hookWritten" | "hookVisual"
  >[];
  revisions: ScriptRevision[];
  flagged: boolean;
  lineage: {
    parent: { id: string; title: string } | null;
    variants: { id: string; title: string }[];
  };
}) {
  const router = useRouter();
  const [state, setState] = React.useState<Editable>(() => toEditable(video));
  const [saveState, setSaveState] = React.useState<SaveState>("saved");
  const [templateOpen, setTemplateOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [advancing, startAdvance] = React.useTransition();

  const pendingRef = React.useRef<PendingPatch>({});
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const scriptDirtyRef = React.useRef(false);

  const flushSave = React.useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const pending = pendingRef.current;
    if (Object.keys(pending).length === 0) return;
    pendingRef.current = {};
    setSaveState("saving");
    try {
      const result = await updateVideo({ id: video.id, ...pending });
      if (!result.ok) throw new Error(result.error);
      setSaveState("saved");
    } catch (error) {
      // Re-queue so the next edit or flush retries the lost fields.
      pendingRef.current = { ...pending, ...pendingRef.current };
      setSaveState("error");
      toast.error(
        `Autosave failed — ${error instanceof Error ? error.message : "will retry"}`,
      );
    }
  }, [video.id]);

  const armIdleSnapshot = React.useCallback(() => {
    scriptDirtyRef.current = true;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(async () => {
      if (!scriptDirtyRef.current) return;
      scriptDirtyRef.current = false;
      await flushSave();
      await createSnapshot({ videoId: video.id });
      router.refresh();
    }, 60_000);
  }, [flushSave, router, video.id]);

  const patch = React.useCallback(
    (
      fields: Partial<Editable>,
      options?: { immediate?: boolean; snapshotRelevant?: boolean },
    ) => {
      setState((prev) => ({ ...prev, ...fields }));
      const payload: PendingPatch = {};
      for (const [key, value] of Object.entries(fields)) {
        // Empty strings persist as NULL for nullable text columns.
        const nullable = [
          "notes",
          "hookVerbal",
          "hookWritten",
          "hookVisual",
          "scriptBody",
          "shotNotes",
        ].includes(key);
        (payload as Record<string, unknown>)[key] =
          nullable && value === "" ? null : value;
      }
      pendingRef.current = { ...pendingRef.current, ...payload };
      if (options?.snapshotRelevant) armIdleSnapshot();
      if (options?.immediate) {
        void flushSave();
      } else {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => void flushSave(), 500);
      }
    },
    [armIdleSnapshot, flushSave],
  );

  // Flush on unmount / route change; PRD §6 tolerates ≤500ms of typing loss.
  React.useEffect(() => {
    const onBeforeUnload = () => void flushSave();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      void flushSave();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [flushSave]);

  function insertTemplate(structure: Structure) {
    const body = state.scriptBody.trim();
    patch(
      { scriptBody: body ? `${body}\n\n${structure.template}` : structure.template },
      { immediate: true, snapshotRelevant: true },
    );
    void markStructureUsed({ id: structure.id });
    void updateVideo({ id: video.id, structureId: structure.id });
    toast.success(`Inserted “${structure.name}” — fill in the {placeholders}`);
  }

  function advance() {
    startAdvance(async () => {
      await flushSave();
      try {
        const result = await advanceStatus({ id: video.id });
        if (!result.ok) throw new Error(result.error);
        const next = result.data?.status;
        if (next) setState((prev) => ({ ...prev, status: next }));
        if (next === "published") {
          toast.success("Published — log the post URL & metrics in Review", {
            action: {
              label: "Open Review",
              onClick: () => router.push("/review"),
            },
          });
        } else if (next) {
          toast.success(`Moved to ${STATUS_LABELS[next]}`);
        }
        router.refresh();
      } catch (error) {
        toast.error(
          `Couldn't advance — ${error instanceof Error ? error.message : "try again"}`,
        );
      }
    });
  }

  async function archive() {
    try {
      const result = await archiveVideo({ id: video.id });
      if (!result.ok) throw new Error(result.error);
      toast.success("Video archived");
      router.push("/");
    } catch (error) {
      toast.error(
        `Couldn't archive — ${error instanceof Error ? error.message : "try again"}`,
      );
    }
  }

  const words = wordCount(state.scriptBody);
  const advanceLabel = ADVANCE_LABELS[state.status];

  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-5 md:px-8 md:py-6"
      onBlur={() => void flushSave()}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Pipeline
          </Link>
          <div className="flex items-center gap-3">
            <SaveIndicator state={saveState} />
            {advanceLabel ? (
              <Button
                onClick={advance}
                disabled={advancing}
                size="sm"
                className="gap-1.5"
              >
                {advanceLabel}
                <ArrowRight className="size-3.5" aria-hidden />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => router.push("/review")}
              >
                <ChartColumn className="size-3.5" aria-hidden />
                Log metrics
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Textarea
            value={state.title}
            onChange={(e) =>
              patch({ title: e.target.value.replace(/\n/g, " ") })
            }
            rows={1}
            aria-label="Title"
            className="min-h-0 flex-1 resize-none border-0 bg-transparent p-0 text-2xl leading-tight font-semibold tracking-tight shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          {flagged && (
            <Flame
              className="mt-1.5 size-5 shrink-0 text-flag"
              fill="currentColor"
              aria-label="5× outlier"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={state.type}
            onValueChange={(v) => patch({ type: v as VideoType }, { immediate: true })}
          >
            <SelectTrigger size="sm" aria-label="Type">
              <TypeBadge type={state.type} />
            </SelectTrigger>
            <SelectContent>
              {VIDEO_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={state.status}
            onValueChange={(v) =>
              patch({ status: v as VideoStatus }, { immediate: true })
            }
          >
            <SelectTrigger size="sm" aria-label="Status">
              {STATUS_LABELS[state.status]}
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_LABELS) as VideoStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={state.seriesId ?? "none"}
            onValueChange={(v) =>
              patch(
                {
                  seriesId: v === "none" ? null : v,
                  ...(v === "none" ? { episodeNumber: null } : {}),
                },
                { immediate: true },
              )
            }
          >
            <SelectTrigger size="sm" aria-label="Series">
              {state.seriesId
                ? (seriesOptions.find((s) => s.id === state.seriesId)?.name ??
                  "Series")
                : "No series"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No series</SelectItem>
              {seriesOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {state.seriesId && (
            <Input
              type="number"
              min={1}
              value={state.episodeNumber ?? ""}
              onChange={(e) =>
                patch({
                  episodeNumber: e.target.value
                    ? Math.max(1, Number(e.target.value))
                    : null,
                })
              }
              aria-label="Episode number"
              placeholder="Ep #"
              className="h-8 w-18 text-sm"
            />
          )}

          <Input
            type="date"
            value={state.scheduledDate ?? ""}
            onChange={(e) =>
              patch(
                { scheduledDate: e.target.value || null },
                { immediate: true },
              )
            }
            aria-label="Scheduled date"
            className="h-8 w-fit text-sm"
          />

          <div className="ms-auto">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-destructive"
              onClick={() => setArchiveOpen(true)}
            >
              <Archive className="size-3.5" aria-hidden />
              Archive
            </Button>
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="rounded-2xl bg-card shadow-card">
            <div className="flex flex-wrap items-center gap-1 border-b px-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => setTemplateOpen(true)}
              >
                <FilePlus2 className="size-3.5" aria-hidden />
                Insert template
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => {
                  router.refresh();
                  setHistoryOpen(true);
                }}
              >
                <History className="size-3.5" aria-hidden />
                History
                {revisions.length > 0 && (
                  <span className="tabular-nums">({revisions.length})</span>
                )}
              </Button>
              <span className="ms-auto text-xs tabular-nums text-muted-foreground">
                {words} {words === 1 ? "word" : "words"} · {runtimeLabel(words)}
              </span>
            </div>
            <Textarea
              value={state.scriptBody}
              onChange={(e) =>
                patch({ scriptBody: e.target.value }, { snapshotRelevant: true })
              }
              placeholder="Write the script. Verbal hook first — say it like you'd say it on camera."
              aria-label="Script"
              className="max-h-none min-h-[55svh] w-full resize-none rounded-none border-0 bg-transparent px-5 py-5 !text-base leading-7 shadow-none focus-visible:ring-0 md:px-8 dark:bg-transparent"
              style={{ maxWidth: "72ch" }}
            />
          </section>

          <section className="rounded-2xl bg-card p-4 shadow-card">
            <label
              htmlFor="shot-notes"
              className="text-xs font-medium tracking-widest text-muted-foreground uppercase"
            >
              Shot notes
            </label>
            <Textarea
              id="shot-notes"
              value={state.shotNotes}
              onChange={(e) => patch({ shotNotes: e.target.value })}
              placeholder="B-roll, locations, props…"
              rows={3}
              className="mt-2 resize-none border-0 bg-transparent p-0 text-sm leading-6 shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section className="rounded-2xl bg-card p-4 shadow-card">
            <h2 className="mb-3 text-sm font-semibold tracking-tight">
              Hook stack
            </h2>
            <HookStack
              values={{
                verbal: state.hookVerbal,
                written: state.hookWritten,
                visual: state.hookVisual,
              }}
              onChange={(kind, value) =>
                patch(
                  {
                    [kind === "verbal"
                      ? "hookVerbal"
                      : kind === "written"
                        ? "hookWritten"
                        : "hookVisual"]: value,
                  },
                  { snapshotRelevant: true },
                )
              }
              outliers={outliers}
            />
          </section>

          <section className="rounded-2xl bg-card p-4 shadow-card">
            <label
              htmlFor="notes"
              className="text-xs font-medium tracking-widest text-muted-foreground uppercase"
            >
              Notes
            </label>
            <Textarea
              id="notes"
              value={state.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder="Angle, context, loose thoughts…"
              rows={4}
              className="mt-2 resize-none border-0 bg-transparent p-0 text-sm leading-6 shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
          </section>

          {(lineage.parent || lineage.variants.length > 0) && (
            <section className="rounded-2xl bg-card p-4 shadow-card">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold tracking-tight">
                <GitBranch className="size-3.5" aria-hidden />
                Lineage
              </h2>
              <div className="flex flex-col gap-1.5 text-sm">
                {lineage.parent && (
                  <p className="text-muted-foreground">
                    Double-down of{" "}
                    <Link
                      href={`/video/${lineage.parent.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {lineage.parent.title}
                    </Link>
                  </p>
                )}
                {lineage.variants.map((variant) => (
                  <p key={variant.id} className="text-muted-foreground">
                    Variant:{" "}
                    <Link
                      href={`/video/${variant.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {variant.title}
                    </Link>
                  </p>
                ))}
              </div>
            </section>
          )}

          {state.status === "published" && video.publishedAt && (
            <section className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
              Published {format(video.publishedAt, "MMM d, yyyy")}.{" "}
              <Link
                href="/review"
                className="font-medium text-foreground hover:underline"
              >
                Log metrics in Review →
              </Link>
            </section>
          )}

          {state.scheduledDate && (
            <p className="px-1 text-xs text-muted-foreground">
              Scheduled for{" "}
              {format(parseISO(state.scheduledDate), "EEEE, MMM d")}
            </p>
          )}
        </div>
      </div>

      <TemplatePicker
        structures={structures}
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        onPick={insertTemplate}
      />
      <RevisionSheet
        revisions={revisions}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onRestored={(fields) => {
          // Apply restored fields directly — local state is authoritative.
          pendingRef.current = {};
          setState((prev) => ({
            ...prev,
            scriptBody: fields.scriptBody ?? "",
            hookVerbal: fields.hookVerbal ?? "",
            hookWritten: fields.hookWritten ?? "",
            hookVisual: fields.hookVisual ?? "",
          }));
        }}
      />
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive this video?</DialogTitle>
            <DialogDescription>
              It disappears from the board and calendar. Nothing is deleted —
              the data stays in your database.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={archive}>
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
