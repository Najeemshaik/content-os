"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addNextEpisode, deleteSeries } from "@/lib/actions/series";
import type { Series } from "@/lib/db/schema";
import type { VideoStatus, VideoType } from "@/lib/types";
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
import { TypeBadge } from "@/components/pipeline/type-badge";
import { SeriesFormDialog } from "./series-form";

export type Episode = {
  id: string;
  title: string;
  type: VideoType;
  status: VideoStatus;
  episodeNumber: number | null;
};

const STAGE_STYLES: Record<VideoStatus, string> = {
  idea: "border-border bg-muted/60 text-muted-foreground",
  scripted: "border-teach/20 bg-teach/8 text-teach",
  production: "border-flag/25 bg-flag/8 text-flag",
  published: "border-story/20 bg-story/8 text-story",
};

export function SeriesDetail({
  series,
  episodes,
}: {
  series: Series;
  episodes: Episode[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [adding, startAdding] = React.useTransition();

  const publishedCount = episodes.filter((e) => e.status === "published").length;
  const nextNumber =
    Math.max(0, ...episodes.map((e) => e.episodeNumber ?? 0)) + 1;

  function addEpisode() {
    startAdding(async () => {
      try {
        const result = await addNextEpisode({ seriesId: series.id });
        if (!result.ok) throw new Error(result.error);
        toast.success(`Episode ${result.data?.episodeNumber} added to Ideas`, {
          action: result.data
            ? {
                label: "Open",
                onClick: () => router.push(`/video/${result.data!.id}`),
              }
            : undefined,
        });
        router.refresh();
      } catch (error) {
        toast.error(
          `Couldn't add episode — ${error instanceof Error ? error.message : "try again"}`,
        );
      }
    });
  }

  async function remove() {
    setDeleteOpen(false);
    try {
      const result = await deleteSeries({ id: series.id });
      if (!result.ok) throw new Error(result.error);
      toast.success("Series deleted — episodes kept as standalone videos");
      router.push("/series");
    } catch (error) {
      toast.error(
        `Couldn't delete — ${error instanceof Error ? error.message : "try again"}`,
      );
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-5 md:px-8 md:py-6">
      <Link
        href="/series"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Series
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{series.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="capitalize">{series.type}</span> ·{" "}
            <span className="capitalize">{series.status}</span> ·{" "}
            <span className="tabular-nums">
              {publishedCount} published
              {series.targetEpisodes && ` / ${series.targetEpisodes} target`}
            </span>
          </p>
          {series.description && (
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
              {series.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit series"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete series"
            className="hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium tracking-widest text-muted-foreground/80 uppercase">
          Episode roadmap
        </h2>
        {episodes.length === 0 && (
          <p className="rounded-2xl bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
            No episodes yet — add episode 1 below.
          </p>
        )}
        {episodes.map((episode) => (
          <Link
            key={episode.id}
            href={`/video/${episode.id}`}
            className="flex items-center gap-3 rounded-xl bg-card px-3.5 py-2.5 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
              {episode.episodeNumber ?? "–"}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {episode.title}
            </span>
            <TypeBadge type={episode.type} />
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                STAGE_STYLES[episode.status],
              )}
            >
              {episode.status}
            </span>
          </Link>
        ))}
        <Button
          variant="outline"
          className="mt-1 gap-1.5 border-dashed"
          onClick={addEpisode}
          disabled={adding}
        >
          <Plus className="size-4" aria-hidden />
          Add episode {nextNumber}
        </Button>
      </section>

      <SeriesFormDialog
        series={series}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete “{series.name}”?</DialogTitle>
            <DialogDescription>
              Episodes stay in the pipeline as standalone videos — only the
              series grouping is removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove}>
              Delete series
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
