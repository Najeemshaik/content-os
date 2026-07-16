"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  archiveVideo,
  createVideo,
  deleteVideo,
  duplicateVideo,
  moveVideo,
  updateVideo,
} from "@/lib/actions/videos";
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
  VIDEO_FORMATS,
  VIDEO_STATUSES,
  type VideoFormat,
  type VideoStatus,
  type VideoType,
} from "@/lib/types";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  computeThisWeek,
  thisWeekDates,
  type WeekRhythmSlot,
  type WeekSlot,
} from "@/lib/week";
import { FilterBar, type BoardFilter } from "./filter-bar";
import { PipelineColumn } from "./pipeline-column";
import { QuickAdd, type QuickAddHandle } from "./quick-add";
import { ThisWeekRail } from "./this-week-rail";
import {
  VideoCardContent,
  type BoardVideo,
  type CardAction,
} from "./video-card";

const COLUMN_LABELS: Record<VideoStatus, string> = {
  idea: "Idea",
  scripted: "Scripted",
  production: "Production",
  published: "Published",
};

const FILTER_KEYS: BoardFilter[] = ["all", "take", "teach", "story"];

const FORMAT_LABELS: Record<VideoFormat, string> = {
  short: "Shorts",
  long: "Long-form",
};

/** Fractional sort key between two neighbors (seeds are gapped by 1000). */
function between(before?: number, after?: number): number {
  if (before !== undefined && after !== undefined) return (before + after) / 2;
  if (before !== undefined) return before + 1000;
  if (after !== undefined) return after - 1000;
  return 1000;
}

