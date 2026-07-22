"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSeries, updateSeries } from "@/lib/actions/series";
import type { Series } from "@/lib/db/schema";
import {
  SERIES_STATUSES,
  SERIES_TYPES,
  type SeriesStatus,
  type SeriesType,
} from "@/lib/types";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function SeriesFormDialog({
  series,
  open,
  onOpenChange,
}: {
  series: Series | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<SeriesType>("custom");
  const [status, setStatus] = React.useState<SeriesStatus>("active");
  const [target, setTarget] = React.useState("");
  const [saving, startSaving] = React.useTransition();

  // Reset the draft when the dialog opens (render-adjust pattern).
  const resetKey = open ? (series?.id ?? "new") : null;
  const [lastResetKey, setLastResetKey] = React.useState<string | null>(null);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    if (resetKey) {
      setName(series?.name ?? "");
      setDescription(series?.description ?? "");
      setType(series?.type ?? "custom");
      setStatus(series?.status ?? "active");
      setTarget(series?.targetEpisodes?.toString() ?? "");
    }
  }

  function submit() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    startSaving(async () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        type,
        status,
        targetEpisodes: target ? Math.max(1, Math.floor(Number(target))) : null,
      };
      try {
        if (series) {
          const result = await updateSeries({ id: series.id, ...payload });
          if (!result.ok) throw new Error(result.error);
          toast.success("Series updated");
          onOpenChange(false);
          router.refresh();
        } else {
          const result = await createSeries(payload);
          if (!result.ok) throw new Error(result.error);
          if (!result.data) throw new Error("try again");
          toast.success("Series created — add episode 1 when ready");
          onOpenChange(false);
          router.push(`/series/${result.data.id}`);
        }
      } catch (error) {
        toast.error(
          `Couldn't save — ${error instanceof Error ? error.message : "try again"}`,
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{series ? "Edit series" : "New series"}</DialogTitle>
          <DialogDescription>
            A planned sequence of related episodes.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="sr-name">Name</Label>
            <Input
              id="sr-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design pass diaries"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sr-desc">Description</Label>
            <Textarea
              id="sr-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as SeriesType)}
              >
                <SelectTrigger aria-label="Series type" className="capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERIES_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as SeriesStatus)}
              >
                <SelectTrigger aria-label="Series status" className="capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERIES_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sr-target">Target eps</Label>
              <Input
                id="sr-target"
                type="number"
                min={1}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="∞"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {series ? "Save changes" : "Create series"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
