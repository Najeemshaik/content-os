"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { TypeDot } from "./type-badge";
import { VIDEO_TYPES, type VideoType } from "@/lib/types";

export type QuickAddPreset = { type?: VideoType; scheduledDate?: string };

export type QuickAddHandle = {
  focusWith: (preset?: QuickAddPreset) => void;
};

export function QuickAdd({
  ref,
  onAdd,
}: {
  ref?: React.Ref<QuickAddHandle>;
  onAdd: (input: {
    title: string;
    type: VideoType;
    scheduledDate?: string;
  }) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<VideoType>("take");
  const [scheduledDate, setScheduledDate] = React.useState<string | null>(null);
  const [focused, setFocused] = React.useState(false);

  React.useImperativeHandle(ref, () => ({
    focusWith: (preset) => {
      if (preset?.type) setType(preset.type);
      setScheduledDate(preset?.scheduledDate ?? null);
      inputRef.current?.focus();
    },
  }));

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd({ title: trimmed, type, scheduledDate: scheduledDate ?? undefined });
    setTitle("");
    setScheduledDate(null);
    inputRef.current?.focus();
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-xl border border-dashed border-border/80 px-2.5 py-1.5 transition-all",
        focused && "border-solid border-transparent bg-card shadow-card",
      )}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
    >
      <div className="flex items-center gap-1.5">
        <Plus
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground/60 transition-colors",
            focused && "text-muted-foreground",
          )}
          aria-hidden
        />
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="New idea…"
          aria-label="New idea title"
          className="h-7 flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        <Select
          value={type}
          onValueChange={(value) => setType(value as VideoType)}
        >
          <SelectTrigger
            size="sm"
            aria-label="Idea type"
            className={cn(
              "h-6 gap-1 border-0 bg-transparent px-1.5 text-xs capitalize shadow-none dark:bg-transparent",
              !focused && "text-muted-foreground",
            )}
          >
            <TypeDot type={type} />
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
      </div>
      {scheduledDate && (
        <button
          type="button"
          onClick={() => setScheduledDate(null)}
          className="ml-5 inline-flex w-fit items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {format(parseISO(scheduledDate), "EEE MMM d")}
          <X className="size-3" aria-label="Clear date" />
        </button>
      )}
    </div>
  );
}
