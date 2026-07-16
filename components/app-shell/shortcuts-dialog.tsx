"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

const SHORTCUTS: { keys: string[]; label: string; scope?: string }[] = [
  { keys: ["⌘", "K"], label: "Quick capture" },
  { keys: ["?"], label: "This shortcut sheet" },
  { keys: ["N"], label: "Focus quick-add", scope: "Pipeline" },
  { keys: ["F"], label: "Switch Shorts / Long-form board", scope: "Pipeline" },
  { keys: ["1", "–", "4"], label: "All / Take / Teach / Story filter", scope: "Pipeline" },
  { keys: ["⌘", "⇧", "S"], label: "Clip selection → short", scope: "Long-form script" },
  { keys: ["Esc"], label: "Close panels, clear search" },
  { keys: ["Space"], label: "Lift / drop a card (keyboard drag)", scope: "Boards" },
  { keys: ["← ↑ ↓ →"], label: "Move a lifted card", scope: "Boards" },
];

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Fast paths through Content OS.</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col divide-y">
          {SHORTCUTS.map((shortcut) => (
            <li
              key={shortcut.label}
              className="flex items-center justify-between gap-4 py-2.5 text-sm"
            >
              <span>
                {shortcut.label}
                {shortcut.scope && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {shortcut.scope}
                  </span>
                )}
              </span>
              <KbdGroup>
                {shortcut.keys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </KbdGroup>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
