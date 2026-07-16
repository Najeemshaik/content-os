"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import type { VideoStatus } from "@/lib/types";
import { SortableVideoCard, type BoardVideo } from "./video-card";

const EMPTY_HINTS: Record<VideoStatus, string> = {
  idea: "Capture your first idea above.",
  scripted: "Drag an idea here once its script is done.",
  production: "Drag a scripted video here when you start filming.",
  published: "Drag a video here once it's live.",
};

export function PipelineColumn({
  status,
  label,
  videos,
  onOpen,
  header,
}: {
  status: VideoStatus;
  label: string;
  videos: BoardVideo[];
  onOpen: (id: string) => void;
  header?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      aria-label={`${label} column`}
      className="flex w-72 shrink-0 flex-col md:w-auto md:min-w-0 md:flex-1"
    >
      <header className="flex items-baseline gap-2 px-1 pb-3">
        <h2 className="text-sm font-medium">{label}</h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {videos.length}
        </span>
      </header>
      {header}
      <SortableContext
        items={videos.map((v) => v.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={cn(
            "flex min-h-32 flex-1 flex-col gap-2 rounded-lg p-1 transition-colors motion-reduce:transition-none",
            isOver && "bg-accent/50",
          )}
        >
          {videos.map((video) => (
            <SortableVideoCard
              key={video.id}
              video={video}
              onOpen={() => onOpen(video.id)}
            />
          ))}
          {videos.length === 0 && (
            <p className="px-2 py-4 text-xs text-muted-foreground">
              {EMPTY_HINTS[status]}
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  );
}
