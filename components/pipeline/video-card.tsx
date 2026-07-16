"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, Flame, ListVideo } from "lucide-react";
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
  flagged: boolean;
};

export function VideoCardContent({ video }: { video: BoardVideo }) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-xs">
      <div className="flex items-center gap-2">
        <TypeBadge type={video.type} />
        {video.flagged && (
          <Flame className="size-3.5 text-take" aria-label="5× outlier" />
        )}
      </div>
      <Link
        href={`/video/${video.id}`}
        onKeyDown={(e) => {
          // Keep Enter/Space from lifting the card via the sortable wrapper;
          // let every other key (board shortcuts) bubble.
          if (e.key === "Enter" || e.key === " ") e.stopPropagation();
        }}
        className="mt-2 block text-sm font-medium leading-snug hover:underline focus-visible:underline focus-visible:outline-none"
      >
        {video.title}
      </Link>
      {(video.seriesName || video.scheduledDate) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {video.seriesName && (
            <span className="inline-flex items-center gap-1">
              <ListVideo className="size-3" aria-hidden />
              {video.seriesName}
              {video.episodeNumber != null && ` · ${video.episodeNumber}`}
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
        "cursor-grab rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
        isDragging && "opacity-50",
      )}
    >
      <VideoCardContent video={video} />
    </div>
  );
}
