"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, Flame, GitBranch, ListVideo } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { VideoStatus, VideoType } from "@/lib/types";
import { TypeBadge } from "./type-badge";

export type BoardVideo = {
  id: string;
  title: string;
  type: VideoType;
  status: VideoStatus;
  scheduledDate: string | null;
  sortOrder: number;
  seriesName: string | null;
  episodeNumber: number | null;
  doubleDownOf: string | null;
  flagged: boolean;
};

export function VideoCardContent({ video }: { video: BoardVideo }) {
  return (
    <div className="rounded-xl bg-card p-3.5 shadow-card transition-shadow duration-150 group-hover:shadow-card-hover motion-reduce:transition-none">
      <div className="flex items-center gap-1.5">
        <TypeBadge type={video.type} />
        {video.doubleDownOf && (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-1.5 py-0.5 text-xs leading-none font-medium text-muted-foreground"
            title="Double-down variant"
          >
            <GitBranch className="size-3" aria-hidden />
            DD
          </span>
        )}
        {video.flagged && (
          <Flame
            className="size-3.5 text-flag"
            aria-label="5× outlier"
            fill="currentColor"
          />
        )}
      </div>
      <Link
        href={`/video/${video.id}`}
        onKeyDown={(e) => {
          // Keep Enter/Space from lifting the card via the sortable wrapper;
          // let every other key (board shortcuts) bubble.
          if (e.key === "Enter" || e.key === " ") e.stopPropagation();
        }}
        className="mt-2.5 line-clamp-3 block text-sm leading-snug font-medium text-card-foreground focus-visible:underline focus-visible:outline-none"
      >
        {video.title}
      </Link>
      {(video.seriesName || video.scheduledDate) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {video.seriesName && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <ListVideo className="size-3 shrink-0" aria-hidden />
              <span className="truncate">
                {video.seriesName}
                {video.episodeNumber != null && ` · ${video.episodeNumber}`}
              </span>
            </span>
          )}
          {video.scheduledDate && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3" aria-hidden />
              {format(parseISO(video.scheduledDate), "EEE MMM d")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function SortableVideoCard({
  video,
  onOpen,
}: {
  video: BoardVideo;
  onOpen: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={cn(
        "group cursor-grab rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
        isDragging && "opacity-40",
      )}
    >
      <VideoCardContent video={video} />
    </div>
  );
}
