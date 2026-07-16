"use client";

import * as React from "react";
import { Import } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Outlier } from "@/lib/db/schema";
import { BorrowDialog, type HookKind } from "./borrow-dialog";

const FIELDS: {
  kind: HookKind;
  label: string;
  hint: string;
}[] = [
  { kind: "verbal", label: "Verbal", hint: "First spoken line" },
  { kind: "written", label: "Written", hint: "On-screen text, first seconds" },
  { kind: "visual", label: "Visual", hint: "What's happening in frame one" },
];

export type HookValues = {
  verbal: string;
  written: string;
  visual: string;
};

export function HookStack({
  values,
  onChange,
  outliers,
}: {
  values: HookValues;
  onChange: (kind: HookKind, value: string) => void;
  outliers: Pick<
    Outlier,
    "id" | "creator" | "niche" | "hookVerbal" | "hookWritten" | "hookVisual"
  >[];
}) {
  const [borrowing, setBorrowing] = React.useState<HookKind | null>(null);

  const hooksFor = React.useCallback(
    (kind: HookKind) =>
      outliers
        .map((o) => ({
          id: o.id,
          creator: o.creator,
          niche: o.niche,
          text:
            kind === "verbal"
              ? o.hookVerbal
              : kind === "written"
                ? o.hookWritten
                : o.hookVisual,
        }))
        .filter((h): h is typeof h & { text: string } => !!h.text?.trim()),
    [outliers],
  );

  return (
    <div className="flex flex-col gap-4">
      {FIELDS.map(({ kind, label, hint }) => (
        <div key={kind} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor={`hook-${kind}`}
              className="text-xs font-medium tracking-widest text-muted-foreground uppercase"
            >
              {label}
            </label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-xs text-muted-foreground"
              onClick={() => setBorrowing(kind)}
            >
              <Import className="size-3" aria-hidden />
              Borrow
            </Button>
          </div>
          <Textarea
            id={`hook-${kind}`}
            value={values[kind]}
            onChange={(e) => onChange(kind, e.target.value)}
            placeholder={hint}
            rows={2}
            className="min-h-0 resize-none bg-card text-sm"
          />
        </div>
      ))}
      {borrowing && (
        <BorrowDialog
          kind={borrowing}
          hooks={hooksFor(borrowing)}
          open
          onOpenChange={(open) => !open && setBorrowing(null)}
          onPick={(text) => onChange(borrowing, text)}
        />
      )}
    </div>
  );
}
