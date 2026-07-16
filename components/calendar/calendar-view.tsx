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
import {
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Plus,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { createVideo, scheduleVideo } from "@/lib/actions/videos";
import { cn } from "@/lib/utils";
import {
  VIDEO_FORMATS,
  VIDEO_TYPES,
  type VideoFormat,
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
  format: VideoFormat;
  status: VideoStatus;
  scheduledDate: string | null;
};

type FormatFilter = "all" | VideoFormat;

const FORMAT_FILTER_LABELS: Record<FormatFilter, string> = {
  all: "All",
  short: "Shorts",
  long: "Long",
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

const ACCENTS: Record<VideoType, { bar: string; text: string }> = {
  take: { bar: "bg-take", text: "text-take" },
  teach: { bar: "bg-teach", text: "text-teach" },
  story: { bar: "bg-story", text: "text-story" },
};

function iso(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function isOverdue(video: CalendarVideo, today: string) {
  return (
    !!video.scheduledDate &&
    video.scheduledDate < today &&
    video.status !== "published"
  );
}

/* ── Chips (draggable) ──────────────────────────────────────── */

function WeekChip({
  video,
  today,
}: {
  video: CalendarVideo;
  today: string;
}) {
  const overdue = isOverdue(video, today);
  const accent = ACCENTS[video.type];
  return (
    <div className="relative overflow-hidden rounded-lg bg-card py-2 pr-2.5 pl-3 shadow-card transition-shadow hover:shadow-card-hover">
      <span
        className={cn("absolute inset-y-0 left-0 w-0.5", accent.bar)}
        aria-hidden
      />
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "text-2xs leading-none font-semibold tracking-widest uppercase",
            accent.text,
          )}
        >
          {video.type}
        </span>
        {video.format === "long" && (
          <span className="rounded-sm bg-muted px-1 py-px text-2xs leading-none font-semibold tracking-widest text-muted-foreground uppercase">
            Long
          </span>
        )}
        {overdue && (
          <span className="inline-flex items-center gap-1 text-2xs leading-none font-medium text-destructive">
            <TriangleAlert className="size-3" aria-hidden />
            overdue
          </span>
        )}
      </div>
      <p className="mt-1 line-clamp-2 text-xs leading-snug font-medium">
        {video.title}
      </p>
    </div>
  );
}

function MonthChip({
  video,
  today,
}: {
  video: CalendarVideo;
  today: string;
}) {
  const overdue = isOverdue(video, today);
  return (
    <span
      className={cn(
        "flex w-full min-w-0 items-center gap-1.5 rounded-md bg-card px-1.5 py-1 text-xs shadow-card",
        overdue && "text-destructive",
      )}
    >
      <TypeDot type={video.type} className="size-1.5" />
      {video.format === "long" && (
        <span
          className="shrink-0 text-2xs leading-none font-semibold tracking-widest text-muted-foreground uppercase"
          aria-label="Long-form"
        >
          L
        </span>
      )}
      {overdue && (
        <TriangleAlert className="size-3 shrink-0" aria-label="Overdue" />
      )}
      {/* Cells are ~48px wide on phones — the dot row carries the info. */}
      <span className="hidden truncate font-medium lg:inline">
        {video.title}
      </span>
    </span>
  );
}

function DraggableVideo({
  video,
  today,
  variant,
}: {
  video: CalendarVideo;
  today: string;
  variant: "week" | "month";
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
      {variant === "week" ? (
        <WeekChip video={video} today={today} />
      ) : (
        <MonthChip video={video} today={today} />
      )}
    </div>
  );
}

function GhostSlot({
  slot,
  compact,
  className,
}: {
  slot: CalendarRhythmSlot;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 rounded-lg border border-dashed border-border/80 px-2.5 text-xs text-muted-foreground/70 capitalize",
        compact ? "py-0.5" : "py-1.5",
        className,
      )}
    >
      <TypeDot type={slot.type} className="size-1.5 opacity-50" />
      {slot.type} due
    </span>
  );
}

/* ── Week day column ────────────────────────────────────────── */

