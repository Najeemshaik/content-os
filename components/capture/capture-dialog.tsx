"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Shuffle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createVideo } from "@/lib/actions/videos";
import { VIDEO_TYPES, type VideoType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { TypeDot } from "@/components/pipeline/type-badge";
import { generateSparks, type Spark } from "./spark";

export function CaptureDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<VideoType>("take");
  const [sparksOpen, setSparksOpen] = React.useState(false);
  const [sparks, setSparks] = React.useState<Spark[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Reset when the palette opens (render-adjust pattern).
  const [wasOpen, setWasOpen] = React.useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle("");
      setSparksOpen(false);
    }
  }

  function cycleType(direction: 1 | -1) {
    setType((current) => {
      const index = VIDEO_TYPES.indexOf(current);
      return VIDEO_TYPES[
        (index + direction + VIDEO_TYPES.length) % VIDEO_TYPES.length
      ];
    });
  }

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const id = crypto.randomUUID();
    const captured = type;
    onOpenChange(false);
    void (async () => {
      try {
        const result = await createVideo({ id, title: trimmed, type: captured });
        if (!result.ok) throw new Error(result.error);
        toast.success("Captured to Ideas", {
          action: { label: "Open", onClick: () => router.push(`/video/${id}`) },
        });
        router.refresh();
      } catch (error) {
        toast.error(
          `Couldn't capture — ${error instanceof Error ? error.message : "try again"}`,
        );
      }
    })();
  }

  function toggleSparks() {
    setSparksOpen((prev) => {
      if (!prev) setSparks(generateSparks());
      return !prev;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[20%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Quick capture</DialogTitle>
        <DialogDescription className="sr-only">
          Type an idea, arrow keys switch the type, Enter saves to Ideas.
        </DialogDescription>
        <div className="flex items-center gap-2 border-b px-4">
          <Input
            ref={inputRef}
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              else if (e.key === "ArrowRight" && title === "") cycleType(1);
              else if (e.key === "ArrowLeft" && title === "") cycleType(-1);
              else if (e.key === "ArrowDown") cycleType(1);
              else if (e.key === "ArrowUp") cycleType(-1);
            }}
            placeholder="What's the idea?"
            aria-label="Idea title"
            className="h-13 flex-1 border-0 bg-transparent px-0 !text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSparks}
            aria-pressed={sparksOpen}
            className={cn(
              "gap-1.5 text-muted-foreground",
              sparksOpen && "bg-accent text-foreground",
            )}
          >
            <Sparkles className="size-3.5" aria-hidden />
            Spark
          </Button>
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <div
            role="radiogroup"
            aria-label="Type"
            className="flex items-center gap-1"
          >
            {VIDEO_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => {
                  setType(t);
                  inputRef.current?.focus();
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-1 text-xs font-medium text-muted-foreground capitalize transition-colors hover:text-foreground",
                  type === t && "border-border bg-card text-foreground shadow-xs",
                )}
              >
                <TypeDot type={t} className={type === t ? "" : "opacity-40"} />
                {t}
              </button>
            ))}
          </div>
          <p className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            <Kbd>↑↓</Kbd> type · <Kbd>↵</Kbd> capture
          </p>
        </div>

        {sparksOpen && (
          <div className="border-t bg-muted/40 px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                Title starters
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-xs text-muted-foreground"
                onClick={() => setSparks(generateSparks())}
              >
                <Shuffle className="size-3" aria-hidden />
                Shuffle
              </Button>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-3">
              {sparks.map((spark) => (
                <button
                  key={spark.text}
                  type="button"
                  onClick={() => {
                    setTitle(spark.text);
                    setType(spark.type);
                    inputRef.current?.focus();
                  }}
                  className="flex items-start gap-1.5 rounded-lg border bg-card px-2.5 py-2 text-left text-xs leading-snug transition-colors hover:bg-accent"
                >
                  <TypeDot type={spark.type} className="mt-0.5" />
                  {spark.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
