"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createStructure, updateStructure } from "@/lib/actions/structures";
import type { Outlier, Structure } from "@/lib/db/schema";
import {
  STRUCTURE_CATEGORIES,
  type StructureCategory,
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

type Draft = {
  name: string;
  category: StructureCategory;
  template: string;
  sourceUrl: string;
  sourceCreator: string;
  notes: string;
};

const EMPTY: Draft = {
  name: "",
  category: "other",
  template: "",
  sourceUrl: "",
  sourceCreator: "",
  notes: "",
};

export type StructureFormState =
  | { mode: "create" }
  | { mode: "edit"; structure: Structure }
  /** Templatize flow: pre-filled from an outlier; saving links + flips it. */
  | { mode: "templatize"; outlier: Outlier };

export function StructureFormDialog({
  state,
  onOpenChange,
}: {
  state: StructureFormState | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<Draft>(EMPTY);
  const [saving, startSaving] = React.useTransition();

  // Reset the draft when the dialog opens (render-adjust pattern).
  const [lastState, setLastState] = React.useState<StructureFormState | null>(
    null,
  );
  if (state !== lastState) {
    setLastState(state);
    if (state?.mode === "edit") {
      const s = state.structure;
      setDraft({
        name: s.name,
        category: s.category,
        template: s.template,
        sourceUrl: s.sourceUrl ?? "",
        sourceCreator: s.sourceCreator ?? "",
        notes: s.notes ?? "",
      });
    } else if (state?.mode === "templatize") {
      const o = state.outlier;
      setDraft({
        ...EMPTY,
        name: o.creator ? `${o.creator} structure` : "New structure",
        sourceUrl: o.url,
        sourceCreator: o.creator ?? "",
        notes: o.whyItWorked ?? "",
        template: o.transcript
          ? `# Templatize from transcript:\n${o.transcript}`
          : "",
      });
    } else if (state) {
      setDraft(EMPTY);
    }
  }

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function submit() {
    if (!draft.name.trim() || !draft.template.trim()) {
      toast.error("Name and template are required");
      return;
    }
    startSaving(async () => {
      const payload = {
        name: draft.name.trim(),
        category: draft.category,
        template: draft.template,
        sourceUrl: draft.sourceUrl.trim() || null,
        sourceCreator: draft.sourceCreator.trim() || null,
        notes: draft.notes.trim() || null,
      };
      try {
        const result =
          state?.mode === "edit"
            ? await updateStructure({ id: state.structure.id, ...payload })
            : await createStructure({
                ...payload,
                ...(state?.mode === "templatize"
                  ? { outlierId: state.outlier.id }
                  : {}),
              });
        if (!result.ok) throw new Error(result.error);
        toast.success(
          state?.mode === "templatize"
            ? "Structure created — outlier marked templatized"
            : state?.mode === "edit"
              ? "Structure updated"
              : "Structure created",
        );
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
    <Dialog open={!!state} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {state?.mode === "edit"
              ? "Edit structure"
              : state?.mode === "templatize"
                ? "Templatize outlier"
                : "New structure"}
          </DialogTitle>
          <DialogDescription>
            Fill-in-the-blank script template — mark blanks as{" "}
            {"{placeholders}"}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
            <div className="grid gap-1.5">
              <Label htmlFor="s-name">Name</Label>
              <Input
                id="s-name"
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select
                value={draft.category}
                onValueChange={(v) => set("category", v as StructureCategory)}
              >
                <SelectTrigger aria-label="Category" className="capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRUCTURE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="s-template">Template</Label>
            <Textarea
              id="s-template"
              rows={7}
              value={draft.template}
              onChange={(e) => set("template", e.target.value)}
              placeholder={"{Claim, stated flat}\nWhat most people believe instead: {assumption}\n…"}
              className="font-mono text-sm leading-6"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="s-url">Source URL</Label>
              <Input
                id="s-url"
                value={draft.sourceUrl}
                onChange={(e) => set("sourceUrl", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="s-creator">Source creator</Label>
              <Input
                id="s-creator"
                value={draft.sourceCreator}
                onChange={(e) => set("sourceCreator", e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="s-notes">Notes</Label>
            <Textarea
              id="s-notes"
              rows={2}
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {state?.mode === "edit" ? "Save changes" : "Create structure"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