function WeekDayColumn({
  date,
  today,
  videos,
  ghosts,
  onPeek,
}: {
  date: Date;
  today: string;
  videos: CalendarVideo[];
  ghosts: CalendarRhythmSlot[];
  onPeek: (date: string) => void;
}) {
  const dateIso = iso(date);
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dateIso}` });
  const isToday = dateIso === today;

  return (
    <section
      aria-label={`${format(date, "EEEE MMM d")}, ${videos.length} scheduled`}
      className={cn(
        "group flex min-h-20 min-w-0 flex-col rounded-2xl bg-muted/50 transition-colors lg:min-h-40",
        isToday && "bg-accent/70",
        isOver && "bg-accent",
      )}
    >
      <header className="flex items-baseline gap-1.5 px-3 pt-3 pb-2">
        <span
          className={cn(
            "text-xs font-semibold tracking-widest uppercase",
            isToday ? "text-foreground" : "text-muted-foreground/70",
          )}
        >
          {format(date, "EEE")}
        </span>
        <span
          className={cn(
            "text-xs tabular-nums",
            isToday
              ? "font-semibold text-foreground"
              : "text-muted-foreground/70",
          )}
        >
          {format(date, "d")}
        </span>
        {isToday && (
          <span className="ms-auto rounded-full bg-primary px-1.5 py-0.5 text-2xs leading-none font-semibold tracking-wide text-primary-foreground uppercase">
            Today
          </span>
        )}
      </header>
      <div
        ref={setNodeRef}
        role="button"
        tabIndex={0}
        aria-label={`Open ${format(date, "EEEE MMM d")}`}
        onClick={() => onPeek(dateIso)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onPeek(dateIso);
        }}
        className="flex min-h-0 flex-1 cursor-default flex-col gap-1.5 px-2 pb-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {videos.map((video) => (
          <DraggableVideo
            key={video.id}
            video={video}
            today={today}
            variant="week"
          />
        ))}
        {ghosts.map((slot) => (
          <GhostSlot key={slot.id} slot={slot} />
        ))}
        {/* Touch screens have no hover — keep the affordance faintly visible. */}
        <span className="flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs text-muted-foreground opacity-50 transition-opacity lg:opacity-0 lg:group-hover:opacity-70">
          <Plus className="size-3" aria-hidden />
          Add
        </span>
      </div>
    </section>
  );
}

/* ── Month day cell ─────────────────────────────────────────── */

function MonthDayCell({
  date,
  today,
  videos,
  ghosts,
  outsideMonth,
  onPeek,
}: {
  date: Date;
  today: string;
  videos: CalendarVideo[];
  ghosts: CalendarRhythmSlot[];
  outsideMonth: boolean;
  onPeek: (date: string) => void;
}) {
  const dateIso = iso(date);
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dateIso}` });
  const isToday = dateIso === today;
  const shown = videos.slice(0, 3);

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
        "flex min-h-16 flex-col gap-0.5 rounded-lg bg-muted/50 p-1 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring lg:min-h-28 lg:gap-1 lg:rounded-xl lg:p-1.5",
        isToday && "bg-accent/70",
        isOver && "bg-accent",
        outsideMonth && "opacity-40",
      )}
    >
      <span
        className={cn(
          "px-0.5 text-xs font-medium tabular-nums text-muted-foreground lg:px-1",
          isToday &&
            "flex size-5 items-center justify-center rounded-full bg-primary px-0 font-semibold text-primary-foreground",
        )}
      >
        {format(date, "d")}
      </span>
      {shown.map((video) => (
        <DraggableVideo
          key={video.id}
          video={video}
          today={today}
          variant="month"
        />
      ))}
      {videos.length > shown.length && (
        <span className="px-0.5 text-2xs text-muted-foreground lg:px-1.5 lg:text-xs">
          +{videos.length - shown.length}
          <span className="hidden lg:inline"> more</span>
        </span>
      )}
      {ghosts.map((slot) => (
        <GhostSlot key={slot.id} slot={slot} compact className="hidden lg:flex" />
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
  const [formatFilter, setFormatFilter] = React.useState<FormatFilter>("all");
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
      if (formatFilter !== "all" && video.format !== formatFilter) continue;
      const list = map.get(video.scheduledDate) ?? [];
      list.push(video);
      map.set(video.scheduledDate, list);
    }
    return map;
  }, [videos, formatFilter]);

  const tray = React.useMemo(
    () =>
      videos
        .filter(
          (v) =>
            !v.scheduledDate &&
            v.status !== "published" &&
            (formatFilter === "all" || v.format === formatFilter),
        )
        .sort(
          (a, b) =>
            STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
            a.title.localeCompare(b.title),
        ),
    [videos, formatFilter],
  );

  const { setNodeRef: setTrayRef, isOver: trayOver } = useDroppable({
    id: "tray",
  });

  function ghostsFor(date: Date): CalendarRhythmSlot[] {
    // The rhythm is a short-form cadence: ghosts hide on the Long filter, and
    // only a scheduled short satisfies a slot (regardless of active filter).
    if (formatFilter === "long") return [];
    const dateIso = iso(date);
    return rhythmSlots.filter(
      (slot) =>
        slot.weekday === date.getDay() &&
        !videos.some(
          (v) =>
            v.scheduledDate === dateIso &&
            v.format === "short" &&
            v.type === slot.type,
        ),
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
    <div className="mx-auto flex min-h-svh w-full max-w-9xl flex-col gap-5 p-5 md:h-svh md:px-8 md:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            value={[formatFilter]}
            onValueChange={(values: unknown[]) =>
              setFormatFilter((values[0] as FormatFilter | undefined) ?? "all")
            }
            variant="outline"
            size="sm"
            spacing={0}
            aria-label="Format"
          >
            {(["all", ...VIDEO_FORMATS] as FormatFilter[]).map((f) => (
              <ToggleGroupItem key={f} value={f}>
                {FORMAT_FILTER_LABELS[f]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ToggleGroup
            value={[view]}
            onValueChange={(values: unknown[]) =>
              setView((values[0] as "week" | "month" | undefined) ?? view)
            }
            variant="outline"
            size="sm"
            spacing={0}
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
        <div className="flex flex-1 flex-col gap-4 md:min-h-0 lg:flex-row">
          {view === "week" ? (
            // Phones get a vertical agenda; the 7-column planner starts at lg.
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-4 lg:grid-cols-7 lg:overflow-y-auto">
              {days.map((day) => (
                <WeekDayColumn
                  key={iso(day)}
                  date={day}
                  today={today}
                  videos={byDate.get(iso(day)) ?? []}
                  ghosts={ghostsFor(day)}
                  onPeek={setPeekDate}
                />
              ))}
            </div>
          ) : (
            <div className="min-h-0 flex-1 lg:overflow-y-auto">
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-7 gap-1 lg:gap-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (d) => (
                      <span
                        key={d}
                        className="px-1 text-center text-2xs font-semibold tracking-widest text-muted-foreground/70 uppercase lg:px-2 lg:text-left lg:text-xs"
                      >
                        <span className="lg:hidden">{d.slice(0, 1)}</span>
                        <span className="hidden lg:inline">{d}</span>
                      </span>
                    ),
                  )}
                </div>
                <div className="grid grid-cols-7 gap-1 lg:gap-2">
                  {days.map((day) => (
                    <MonthDayCell
                      key={iso(day)}
                      date={day}
                      today={today}
                      videos={byDate.get(iso(day)) ?? []}
                      ghosts={ghostsFor(day)}
                      outsideMonth={!isSameMonth(day, anchor)}
                      onPeek={setPeekDate}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <aside
            aria-label="Unscheduled videos"
            className={cn(
              "flex w-full shrink-0 flex-col rounded-2xl bg-muted/50 transition-colors lg:h-full lg:min-h-0 lg:w-72",
              trayOver && "bg-accent",
            )}
          >
            <header className="flex items-center justify-between px-4 pt-3.5 pb-2">
              <h2 className="text-sm font-semibold tracking-tight">
                Unscheduled
              </h2>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground shadow-xs">
                {tray.length}
              </span>
            </header>
            <div
              ref={setTrayRef}
              className="flex min-h-24 flex-1 flex-col gap-1.5 px-2 pb-2 lg:min-h-0 lg:overflow-y-auto"
            >
              {tray.map((video) => (
                <DraggableVideo
                  key={video.id}
                  video={video}
                  today={today}
                  variant="week"
                />
              ))}
              {tray.length === 0 && (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/70 px-4 py-8 text-center">
                  <CalendarOff
                    className="size-4 text-muted-foreground/40"
                    aria-hidden
                  />
                  <p className="text-xs leading-relaxed text-muted-foreground/80">
                    Everything&apos;s scheduled. Drag a card here to
                    unschedule it.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>

        <DragOverlay>
          {activeVideo && (
            <div className="w-60">
              <WeekChip video={activeVideo} today={today} />
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
  const [addFormat, setAddFormat] = React.useState<VideoFormat>("short");

  // Reset when the peek opens for a different day (render-adjust pattern).
  const [lastDate, setLastDate] = React.useState<string | null>(null);
  if (date !== lastDate) {
    setLastDate(date);
    setTitle("");
    setType(defaultType);
    setAddFormat("short");
  }

  function add() {
    const trimmed = title.trim();
    if (!trimmed || !date) return;
    const id = crypto.randomUUID();
    onCreated({
      id,
      title: trimmed,
      type,
      format: addFormat,
      status: "idea",
      scheduledDate: date,
    });
    setTitle("");
    void (async () => {
      try {
        const result = await createVideo({
          id,
          title: trimmed,
          type,
          format: addFormat,
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
          <Select
            value={addFormat}
            onValueChange={(v) => setAddFormat(v as VideoFormat)}
          >
            <SelectTrigger size="sm" aria-label="Format">
              {addFormat === "short" ? "Short" : "Long"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="short">Short</SelectItem>
              <SelectItem value="long">Long</SelectItem>
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
