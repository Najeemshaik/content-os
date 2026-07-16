"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createOutlier, updateOutlier } from "@/lib/actions/outliers";
import type { Outlier } from "@/lib/db/schema";
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
import { Textarea } from "@/components/ui/textarea";

type Draft = {
  url: string;
  creator: string;
  creatorFollowers: string;
  views: string;
  niche: string;
  hookVerbal: string;
  hookWritten: string;
  hookVisual: string;
  transcript: string;
  whyItWorked: string;
};

const EMPTY: Draft = {
  url: "",
  creator: "",
  creatorFollowers: "",
  views: "",
  niche: "",
  hookVerbal: "",
  hookWritten: "",
  hookVisual: "",
  transcript: "",
  whyItWorked: "",
};

function toDraft(outlier: Outlier): Draft {
  return {
    url: outlier.url,
    creator: outlier.creator ?? "",
    creatorFollowers: outlier.creatorFollowers?.toString() ?? "",
    views: outlier.views?.toString() ?? "",
    niche: outlier.niche ?? "",
    hookVerbal: outlier.hookVerbal ?? "",
    hookWritten: outlier.hookWritten ?? "",
    hookVisual: outlier.hookVisual ?? "",
    transcript: outlier.transcript ?? "",
    whyItWorked: outlier.whyItWorked ?? "",
  };
}

export function OutlierFormDialog({
  outlier,
  open,
  onOpenChange,
}: {
  outlier: Outlier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<Draft>(EMPTY);
  const [saving, startSaving] = React.useTransition();

  // Reset the draft when the dialog opens (render-adjust pattern).
  const resetKey = open ? (outlier?.id ?? "new") : null;
  const [lastResetKey, setLastResetKey] = React.useState<string | null>(null);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    if (resetKey) setDraft(outlier ? toDraft(outlier) : EMPTY);
  }

  const followers = Number(draft.creatorFollowers);
  const views = Number(draft.views);
  const multiplier =
    followers > 0 && views > 0 ? (views / followers).toFixed(1) : null;

  function set<K extends keyof Draft>(key: K, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function submit() {
    if (!draft.url.trim()) {
      toast.error("URL is required");
      return;
    }
    startSaving(async () => {
      const payload = {
        url: draft.url.trim(),
        creator: draft.creator.trim() || null,
        creatorFollowers: draft.creatorFollowers
          ? Math.max(0, Math.floor(Number(draft.creatorFollowers)))
          : null,
        views: draft.views
          ? Math.max(0, Math.floor(Number(draft.views)))
          : null,
        niche: draft.niche.trim() || null,
        hookVerbal: draft.hookVerbal.trim() || null,
        hookWritten: draft.hookWritten.trim() || null,
        hookVisual: draft.hookVisual.trim() || null,
        transcript: draft.transcript.trim() || null,
        whyItWorked: draft.whyItWorked.trim() || null,
      };
      try {
        const result = outlier
          ? await updateOutlier({ id: outlier.id, ...payload })
          : await createOutlier(payload);
        if (!result.ok) throw new Error(result.error);
        toast.success(outlier ? "Outlier updated" : "Outlier saved");
        onOpenChange(false);
        router.refresh();
      } catch (error) {
        toast.error(
          `Couldn't save — ${error instanceof Error ? error.message : "try again"}`,
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{outlier ? "Edit outlier" : "Add outlier"}</DialogTitle>
          <DialogDescription>
            A reference video doing ≥5× its creator&apos;s follower count.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="o-url">URL</Label>
            <Input
              id="o-url"
              value={draft.url}
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="o-creator">Creator</Label>
              <Input
                id="o-creator"
                value={draft.creator}
                onChange={(e) => set("creator", e.target.value)}
                placeholder="@handle"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="o-niche">Niche</Label>
              <Input
                id="o-niche"
                value={draft.niche}
                onChange={(e) => set("niche", e.target.value)}
                placeholder="e.g. AI builders"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="o-followers">Followers</Label>
              <Input
                id="o-followers"
                type="number"
                min={0}
                value={draft.creatorFollowers}
                onChange={(e) => set("creatorFollowers", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="o-views">Views</Label>
              <Input
                id="o-views"
                type="number"
                min={0}
                value={draft.views}
                onChange={(e) => set("views", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Multiplier</Label>
              <span className="flex h-9 items-center rounded-lg border border-dashed px-3 text-sm font-semibold tabular-nums text-flag">
                {multiplier ? `${multiplier}×` : "—"}
              </span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                ["hookVerbal", "Verbal hook"],
                ["hookWritten", "Written hook"],
                ["hookVisual", "Visual hook"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="grid gap-1.5">
                <Label htmlFor={`o-${key}`}>{label}</Label>
                <Textarea
                  id={`o-${key}`}
                  rows={2}
                  value={draft[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className="min-h-0 resize-none text-sm"
                />
              </div>
            ))}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="o-transcript">Transcript</Label>
            <Textarea
              id="o-transcript"
              rows={3}
              value={draft.transcript}
              onChange={(e) => set("transcript", e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="o-why">Why it worked</Label>
            <Textarea
              id="o-why"
              rows={2}
              value={draft.whyItWorked}
              onChange={(e) => set("whyItWorked", e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {outlier ? "Save changes" : "Save outlier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
