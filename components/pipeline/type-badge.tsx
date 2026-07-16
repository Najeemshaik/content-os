import { cn } from "@/lib/utils";
import type { VideoFormat, VideoType } from "@/lib/types";

const STYLES: Record<VideoType, { chip: string; dot: string }> = {
  take: { chip: "bg-take/8 text-take border-take/15", dot: "bg-take" },
  teach: { chip: "bg-teach/8 text-teach border-teach/15", dot: "bg-teach" },
  story: { chip: "bg-story/8 text-story border-story/15", dot: "bg-story" },
};

export function TypeBadge({
  type,
  className,
}: {
  type: VideoType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium capitalize leading-none",
        STYLES[type].chip,
        className,
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", STYLES[type].dot)}
        aria-hidden
      />
      {type}
    </span>
  );
}

/** Marks long-form content wherever a card appears; shorts (the default
 *  world) stay unmarked so the exception is what catches the eye. */
export function FormatBadge({
  format,
  className,
}: {
  format: VideoFormat;
  className?: string;
}) {
  if (format !== "long") return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm bg-foreground/85 px-1 py-px text-2xs leading-none font-semibold tracking-widest text-background uppercase",
        className,
      )}
    >
      Long
    </span>
  );
}

export function TypeDot({
  type,
  className,
}: {
  type: VideoType;
  className?: string;
}) {
  return (
    <span
      className={cn("size-2 shrink-0 rounded-full", STYLES[type].dot, className)}
      aria-label={type}
    />
  );
}
