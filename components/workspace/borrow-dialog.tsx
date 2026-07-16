"use client";

import * as React from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export type HookKind = "verbal" | "written" | "visual";

export type OutlierHook = {
  id: string;
  creator: string | null;
  niche: string | null;
  text: string;
};

const KIND_LABELS: Record<HookKind, string> = {
  verbal: "verbal hooks",
  written: "written hooks",
  visual: "visual hooks",
};

/** Searchable picker over the outlier bank's hooks — copies text, links
 * nothing (PRD §4.2). */
export function BorrowDialog({
  kind,
  hooks,
  open,
  onOpenChange,
  onPick,
}: {
  kind: HookKind;
  hooks: OutlierHook[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (text: string) => void;
}) {
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Borrow a ${kind} hook`}
      description="Copies the text into your hook stack"
    >
      <Command>
      <CommandInput placeholder={`Search ${KIND_LABELS[kind]}…`} />
      <CommandList>
        <CommandEmpty>
          {hooks.length === 0
            ? "No hooks in the outlier bank yet — add outliers in Banks."
            : "No hooks match."}
        </CommandEmpty>
        <CommandGroup heading="From the outlier bank">
          {hooks.map((hook) => (
            <CommandItem
              key={hook.id}
              value={`${hook.text} ${hook.creator ?? ""} ${hook.niche ?? ""}`}
              onSelect={() => {
                onPick(hook.text);
                onOpenChange(false);
              }}
              className="flex flex-col items-start gap-0.5"
            >
              <span className="line-clamp-2 text-sm">{hook.text}</span>
              <span className="text-xs text-muted-foreground">
                {[hook.creator, hook.niche].filter(Boolean).join(" · ") ||
                  "Unknown source"}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      </Command>
    </CommandDialog>
  );
}
