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
import { createVideo, moveVideo } from "@/lib/actions/videos";
import {
  VIDEO_STATUSES,
  type VideoStatus,
  type VideoType,
} from "@/lib/types";
import {
  computeThisWeek,
  type WeekRhythmSlot,
  type WeekSlot,
} from "@/lib/week";
import { FilterBar, type BoardFilter } from "./filter-bar";
import { PipelineColumn } from "./pipeline-column";
import { QuickAdd, type QuickAddHandle } from "./quick-add";
import { ThisWeekRail } from "./this-week-rail";
import { VideoCardContent, type BoardVideo } from "./video-card";

const COLUMN_LABELS: Record<VideoStatus, string> = {
  idea: "Idea",
  scripted: "Scripted",
  production: "Production",
  published: "Published",
};

const FILTER_KEYS: BoardFilter[] = ["all", "take", "teach", "story"];

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
  const [filter, setFilter] = React.useState<BoardFilter>("all");
  const [search, setSearch] = React.useState("");
  const [activeId, setActiveId] = React.useState<string | null>(null);
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
      if (filter !== "all" && video.type !== filter) continue;
      if (query && !video.title.toLowerCase().includes(query)) continue;
      columns[video.status].push(video);
    }
    for (const s of VIDEO_STATUSES) {
      columns[s].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return columns;
  }, [videos, filter, search]);

  const weekSlots = React.useMemo(
    () => computeThisWeek(rhythmSlots, videos),
    [rhythmSlots, videos],
  );

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
      status: "idea",
      scheduledDate: input.scheduledDate ?? null,
      sortOrder: minSort - 1000,
      seriesName: null,
      episodeNumber: null,
      doubleDownOf: null,
      flagged: false,
    };
    setVideos((prev) => [...prev, optimistic]);
    startTransition(async () => {
      try {
        const result = await createVideo({
          id: optimistic.id,
          title: input.title,
          type: input.type,
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

  function handleGhostClick(slot: WeekSlot) {
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
    <div className="flex min-h-svh flex-col gap-5 p-5 md:h-svh md:px-8 md:py-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Pipeline</h1>
          <FilterBar
            filter={filter}
            onFilterChange={setFilter}
            search={search}
            onSearchChange={setSearch}
          />
        </div>
        <ThisWeekRail slots={weekSlots} onGhostClick={handleGhostClick} />
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
        <div className="flex flex-1 items-stretch gap-3 overflow-x-auto md:grid md:min-h-0 md:grid-cols-4 md:overflow-y-auto">
          {VIDEO_STATUSES.map((status) => (
            <PipelineColumn
              key={status}
              status={status}
              label={COLUMN_LABELS[status]}
              videos={visible[status]}
              onOpen={openVideo}
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
    </div>
  );
}
