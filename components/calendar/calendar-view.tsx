"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarOff, ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { createVideo, scheduleVideo } from "@/lib/actions/videos";
import { cn } from "@/lib/utils";
import {
  VIDEO_TYPES,
  type VideoStatus,
  type VideoType,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { TypeBadge, TypeDot } from "@/components/pipeline/type-badge";

export type CalendarVideo = {
  id: string;
  title: string;
  type: VideoType;
  status: VideoStatus;
  scheduledDate: string | null;
};

export type CalendarRhythmSlot = {
  id: string;
  weekday: number;
  type: VideoType;
};

const STATUS_RANK: Record<VideoStatus, number> = {
  production: 0,
  scripted: 1,
  idea: 2,
  published: 3,
};

function iso(date: Date) {
  return format(date, "yyyy-MM-dd");
}

/* ── Draggable chip ─────────────────────────────────────────── */

function VideoChip({
  video,
  today,
  compact,
}: {
  video: CalendarVideo;
  today: string;
  compact?: boolean;
}) {
  const overdue =
    !!video.scheduledDate &&
    video.scheduledDate < today &&
    video.status !== "published";
  return (
    <span
      className={cn(
        "flex w-full min-w-0 items-center gap-1.5 rounded-lg bg-card px-2 py-1.5 text-xs shadow-card transition-shadow hover:shadow-card-hover",
        compact && "py-1",
        overdue && "text-destructive",
      )}
    >
      <TypeDot type={video.type} />
      {overdue && (
        <TriangleAlert className="size-3 shrink-0" aria-label="Overdue" />
      )}
      <span className="truncate font-medium">{video.title}</span>
    </span>
  );
}

function DraggableVideo({
  video,
  today,
  compact,
}: {
  video: CalendarVideo;
  today: string;
  compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: video.id,
  });
  const router = useRouter();
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) router.push(`/video/${video.id}`);
      }}
      className={cn(
        "cursor-grab rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isDragging && "opacity-40",
      )}
    >
      <VideoChip video={video} today={today} compact={compact} />
    </div>
  );
}

/* ── Day cell ───────────────────────────────────────────────── */

