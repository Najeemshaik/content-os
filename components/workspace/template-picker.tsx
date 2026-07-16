"use client";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { Structure } from "@/lib/db/schema";

export function TemplatePicker({
  structures,
  open,
  onOpenChange,
  onPick,
}: {
  structures: Structure[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (structure: Structure) => void;
}) {
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Insert a script template"
      description="Appends the template with placeholders visible"
    >
      <Command>
      <CommandInput placeholder="Search structures…" />
      <CommandList>
        <CommandEmpty>No structures match.</CommandEmpty>
        <CommandGroup heading="Script structures">
          {structures.map((structure) => (
            <CommandItem
              key={structure.id}
              value={`${structure.name} ${structure.category}`}
              onSelect={() => {
                onPick(structure);
                onOpenChange(false);
              }}
              className="flex flex-col items-start gap-0.5"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                {structure.name}
                <span className="text-xs font-normal text-muted-foreground capitalize">
                  {structure.category} · used {structure.timesUsed}×
                </span>
              </span>
              <span className="line-clamp-2 text-xs text-muted-foreground">
                {structure.template}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      </Command>
    </CommandDialog>
  );
}
