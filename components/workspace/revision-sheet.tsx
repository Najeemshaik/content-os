"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { restoreRevision, type RestoredFields } from "@/lib/actions/revisions";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ScriptRevision } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export function RevisionSheet({
  revisions,
  open,
  onOpenChange,
  onRestored,
}: {
  revisions: ScriptRevision[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored: (fields: RestoredFields) => void;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [restoring, startRestore] = React.useTransition();
  const selected =
    revisions.find((r) => r.id === selectedId) ?? revisions[0] ?? null;

  function restore(revisionId: string) {
    startRestore(async () => {
      try {
        const result = await restoreRevision({ revisionId });
        if (!result.ok) throw new Error(result.error);
        toast.success("Revision restored");
        if (result.data) onRestored(result.data);
        onOpenChange(false);
        router.refresh();
      } catch (error) {
        toast.error(
          `Couldn't restore — ${error instanceof Error ? error.message : "try again"}`,
        );
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="size-4" aria-hidden />
            Revision history
          </SheetTitle>
          <SheetDescription>
            Snapshots of the script and hook stack. Restoring snapshots the
            current version first.
          </SheetDescription>
        </SheetHeader>
        {revisions.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No snapshots yet — they&apos;re taken after 60s of idle editing and on
            every stage advance.
          </p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-0 px-4 pb-4">
            <div className="flex gap-2 overflow-x-auto pb-3">
              {revisions.map((revision) => (
                <button
                  key={revision.id}
                  type="button"
                  onClick={() => setSelectedId(revision.id)}
                  className={cn(
                    "shrink-0 rounded-lg border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent",
                    selected?.id === revision.id &&
                      "border-ring/40 bg-accent font-medium text-foreground",
                  )}
                >
                  {format(revision.createdAt, "MMM d · HH:mm:ss")}
                </button>
              ))}
            </div>
            {selected && (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {format(selected.createdAt, "EEEE, MMM d yyyy · HH:mm:ss")}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => restore(selected.id)}
                    disabled={restoring}
                    className="gap-1.5"
                  >
                    <RotateCcw className="size-3.5" aria-hidden />
                    Restore this version
                  </Button>
                </div>
                <ScrollArea className="min-h-0 flex-1 rounded-xl border bg-muted/30">
                  <div className="flex flex-col gap-4 p-4">
                    {(
                      [
                        ["Verbal hook", selected.hookVerbal],
                        ["Written hook", selected.hookWritten],
                        ["Visual hook", selected.hookVisual],
                      ] as const
                    ).map(
                      ([label, value]) =>
                        value && (
                          <div key={label}>
                            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                              {label}
                            </p>
                            <p className="mt-1 text-sm">{value}</p>
                          </div>
                        ),
                    )}
                    {selected.scriptBody && (
                      <>
                        <Separator />
                        <pre className="font-sans text-sm leading-6 whitespace-pre-wrap">
                          {selected.scriptBody}
                        </pre>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
