import { cn } from "@/lib/utils";
import type { VideoType } from "@/lib/types";

const STYLES: Record<VideoType, string> = {
  take: "border-take/25 bg-take/10 text-take",
  teach: "border-teach/25 bg-teach/10 text-teach",
  story: "border-story/25 bg-story/10 text-story",
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
        "inline-flex shrink-0 items-center rounded-sm border px-1.5 py-0.5 text-xs font-medium capitalize leading-none",
        STYLES[type],
        className,
      )}
    >
      {type}
    </span>
  );
}
