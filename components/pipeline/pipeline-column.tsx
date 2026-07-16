"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Clapperboard, Lightbulb, PenLine, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoStatus } from "@/lib/types";
import { SortableVideoCard, type BoardVideo } from "./video-card";

const STAGE_META: Record<
  VideoStatus,
  { icon: React.ComponentType<{ className?: string }>; hint: string }
> = {
  idea: { icon: Lightbulb, hint: "Capture your first idea above." },
  scripted: { icon: PenLine, hint: "Drag an idea here once its script is done." },
  production: {
    icon: Clapperboard,
    hint: "Drag a scripted video here when you start filming.",
  },
  published: { icon: Send, hint: "Drag a video here once it's live." },
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
  const { icon: Icon, hint } = STAGE_META[status];

  return (
    <section
      aria-label={`${label} column`}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-2xl bg-muted/50 transition-colors md:w-auto md:min-w-0 md:flex-1",
        isOver && "bg-accent/80",
      )}
    >
      <header className="flex items-center gap-2 px-4 pt-3.5 pb-2.5">
        <Icon className="size-3.5 text-muted-foreground/70" aria-hidden />
        <h2 className="text-sm font-semibold tracking-tight">{label}</h2>
        <span className="ms-auto rounded-full bg-background px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground shadow-xs">
          {videos.length}
        </span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col px-2 pb-2">
        {header && <div className="px-1 pb-2">{header}</div>}
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
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/70 px-4 py-8 text-center">
                <Icon className="size-4 text-muted-foreground/40" aria-hidden />
                <p className="max-w-44 text-xs leading-relaxed text-muted-foreground/80">
                  {hint}
                </p>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </section>
  );
}