function DayCell({
  date,
  today,
  videos,
  ghosts,
  compact,
  outsideMonth,
  onPeek,
}: {
  date: Date;
  today: string;
  videos: CalendarVideo[];
  ghosts: CalendarRhythmSlot[];
  compact?: boolean;
  outsideMonth?: boolean;
  onPeek: (date: string) => void;
}) {
  const dateIso = iso(date);
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dateIso}` });
  const isToday = dateIso === today;
  const shown = compact ? videos.slice(0, 3) : videos;

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={() => onPeek(dateIso)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onPeek(dateIso);
      }}
      aria-label={`${format(date, "EEEE MMM d")}, ${videos.length} scheduled`}
      className={cn(
        "flex min-h-24 flex-col gap-1.5 rounded-xl bg-muted/40 p-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        compact ? "min-h-24" : "min-h-96",
        isToday && "bg-accent/60",
        isOver && "bg-accent",
        outsideMonth && "opacity-40",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between px-0.5",
          // Week view gets an external header row on large screens.
          !compact && "lg:hidden",
        )}
      >
        <span
          className={cn(
            "text-xs font-medium tabular-nums text-muted-foreground",
            isToday &&
              "flex size-5 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground",
          )}
        >
          {format(date, "d")}
        </span>
        {!compact && (
          <span className="text-xs text-muted-foreground/70">
            {format(date, "EEE")}
          </span>
        )}
      </div>
      {shown.map((video) => (
        <DraggableVideo
          key={video.id}
          video={video}
          today={today}
          compact={compact}
        />
      ))}
      {compact && videos.length > shown.length && (
        <span className="px-1 text-xs text-muted-foreground">
          +{videos.length - shown.length} more
        </span>
      )}
      {ghosts.map((slot) => (
        <span
          key={slot.id}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border border-dashed border-border/80 px-2 py-1 text-xs text-muted-foreground/70 capitalize",
            compact && "py-0.5",
          )}
        >
          <TypeDot type={slot.type} className="opacity-40" />
          {slot.type} due
        </span>
      ))}
    </div>
  );
}

/* ── Main view ──────────────────────────────────────────────── */

export function CalendarView({
  initialVideos,
  rhythmSlots,
}: {
  initialVideos: CalendarVideo[];
  rhythmSlots: CalendarRhythmSlot[];
}) {
  const router = useRouter();
  const [videos, setVideos] = React.useState(initialVideos);
  const [view, setView] = React.useState<"week" | "month">("week");
  const [anchor, setAnchor] = React.useState(() => new Date());
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [peekDate, setPeekDate] = React.useState<string | null>(null);
  const today = iso(new Date());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const days = React.useMemo(() => {
    if (view === "week") {
      const start = startOfWeek(anchor, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end: addDays(start, 6) });
    }
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }),
    });
  }, [view, anchor]);

  const byDate = React.useMemo(() => {
    const map = new Map<string, CalendarVideo[]>();
    for (const video of videos) {
      if (!video.scheduledDate) continue;
      const list = map.get(video.scheduledDate) ?? [];
      list.push(video);
      map.set(video.scheduledDate, list);
    }
    return map;
  }, [videos]);

  const tray = React.useMemo(
    () =>
      videos
        .filter((v) => !v.scheduledDate && v.status !== "published")
        .sort(
          (a, b) =>
            STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
            a.title.localeCompare(b.title),
        ),
    [videos],
  );

  const { setNodeRef: setTrayRef, isOver: trayOver } = useDroppable({
    id: "tray",
  });

  function ghostsFor(date: Date): CalendarRhythmSlot[] {
    const scheduled = byDate.get(iso(date)) ?? [];
    return rhythmSlots.filter(
      (slot) =>
        slot.weekday === date.getDay() &&
        !scheduled.some((v) => v.type === slot.type),
    );
  }

  function persistSchedule(id: string, scheduledDate: string | null) {
    const before = videos;
    setVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, scheduledDate } : v)),
    );
    void (async () => {
      try {
        const result = await scheduleVideo({ id, scheduledDate });
        if (!result.ok) throw new Error(result.error);
        router.refresh();
      } catch (error) {
        setVideos(before);
        toast.error(
          `Couldn't reschedule — ${error instanceof Error ? error.message : "try again"}`,
        );
      }
    })();
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const id = String(active.id);
    const video = videos.find((v) => v.id === id);
    if (!video) return;
    if (over.id === "tray") {
      if (video.scheduledDate !== null) persistSchedule(id, null);
      return;
    }
    const overId = String(over.id);
    if (overId.startsWith("day-")) {
      const date = overId.slice(4);
      if (video.scheduledDate !== date) persistSchedule(id, date);
    }
  }

  const rangeLabel =
    view === "week"
      ? `${format(days[0], "MMM d")} – ${format(days[6], "MMM d, yyyy")}`
      : format(anchor, "MMMM yyyy");

  const activeVideo = activeId
    ? (videos.find((v) => v.id === activeId) ?? null)
    : null;
  const peekVideos = peekDate ? (byDate.get(peekDate) ?? []) : [];

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-9xl flex-col gap-5 p-5 md:px-8 md:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            value={[view]}
            onValueChange={(values: unknown[]) =>
              setView((values[0] as "week" | "month" | undefined) ?? view)
            }
            variant="outline"
            size="sm"
            aria-label="Calendar view"
          >
            <ToggleGroupItem value="week">Week</ToggleGroupItem>
            <ToggleGroupItem value="month">Month</ToggleGroupItem>
          </ToggleGroup>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous"
              onClick={() =>
                setAnchor((a) =>
                  view === "week" ? addWeeks(a, -1) : addMonths(a, -1),
                )
              }
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAnchor(new Date())}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next"
              onClick={() =>
                setAnchor((a) =>
                  view === "week" ? addWeeks(a, 1) : addMonths(a, 1),
                )
              }
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <span className="text-sm font-medium tabular-nums text-muted-foreground">
            {rangeLabel}
          </span>
        </div>
      </div>

      <DndContext
        id="calendar"
        sensors={sensors}
        onDragStart={(e) => setActiveId(String(e.active.id))}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex flex-1 flex-col gap-5 lg:flex-row">
          <div className="min-w-0 flex-1">
            {view === "week" ? (
              <div className="flex flex-col gap-2">
                <div className="hidden grid-cols-7 gap-2 lg:grid">
                  {days.map((day) => {
                    const isToday = iso(day) === today;
                    return (
                      <div
                        key={iso(day)}
                        className={cn(
                          "flex items-baseline gap-1.5 px-2",
                          isToday ? "text-foreground" : "text-muted-foreground/70",
                        )}
                      >
                        <span className="text-xs font-semibold tracking-widest uppercase">
                          {format(day, "EEE")}
                        </span>
                        <span
                          className={cn(
                            "text-xs tabular-nums",
                            isToday && "font-semibold",
                          )}
                        >
                          {format(day, "d")}
                        </span>
                        {isToday && (
                          <span className="text-2xs font-medium tracking-wide text-muted-foreground uppercase">
                            Today
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {days.map((day) => (
                    <DayCell
                      key={iso(day)}
                      date={day}
                      today={today}
                      videos={byDate.get(iso(day)) ?? []}
                      ghosts={ghostsFor(day)}
                      onPeek={setPeekDate}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="hidden grid-cols-7 gap-2 lg:grid">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (d) => (
                      <span
                        key={d}
                        className="px-2 text-xs font-medium tracking-widest text-muted-foreground/70 uppercase"
                      >
                        {d}
                      </span>
                    ),
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {days.map((day) => (
                    <DayCell
                      key={iso(day)}
                      date={day}
                      today={today}
                      videos={byDate.get(iso(day)) ?? []}
                      ghosts={ghostsFor(day)}
                      compact
                      outsideMonth={!isSameMonth(day, anchor)}
                      onPeek={setPeekDate}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside
            ref={setTrayRef}
            aria-label="Unscheduled videos"
            className={cn(
              "flex w-full shrink-0 flex-col gap-2 rounded-2xl bg-muted/50 p-3 transition-colors lg:w-72",
              trayOver && "bg-accent",
            )}
          >
            <div className="flex items-center justify-between px-1 pb-1">
              <h2 className="text-sm font-medium">Unscheduled</h2>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground shadow-xs">
                {tray.length}
              </span>
            </div>
            {tray.map((video) => (
              <DraggableVideo key={video.id} video={video} today={today} />
            ))}
            {tray.length === 0 && (
              <p className="flex items-center gap-2 px-2 py-4 text-xs leading-relaxed text-muted-foreground/80">
                <CalendarOff className="size-3.5 shrink-0" aria-hidden />
                Everything&apos;s scheduled. Drag a card here to unschedule it.
              </p>
            )}
          </aside>
        </div>

        <DragOverlay>
          {activeVideo && (
            <div className="w-64">
              <VideoChip video={activeVideo} today={today} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <DayPeek
        date={peekDate}
        videos={peekVideos}
        rhythmSlots={rhythmSlots}
        onClose={() => setPeekDate(null)}
        onCreated={(video) => setVideos((prev) => [...prev, video])}
        today={today}
      />
    </div>
  );
}

/* ── Day peek ───────────────────────────────────────────────── */

function DayPeek({
  date,
  videos,
  rhythmSlots,
  onClose,
  onCreated,
  today,
}: {
  date: string | null;
  videos: CalendarVideo[];
  rhythmSlots: CalendarRhythmSlot[];
  onClose: () => void;
  onCreated: (video: CalendarVideo) => void;
  today: string;
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const parsed = date ? parseISO(date) : null;
  const defaultType =
    (parsed &&
      rhythmSlots.find((s) => s.weekday === parsed.getDay())?.type) ||
    "take";
  const [type, setType] = React.useState<VideoType>(defaultType);

  // Reset when the peek opens for a different day (render-adjust pattern).
  const [lastDate, setLastDate] = React.useState<string | null>(null);
  if (date !== lastDate) {
    setLastDate(date);
    setTitle("");
    setType(defaultType);
  }

  function add() {
    const trimmed = title.trim();
    if (!trimmed || !date) return;
    const id = crypto.randomUUID();
    onCreated({ id, title: trimmed, type, status: "idea", scheduledDate: date });
    setTitle("");
    void (async () => {
      try {
        const result = await createVideo({
          id,
          title: trimmed,
          type,
          scheduledDate: date,
        });
        if (!result.ok) throw new Error(result.error);
        router.refresh();
      } catch (error) {
        toast.error(
          `Couldn't add — ${error instanceof Error ? error.message : "try again"}`,
        );
      }
    })();
  }

  return (
    <Dialog open={!!date} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {parsed ? format(parsed, "EEEE, MMMM d") : ""}
          </DialogTitle>
          <DialogDescription>
            {videos.length === 0
              ? "Nothing scheduled — add something below."
              : `${videos.length} scheduled`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {videos.map((video) => (
            <Link
              key={video.id}
              href={`/video/${video.id}`}
              className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              <TypeBadge type={video.type} />
              <span className="min-w-0 flex-1 truncate font-medium">
                {video.title}
              </span>
              {date && date < today && video.status !== "published" && (
                <TriangleAlert
                  className="size-3.5 shrink-0 text-destructive"
                  aria-label="Overdue"
                />
              )}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Add to this day…"
            aria-label="New video title"
            className="h-8 flex-1 text-sm"
          />
          <Select
            value={type}
            onValueChange={(v) => setType(v as VideoType)}
          >
            <SelectTrigger size="sm" aria-label="Type" className="capitalize">
              {type}
            </SelectTrigger>
            <SelectContent>
              {VIDEO_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={add}>
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
