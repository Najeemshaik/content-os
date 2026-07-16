import { cn } from "@/lib/utils";
import type { VideoType } from "@/lib/types";

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
