"use client";

import * as React from "react";
import { ChevronRight, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { groupScenes, sceneRuntimeLabel, type Scene } from "@/lib/scenes";
import { hueClasses } from "./script-editor";

/** Running tally of shot types across the script — the filming batch plan. */
export function ShotPlan({
  scenes,
  onJump,
}: {
  scenes: Scene[];
  onJump: (startChar: number) => void;
}) {
  const groups = React.useMemo(() => groupScenes(scenes), [scenes]);
  const [openTag, setOpenTag] = React.useState<string | null>(null);

  if (groups.length === 0) return null;

  return (
    <section className="rounded-2xl bg-card p-4 shadow-card">
      <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold tracking-tight">
        <Clapperboard className="size-3.5" aria-hidden />
        Shot plan
      </h2>
      <p className="mb-2 text-xs text-muted-foreground">
        Scenes grouped by shot type — batch each group into one setup.
      </p>
      <div className="flex flex-col">
        {groups.map((group) => {
          const hue = hueClasses(group.tag);
          const open = openTag === group.tag;
          return (
            <div key={group.tag} className="border-b py-1 last:border-b-0">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenTag(open ? null : group.tag)}
                className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left text-sm transition-colors hover:bg-accent/60"
              >
                <span
                  className={cn("size-2 shrink-0 rounded-full", hue.dot)}
                  aria-hidden
                />
                <span className="font-medium">{group.tag}</span>
                <span className="ms-auto text-xs tabular-nums text-muted-foreground">
                  ×{group.count} · {group.words}w ·{" "}
                  {sceneRuntimeLabel(group.seconds)}
                </span>
                <ChevronRight
                  className={cn(
                    "size-3.5 shrink-0 text-muted-foreground transition-transform",
                    open && "rotate-90",
                  )}
                  aria-hidden
                />
              </button>
              {open && (
                <div className="flex flex-col gap-0.5 pb-1.5 pl-5">
                  {group.scenes.map((scene) => {
                    const firstLine =
                      scene.note ??
                      scene.text.split("\n")[1]?.trim() ??
                      "";
                    return (
                      <button
                        key={scene.startChar}
                        type="button"
                        onClick={() => onJump(scene.startChar)}
                        className="flex items-baseline gap-2 rounded-md px-1 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {firstLine || "(empty scene)"}
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {sceneRuntimeLabel(scene.seconds)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
