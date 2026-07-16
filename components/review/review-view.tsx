"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Flame, GitBranch } from "lucide-react";
import { toast } from "sonner";
import { doubleDown, updateVideo } from "@/lib/actions/videos";
import type { VideoType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/app-shell/page-header";
import { TypeBadge } from "@/components/pipeline/type-badge";

export type ReviewVideo = {
  id: string;
  title: string;
  type: VideoType;
  publishedAt: number | null;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  flagged: boolean;
};

export type TypeHealth = {
  type: VideoType;
  metric: string;
  average: number | null;
};

const METRICS = ["views", "likes", "comments", "saves", "shares"] as const;
type Metric = (typeof METRICS)[number];

const numberFormat = new Intl.NumberFormat("en");

function MetricInput({
  video,
  metric,
  onSaved,
}: {
  video: ReviewVideo;
  metric: Metric;
  onSaved: () => void;
}) {
  const [value, setValue] = React.useState(String(video[metric]));
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  function commit(raw: string) {
    setValue(raw);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const parsed = Math.max(0, Math.floor(Number(raw) || 0));
      try {
        const result = await updateVideo({ id: video.id, [metric]: parsed });
        if (!result.ok) throw new Error(result.error);
        onSaved();
      } catch (error) {
        setValue(String(video[metric]));
        toast.error(
          `Couldn't save ${metric} — ${error instanceof Error ? error.message : "try again"}`,
        );
      }
    }, 600);
  }

  return (
    <Input
      type="number"
      min={0}
      value={value}
      onChange={(e) => commit(e.target.value)}
      aria-label={`${metric} for ${video.title}`}
      className="h-7 w-20 border-transparent bg-transparent px-1.5 text-right text-sm tabular-nums shadow-none hover:border-input focus-visible:border-input dark:bg-transparent"
    />
  );
}

export function ReviewView({
  videos,
  average,
  windowSize,
  health,
}: {
  videos: ReviewVideo[];
  average: number | null;
  windowSize: number;
  health: TypeHealth[];
}) {
  const router = useRouter();
  const [ddTarget, setDdTarget] = React.useState<ReviewVideo | null>(null);

  return (
    <div className="flex min-h-svh flex-col gap-5 p-5 md:px-8 md:py-6">
      <PageHeader
        title="Review"
        description="Log metrics after publishing — the app flags anything doing 5× your rolling average."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Rolling avg views · last {windowSize}
          </p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">
            {average != null ? numberFormat.format(Math.round(average)) : "—"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {average != null
              ? `5× threshold: ${numberFormat.format(Math.round(average * 5))}`
              : "needs 3+ published videos"}
          </p>
        </div>
        {health.map((h) => (
          <div key={h.type} className="rounded-2xl bg-card p-4 shadow-card">
            <p className="flex items-center gap-1.5 text-xs font-medium tracking-widest text-muted-foreground uppercase">
              <TypeBadge type={h.type} className="normal-case" />
              avg {h.metric}
            </p>
            <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">
              {h.average != null
                ? numberFormat.format(Math.round(h.average))
                : "—"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              health metric for {h.type}s
            </p>
          </div>
        ))}
      </div>

      {videos.length === 0 ? (
        <p className="rounded-2xl bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">
          Nothing published yet — metrics land here once you mark a video
          published.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Video</TableHead>
                <TableHead>Published</TableHead>
                {METRICS.map((m) => (
                  <TableHead key={m} className="text-right capitalize">
                    {m}
                  </TableHead>
                ))}
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.map((video) => (
                <TableRow
                  key={video.id}
                  className={cn(video.flagged && "bg-flag/4")}
                >
                  <TableCell>
                    {video.flagged && (
                      <Flame
                        className="size-4 text-flag"
                        fill="currentColor"
                        aria-label="5× outlier"
                      />
                    )}
                  </TableCell>
                  <TableCell className="max-w-64">
                    <Link
                      href={`/video/${video.id}`}
                      className="flex items-center gap-2 font-medium hover:underline"
                    >
                      <TypeBadge type={video.type} />
                      <span className="truncate">{video.title}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                    {video.publishedAt
                      ? format(video.publishedAt, "MMM d, yyyy")
                      : "—"}
                  </TableCell>
                  {METRICS.map((metric) => (
                    <TableCell key={metric} className="text-right">
                      <MetricInput
                        video={video}
                        metric={metric}
                        onSaved={() => router.refresh()}
                      />
                    </TableCell>
                  ))}
                  <TableCell>
                    {video.flagged && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 whitespace-nowrap"
                        onClick={() => setDdTarget(video)}
                      >
                        <GitBranch className="size-3.5" aria-hidden />
                        Double down
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DoubleDownDialog target={ddTarget} onClose={() => setDdTarget(null)} />
    </div>
  );
}

/* ── Double-down dialog ─────────────────────────────────────── */

const VARIATIONS = [
  {
    key: "hook",
    label: "Change the hook",
    hint: "Same value, same format — new first three seconds.",
  },
  {
    key: "value",
    label: "Change the value",
    hint: "Same hook style and format — different core point.",
  },
  {
    key: "format",
    label: "Change the format",
    hint: "Same hook and value — deliver it a different way.",
  },
] as const;

function DoubleDownDialog({
  target,
  onClose,
}: {
  target: ReviewVideo | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [variation, setVariation] = React.useState<string>("hook");
  const [notes, setNotes] = React.useState("");
  const [creating, startCreating] = React.useTransition();

  // Reset when a new target opens the dialog (render-adjust pattern).
  const [lastTargetId, setLastTargetId] = React.useState<string | null>(null);
  if ((target?.id ?? null) !== lastTargetId) {
    setLastTargetId(target?.id ?? null);
    if (target) {
      setVariation("hook");
      setNotes("");
    }
  }

  function create() {
    if (!target) return;
    const chosen = VARIATIONS.find((v) => v.key === variation);
    const plan = [
      `Double-down of “${target.title}” (${new Intl.NumberFormat("en").format(target.views)} views).`,
      `Keep: everything that worked.`,
      `Change: ${chosen?.label.toLowerCase() ?? variation}. ${chosen?.hint ?? ""}`,
      notes.trim() && `Plan: ${notes.trim()}`,
    ]
      .filter(Boolean)
      .join("\n");
    startCreating(async () => {
      try {
        const result = await doubleDown({ id: target.id, plan });
        if (!result.ok) throw new Error(result.error);
        toast.success("DD card created in Ideas", {
          action: result.data
            ? {
                label: "Open",
                onClick: () => router.push(`/video/${result.data!.id}`),
              }
            : undefined,
        });
        onClose();
        router.refresh();
      } catch (error) {
        toast.error(
          `Couldn't create — ${error instanceof Error ? error.message : "try again"}`,
        );
      }
    });
  }

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="size-4 text-flag" fill="currentColor" aria-hidden />
            Double down
          </DialogTitle>
          <DialogDescription>
            Same components, one variable changed. What changes in the variant?
          </DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label="Variation" className="grid gap-2">
          {VARIATIONS.map((v) => (
            <button
              key={v.key}
              type="button"
              role="radio"
              aria-checked={variation === v.key}
              onClick={() => setVariation(v.key)}
              className={cn(
                "rounded-xl border px-3.5 py-2.5 text-left transition-colors hover:bg-accent",
                variation === v.key && "border-ring/50 bg-accent",
              )}
            >
              <span className="text-sm font-medium">{v.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {v.hint}
              </span>
            </button>
          ))}
        </div>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional: sketch the variation…"
          rows={2}
          className="text-sm"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={create} disabled={creating}>
            Create DD card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
