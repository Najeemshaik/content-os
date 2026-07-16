"use client";

import * as React from "react";
import Link from "next/link";
import { ListVideo, Plus } from "lucide-react";
import type { Series } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell/page-header";
import { SeriesFormDialog } from "./series-form";

export type SeriesWithProgress = Series & {
  episodeCount: number;
  publishedCount: number;
};

const STATUS_STYLES: Record<Series["status"], string> = {
  active: "border-teach/20 bg-teach/8 text-teach",
  done: "border-border bg-muted/60 text-muted-foreground",
  paused: "border-flag/25 bg-flag/8 text-flag",
};

export function SeriesList({ series }: { series: SeriesWithProgress[] }) {
  const [formOpen, setFormOpen] = React.useState(false);

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-5 p-5 md:px-8 md:py-6">
      <PageHeader
        title="Series"
        description="Planned sequences of related episodes."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setFormOpen(true)}>
            <Plus className="size-3.5" aria-hidden />
            New series
          </Button>
        }
      />

      {series.length === 0 ? (
        <p className="rounded-2xl bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">
          Start a series to plan daily, progress, or lesson episodes.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {series.map((s) => {
            const progress = s.targetEpisodes
              ? Math.min(1, s.publishedCount / s.targetEpisodes)
              : null;
            return (
              <Link
                key={s.id}
                href={`/series/${s.id}`}
                className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
                      <ListVideo
                        className="size-4 text-muted-foreground"
                        aria-hidden
                      />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold tracking-tight">
                        {s.name}
                      </h3>
                      <p className="text-xs text-muted-foreground capitalize">
                        {s.type}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                      STATUS_STYLES[s.status],
                    )}
                  >
                    {s.status}
                  </span>
                </div>
                {s.description && (
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {s.description}
                  </p>
                )}
                <div className="mt-auto flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="tabular-nums">
                      {s.publishedCount} published
                      {s.targetEpisodes
                        ? ` / ${s.targetEpisodes} target`
                        : ` · ${s.episodeCount} planned`}
                    </span>
                  </div>
                  {progress !== null && (
                    <div
                      role="progressbar"
                      aria-valuenow={Math.round(progress * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="h-1.5 overflow-hidden rounded-full bg-muted"
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <SeriesFormDialog series={null} open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