export function PipelineBoard({
  initialVideos,
  rhythmSlots,
}: {
  initialVideos: BoardVideo[];
  rhythmSlots: WeekRhythmSlot[];
}) {
  const router = useRouter();
  // Board state is authoritative for the session; server actions persist in
  // the background and we revert to a snapshot + toast on failure.
  const [videos, setVideos] = React.useState(initialVideos);
  // Which world you're in: Shorts or Long-form. Defaults to Shorts each load.
  const [boardFormat, setBoardFormat] = React.useState<VideoFormat>("short");
  // On phones the board shows one stage at a time behind these tabs.
  const [mobileStage, setMobileStage] = React.useState<VideoStatus>("idea");
  const [filter, setFilter] = React.useState<BoardFilter>("all");
  const [search, setSearch] = React.useState("");
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [renameTarget, setRenameTarget] = React.useState<BoardVideo | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = React.useState<BoardVideo | null>(
    null,
  );
  const snapshotRef = React.useRef<BoardVideo[] | null>(null);
  const justDraggedRef = React.useRef(false);
  const quickAddRef = React.useRef<QuickAddHandle>(null);
  const [, startTransition] = React.useTransition();

  const sensors = useSensors(
    // The distance constraint lets plain clicks open the workspace.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visible = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const columns = Object.fromEntries(
      VIDEO_STATUSES.map((s) => [s, [] as BoardVideo[]]),
    ) as Record<VideoStatus, BoardVideo[]>;
    for (const video of videos) {
      if (video.format !== boardFormat) continue;
      if (filter !== "all" && video.type !== filter) continue;
      if (query && !video.title.toLowerCase().includes(query)) continue;
      columns[video.status].push(video);
    }
    for (const s of VIDEO_STATUSES) {
      columns[s].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return columns;
  }, [videos, boardFormat, filter, search]);

  const formatCounts = React.useMemo(() => {
    const counts: Record<VideoFormat, number> = { short: 0, long: 0 };
    for (const video of videos) counts[video.format] += 1;
    return counts;
  }, [videos]);

  // The rhythm is a short-form cadence; longs scheduled this week surface as
  // their own chips beside the rhythm slots.
  const weekSlots = React.useMemo(
    () =>
      computeThisWeek(
        rhythmSlots,
        videos.filter((v) => v.format === "short"),
      ),
    [rhythmSlots, videos],
  );
  const weekLongs = React.useMemo(() => {
    const dates = new Set(thisWeekDates());
    return videos
      .filter(
        (v) =>
          v.format === "long" && v.scheduledDate && dates.has(v.scheduledDate),
      )
      .sort((a, b) => a.scheduledDate!.localeCompare(b.scheduledDate!));
  }, [videos]);

  function findContainer(id: UniqueIdentifier): VideoStatus | undefined {
    if ((VIDEO_STATUSES as readonly string[]).includes(String(id))) {
      return id as VideoStatus;
    }
    return videos.find((v) => v.id === id)?.status;
  }

  function handleDragStart(event: DragStartEvent) {
    snapshotRef.current = videos;
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);
    if (!activeContainer || !overContainer || activeContainer === overContainer)
      return;

    // Cross-column hover: give the card a provisional home so columns render
    // it while dragging. Final position is settled in handleDragEnd.
    const items = visible[overContainer].filter((v) => v.id !== active.id);
    let sortOrder: number;
    if (over.id === overContainer || items.length === 0) {
      sortOrder = between(items.at(-1)?.sortOrder, undefined);
    } else {
      const overIndex = items.findIndex((v) => v.id === over.id);
      sortOrder = between(
        items[overIndex - 1]?.sortOrder,
        items[overIndex]?.sortOrder,
      );
    }
    setVideos((prev) =>
      prev.map((v) =>
        v.id === active.id ? { ...v, status: overContainer, sortOrder } : v,
      ),
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    justDraggedRef.current = true;
    setTimeout(() => {
      justDraggedRef.current = false;
    }, 120);

    const { active, over } = event;
    const snapshot = snapshotRef.current;
    snapshotRef.current = null;
    const revert = () => snapshot && setVideos(snapshot);

    if (!over) return revert();
    const overContainer = findContainer(over.id);
    if (!overContainer) return revert();

    const items = visible[overContainer];
    const without = items.filter((v) => v.id !== active.id);
    let insertAt: number;
    if (over.id === overContainer) {
      insertAt = without.length;
    } else {
      const overIndex = items.findIndex((v) => v.id === over.id);
      if (overIndex < 0) return revert();
      // arrayMove semantics: after removing the active card, inserting at the
      // over card's index lands the card where dnd-kit previewed it.
      const activeIndex = items.findIndex((v) => v.id === active.id);
      insertAt =
        activeIndex >= 0 && activeIndex < overIndex
          ? overIndex
          : Math.min(overIndex, without.length);
    }
    const sortOrder = between(
      without[insertAt - 1]?.sortOrder,
      without[insertAt]?.sortOrder,
    );

    const original = snapshot?.find((v) => v.id === active.id);
    if (
      original &&
      original.status === overContainer &&
      original.sortOrder === sortOrder
    ) {
      // Dropped back where it started.
      return revert();
    }

    setVideos((prev) =>
      prev.map((v) =>
        v.id === active.id ? { ...v, status: overContainer, sortOrder } : v,
      ),
    );
    startTransition(async () => {
      // A dead server makes the action call throw rather than return.
      try {
        const result = await moveVideo({
          id: String(active.id),
          status: overContainer,
          sortOrder,
        });
        if (!result.ok) throw new Error(result.error);
      } catch (error) {
        revert();
        toast.error(
          `Couldn't move video — ${error instanceof Error ? error.message : "save failed"}`,
        );
      }
    });
  }

  function handleDragCancel() {
    setActiveId(null);
    if (snapshotRef.current) setVideos(snapshotRef.current);
    snapshotRef.current = null;
  }

  function handleAdd(input: {
    title: string;
    type: VideoType;
    scheduledDate?: string;
  }) {
    const ideas = videos.filter((v) => v.status === "idea");
    const minSort = ideas.length
      ? Math.min(...ideas.map((v) => v.sortOrder))
      : 2000;
    const optimistic: BoardVideo = {
      id: crypto.randomUUID(),
      title: input.title,
      type: input.type,
      // Capture inherits the board you're looking at — filing is automatic.
      format: boardFormat,
      status: "idea",
      scheduledDate: input.scheduledDate ?? null,
      sortOrder: minSort - 1000,
      seriesName: null,
      episodeNumber: null,
      doubleDownOf: null,
      clipOf: null,
      flagged: false,
    };
    setVideos((prev) => [...prev, optimistic]);
    startTransition(async () => {
      try {
        const result = await createVideo({
          id: optimistic.id,
          title: input.title,
          type: input.type,
          format: optimistic.format,
          scheduledDate: input.scheduledDate,
        });
        if (!result.ok) throw new Error(result.error);
      } catch (error) {
        setVideos((prev) => prev.filter((v) => v.id !== optimistic.id));
        toast.error(
          `Couldn't add idea — ${error instanceof Error ? error.message : "save failed"}`,
        );
      }
    });
  }

  /** Optimistic local change + background persist with revert-on-failure. */
  function mutate(
    apply: (prev: BoardVideo[]) => BoardVideo[],
    persist: () => Promise<{ ok: boolean; error?: string }>,
    failureLabel: string,
  ) {
    const before = videos;
    setVideos(apply);
    startTransition(async () => {
      try {
        const result = await persist();
        if (!result.ok) throw new Error(result.error);
      } catch (error) {
        setVideos(before);
        toast.error(
          `${failureLabel} — ${error instanceof Error ? error.message : "save failed"}`,
        );
      }
    });
  }

  function handleCardAction(video: BoardVideo, action: CardAction) {
    switch (action.kind) {
      case "rename":
        setRenameTarget(video);
        break;
      case "delete":
        setDeleteTarget(video);
        break;
      case "duplicate": {
        const newId = crypto.randomUUID();
        const copy: BoardVideo = {
          ...video,
          id: newId,
          title: `${video.title} (copy)`,
          sortOrder: video.sortOrder + 1,
          scheduledDate: null,
          seriesName: null,
          episodeNumber: null,
          doubleDownOf: null,
          clipOf: null,
          flagged: false,
        };
        mutate(
          (prev) => [...prev, copy],
          () => duplicateVideo({ id: video.id, newId }),
          "Couldn't duplicate",
        );
        break;
      }
      case "move": {
        const target = visible[action.status];
        const sortOrder = between(target.at(-1)?.sortOrder, undefined);
        mutate(
          (prev) =>
            prev.map((v) =>
              v.id === video.id ? { ...v, status: action.status, sortOrder } : v,
            ),
          () => moveVideo({ id: video.id, status: action.status, sortOrder }),
          "Couldn't move",
        );
        break;
      }
      case "format":
        mutate(
          (prev) =>
            prev.map((v) =>
              v.id === video.id ? { ...v, format: action.format } : v,
            ),
          () => updateVideo({ id: video.id, format: action.format }),
          "Couldn't change format",
        );
        toast.success(
          action.format === "long"
            ? "Moved to the Long-form board"
            : "Moved to the Shorts board",
          {
            action: {
              label: "View",
              onClick: () => setBoardFormat(action.format),
            },
          },
        );
        break;
      case "archive":
        mutate(
          (prev) => prev.filter((v) => v.id !== video.id),
          () => archiveVideo({ id: video.id }),
          "Couldn't archive",
        );
        break;
    }
  }

  function handleGhostClick(slot: WeekSlot) {
    // Rhythm slots are short-form — jump to the Shorts board to fill one.
    setBoardFormat("short");
    quickAddRef.current?.focusWith({
      type: slot.type,
      scheduledDate: slot.date,
    });
  }

  function openVideo(id: string) {
    if (justDraggedRef.current) return;
    router.push(`/video/${id}`);
  }

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, [contenteditable='true'], [role='menu'], [role='listbox']",
        )
      )
        return;
      if (event.key === "n") {
        event.preventDefault();
        quickAddRef.current?.focusWith();
      } else if (event.key === "f") {
        setBoardFormat((prev) => (prev === "short" ? "long" : "short"));
      } else if (["1", "2", "3", "4"].includes(event.key)) {
        setFilter(FILTER_KEYS[Number(event.key) - 1]);
      } else if (event.key === "Escape") {
        setSearch("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const activeVideo = activeId
    ? (videos.find((v) => v.id === activeId) ?? null)
    : null;

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-9xl flex-col gap-5 p-5 md:h-svh md:px-8 md:py-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-xl font-semibold tracking-tight">Pipeline</h1>
            <ToggleGroup
              value={[boardFormat]}
              onValueChange={(values: unknown[]) =>
                setBoardFormat((values[0] as VideoFormat | undefined) ?? "short")
              }
              variant="outline"
              size="sm"
              spacing={0}
              aria-label="Format"
            >
              {VIDEO_FORMATS.map((f) => (
                <ToggleGroupItem key={f} value={f} className="gap-1.5">
                  {FORMAT_LABELS[f]}
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatCounts[f]}
                  </span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <FilterBar
            filter={filter}
            onFilterChange={setFilter}
            search={search}
            onSearchChange={setSearch}
          />
        </div>
        <ThisWeekRail
          slots={weekSlots}
          longs={weekLongs}
          onGhostClick={handleGhostClick}
        />
        {/* Mobile stage tabs — the four columns collapse to one at a time. */}
        <div
          role="tablist"
          aria-label="Stage"
          className="grid grid-cols-4 gap-1 rounded-xl bg-muted/60 p-1 md:hidden"
        >
          {VIDEO_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={mobileStage === status}
              onClick={() => setMobileStage(status)}
              className={cn(
                "flex flex-col items-center rounded-lg py-1.5 text-xs font-medium text-muted-foreground",
                mobileStage === status && "bg-card text-foreground shadow-xs",
              )}
            >
              {COLUMN_LABELS[status]}
              <span className="text-2xs tabular-nums opacity-60">
                {visible[status].length}
              </span>
            </button>
          ))}
        </div>
      </div>
      <DndContext
        id="pipeline-board"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex flex-1 items-stretch gap-3 md:grid md:min-h-0 md:grid-cols-4 md:overflow-y-auto">
          {VIDEO_STATUSES.map((status) => (
            <PipelineColumn
              key={status}
              status={status}
              label={COLUMN_LABELS[status]}
              videos={visible[status]}
              onOpen={openVideo}
              onCardAction={handleCardAction}
              className={mobileStage === status ? "flex" : "hidden md:flex"}
              header={
                status === "idea" ? (
                  <QuickAdd ref={quickAddRef} onAdd={handleAdd} />
                ) : undefined
              }
            />
          ))}
        </div>
        <DragOverlay>
          {activeVideo && <VideoCardContent video={activeVideo} />}
        </DragOverlay>
      </DndContext>

      <RenameDialog
        target={renameTarget}
        onClose={() => setRenameTarget(null)}
        onRename={(video, title) =>
          mutate(
            (prev) =>
              prev.map((v) => (v.id === video.id ? { ...v, title } : v)),
            () => updateVideo({ id: video.id, title }),
            "Couldn't rename",
          )
        }
      />
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete “{deleteTarget?.title}”?</DialogTitle>
            <DialogDescription>
              Permanently removes the video, its script, and its revision
              history. Archive instead if you might want it back.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const target = deleteTarget;
                setDeleteTarget(null);
                if (!target) return;
                mutate(
                  (prev) => prev.filter((v) => v.id !== target.id),
                  () => deleteVideo({ id: target.id }),
                  "Couldn't delete",
                );
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RenameDialog({
  target,
  onClose,
  onRename,
}: {
  target: BoardVideo | null;
  onClose: () => void;
  onRename: (video: BoardVideo, title: string) => void;
}) {
  const [title, setTitle] = React.useState("");

  // Load the target's title when the dialog opens (render-adjust pattern).
  const [lastId, setLastId] = React.useState<string | null>(null);
  if ((target?.id ?? null) !== lastId) {
    setLastId(target?.id ?? null);
    if (target) setTitle(target.title);
  }

  function submit() {
    const trimmed = title.trim();
    if (!target || !trimmed) return;
    if (trimmed !== target.title) onRename(target, trimmed);
    onClose();
  }

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename</DialogTitle>
          <DialogDescription className="sr-only">
            Change the video title.
          </DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          aria-label="Title"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!title.trim()}>
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
