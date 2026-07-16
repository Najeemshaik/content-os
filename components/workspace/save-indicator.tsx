"use client";

import { cn } from "@/lib/utils";

export type SaveState = "saved" | "saving" | "error";

const LABELS: Record<SaveState, string> = {
  saved: "Saved",
  saving: "Saving…",
  error: "Not saved",
};

export function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs transition-colors",
        state === "error" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          state === "saved" && "bg-muted-foreground/50",
          state === "saving" && "animate-pulse bg-teach",
          state === "error" && "bg-destructive",
        )}
        aria-hidden
      />
      {LABELS[state]}
    </span>
  );
}
