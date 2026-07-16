"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Archive,
  ArrowRight,
  CalendarDays,
  Clapperboard,
  Copy,
  Ellipsis,
  Film,
  Flame,
  GitBranch,
  ListVideo,
  PenLine,
  Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormatBadge } from "./type-badge";
import {
  VIDEO_STATUSES,
  type VideoFormat,
  type VideoStatus,
  type VideoType,
} from "@/lib/types";

export type CardAction =
  | { kind: "rename" }
  | { kind: "duplicate" }
  | { kind: "move"; status: VideoStatus }
  | { kind: "format"; format: VideoFormat }
  | { kind: "archive" }
  | { kind: "delete" };

const STATUS_LABELS: Record<VideoStatus, string> = {
  idea: "Idea",
  scripted: "Scripted",
  production: "Production",
  published: "Published",
};

export type BoardVideo = {
  id: string;
  title: string;
  type: VideoType;
  format: VideoFormat;
  status: VideoStatus;
  scheduledDate: string | null;
  sortOrder: number;
  seriesName: string | null;
  episodeNumber: number | null;
  doubleDownOf: string | null;
  clipOf: string | null;
  sceneCount: number;
  shotTypeCount: number;
  flagged: boolean;
};

const ACCENTS: Record<VideoType, { bar: string; text: string }> = {
  take: { bar: "bg-take", text: "text-take" },
  teach: { bar: "bg-teach", text: "text-teach" },
  story: { bar: "bg-story", text: "text-story" },
};

export function VideoCardContent({ video }: { video: BoardVideo }) {
  const accent = ACCENTS[video.type];
  return (
    <div className="relative overflow-hidden rounded-xl bg-card p-3.5 pl-4 shadow-card transition-shadow duration-150 group-hover:shadow-card-hover motion-reduce:transition-none">
      {/* Type accent — scan the board by color. Long-form gets a thick bar
          so the two worlds read differently in peripheral vision. */}
      <span
        className={cn(
          "absolute inset-y-0 left-0",
          video.format === "long" ? "w-1.5" : "w-0.5",
          accent.bar,
        )}
        aria-hidden
      />
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-2xs leading-none font-semibold tracking-widest uppercase",
            accent.text,
          )}
        >
          {video.type}
        </span>
        <FormatBadge format={video.format} />
        {video.clipOf && (
          <span
            className="inline-flex items-center gap-1 text-2xs leading-none font-medium tracking-wide text-muted-foreground uppercase"
            title={
              video.format === "short"
                ? "Clipped from a long-form video"
                : "Expanded from a short"
            }
          >
            <Film className="size-3" aria-hidden />
            {video.format === "short" ? "Clip" : "From short"}
          </span>
        )}
        {video.doubleDownOf && (
          <span
            className="inline-flex items-center gap-1 text-2xs leading-none font-medium tracking-wide text-muted-foreground uppercase"
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
        // Stretched link: the whole card surface opens the workspace.
        className="mt-2 line-clamp-3 block text-sm leading-snug font-medium text-card-foreground after:absolute after:inset-0 focus-visible:underline focus-visible:outline-none"
      >
        {video.title}
      </Link>
      {(video.seriesName || video.scheduledDate || video.sceneCount > 0) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {video.sceneCount > 0 && (
            <span
              className="inline-flex items-center gap-1"
              title={`${video.sceneCount} scenes across ${video.shotTypeCount} shot types`}
            >
              <Clapperboard className="size-3" aria-hidden />
              {video.sceneCount} · {video.shotTypeCount}{" "}
              {video.shotTypeCount === 1 ? "shot type" : "shot types"}
            </span>
          )}
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

function CardMenu({
  video,
  onAction,
}: {
  video: BoardVideo;
  onAction: (action: CardAction) => void;
}) {
  const otherFormat: VideoFormat = video.format === "short" ? "long" : "short";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${video.title}`}
        // Keep the click from opening the workspace or lifting the card.
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
        onTouchStart={(e: React.TouchEvent) => e.stopPropagation()}
        onKeyDown={(e: React.KeyboardEvent) => e.stopPropagation()}
        className="absolute top-2 right-2 z-10 flex size-6 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 data-[popup-open]:bg-accent data-[popup-open]:opacity-100"
      >
        <Ellipsis className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <DropdownMenuItem onClick={() => onAction({ kind: "rename" })}>
          <PenLine aria-hidden /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction({ kind: "duplicate" })}>
          <Copy aria-hidden /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ArrowRight aria-hidden /> Move to
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {VIDEO_STATUSES.filter((s) => s !== video.status).map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => onAction({ kind: "move", status })}
              >
                {STATUS_LABELS[status]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem
          onClick={() => onAction({ kind: "format", format: otherFormat })}
        >
          <Film aria-hidden />
          {otherFormat === "long" ? "Make long-form" : "Make a short"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAction({ kind: "archive" })}>
          <Archive aria-hidden /> Archive
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onAction({ kind: "delete" })}
        >
          <Trash2 aria-hidden /> Delete…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SortableVideoCard({
  video,
  blockClicks,
  onAction,
}: {
  video: BoardVideo;
  /** True right after a drag — suppresses the post-drop click. */
  blockClicks?: () => boolean;
  onAction: (action: CardAction) => void;
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
      onClickCapture={(e) => {
        if (blockClicks?.()) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      className={cn(
        "group relative cursor-grab rounded-xl outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.985] motion-reduce:transition-none",
        isDragging && "opacity-40",
      )}
    >
      <VideoCardContent video={video} />
      <CardMenu video={video} onAction={onAction} />
    </div>
  );
}
