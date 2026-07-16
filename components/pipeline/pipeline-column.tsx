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
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-2xl bg-muted/50 transition-colors md:w-auto md:min-w-0 md:flex-1",
        isOver && "bg-accent/80",
      )}
    >
      <header className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <h2 className="text-sm font-medium">{label}</h2>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground shadow-xs">
          {videos.length}
        </span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col px-2 pb-2">
        {header && <div className="px-1 pb-1">{header}</div>}
        <SortableContext
          items={videos.map((v) => v.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            ref={setNodeRef}
            className="flex min-h-28 flex-1 flex-col gap-2 rounded-xl p-1"
          >
            {videos.map((video) => (
              <SortableVideoCard
                key={video.id}
                video={video}
                onOpen={() => onOpen(video.id)}
              />
            ))}
            {videos.length === 0 && (
              <p className="px-3 py-5 text-xs leading-relaxed text-muted-foreground/80">
                {EMPTY_HINTS[status]}
              </p>
            )}
          </div>
        </SortableContext>
      </div>
    </section>
  );
}
