"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    <div className="mb-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="New idea…"
          aria-label="New idea title"
          className="h-8 flex-1 text-sm"
        />
        <Select
          value={type}
          onValueChange={(value) => setType(value as VideoType)}
        >
          <SelectTrigger size="sm" aria-label="Idea type">
            <SelectValue />
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
          className="inline-flex w-fit items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {format(parseISO(scheduledDate), "EEE MMM d")}
          <X className="size-3" aria-label="Clear date" />
        </button>
      )}
    </div>
  );
}
