"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  sceneHue,
  sceneRuntimeLabel,
  STARTER_TAGS,
  type Scene,
} from "@/lib/scenes";

/* Scene hues resolve through static class names so Tailwind sees them. */
const HUE = {
  text: [
    "text-scene-1",
    "text-scene-2",
    "text-scene-3",
    "text-scene-4",
    "text-scene-5",
    "text-scene-6",
  ],
  dot: [
    "bg-scene-1",
    "bg-scene-2",
    "bg-scene-3",
    "bg-scene-4",
    "bg-scene-5",
    "bg-scene-6",
  ],
  // Gutter line marking the scene's extent, painted (inset shadow) in the
  // margin so it can never change the text layout.
  rule: [
    "shadow-[inset_2px_0_0_var(--scene-1)]",
    "shadow-[inset_2px_0_0_var(--scene-2)]",
    "shadow-[inset_2px_0_0_var(--scene-3)]",
    "shadow-[inset_2px_0_0_var(--scene-4)]",
    "shadow-[inset_2px_0_0_var(--scene-5)]",
    "shadow-[inset_2px_0_0_var(--scene-6)]",
  ],
} as const;

export function hueClasses(tag: string) {
  const i = sceneHue(tag) - 1;
  return { text: HUE.text[i], dot: HUE.dot[i], rule: HUE.rule[i] };
}

export type ScriptEditorHandle = {
  jumpToScene: (index: number) => void;
};

/* Typography shared by the textarea and its backdrop — they must wrap
   identically, character for character. */
const TEXT_METRICS =
  "px-5 py-5 !text-base leading-7 whitespace-pre-wrap break-words md:px-8";

export function ScriptEditor({
  value,
  scenes,
  onChange,
  onSelectionSync,
  onCmdShiftS,
  textareaRef,
  handleRef,
  placeholder,
}: {
  value: string;
  scenes: Scene[];
  onChange: (value: string) => void;
  onSelectionSync: () => void;
  onCmdShiftS?: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleRef?: React.Ref<ScriptEditorHandle>;
  placeholder?: string;
}) {
  const backdropRef = React.useRef<HTMLDivElement>(null);
  const [slashPrefix, setSlashPrefix] = React.useState<string | null>(null);

  React.useImperativeHandle(handleRef, () => ({
    jumpToScene: (index: number) => {
      const el = backdropRef.current?.querySelector(`[data-scene="${index}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      const scene = scenes[index];
      const textarea = textareaRef.current;
      if (scene && textarea) {
        const caret = scene.startChar + scene.text.length;
        textarea.focus({ preventScroll: true });
        textarea.setSelectionRange(caret, caret);
      }
    },
  }));

  /** The current caret line, when it's a partial `/tag` being typed.
   *  Reads the DOM value — the prop can lag a frame behind fast typing. */
  function detectSlash() {
    const textarea = textareaRef.current;
    if (!textarea || textarea.selectionStart !== textarea.selectionEnd) {
      setSlashPrefix(null);
      return;
    }
    const text = textarea.value;
    const caret = textarea.selectionStart;
    const lineStart = text.lastIndexOf("\n", caret - 1) + 1;
    const line = text.slice(lineStart, caret);
    const match = /^\/([\w-]*)$/.exec(line);
    setSlashPrefix(match ? match[1].toLowerCase() : null);
  }

  function insertTag(tag: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const text = textarea.value;
    const caret = textarea.selectionStart;
    const lineStart = text.lastIndexOf("\n", caret - 1) + 1;
    const next = `${text.slice(0, lineStart)}/${tag}${text.slice(caret)}`;
    onChange(next);
    setSlashPrefix(null);
    requestAnimationFrame(() => {
      const pos = lineStart + tag.length + 1;
      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(pos, pos);
    });
  }

  const knownTags = React.useMemo(() => {
    const used = scenes.flatMap((s) => (s.tag ? [s.tag] : []));
    return [...new Set([...used, ...STARTER_TAGS])];
  }, [scenes]);

  const suggestions =
    slashPrefix !== null
      ? knownTags.filter((t) => t.startsWith(slashPrefix) && t !== slashPrefix)
      : [];

  const tagged = scenes.filter((s) => s.tag);

  return (
    <div>
      {/* Scene map — one chip per tagged scene, click to jump. */}
      {tagged.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-2 md:px-5">
          {scenes.map((scene, index) => {
            if (!scene.tag) return null;
            const hue = hueClasses(scene.tag);
            return (
              <button
                key={`${scene.tag}-${scene.startChar}`}
                type="button"
                onClick={() =>
                  backdropRef.current
                    ?.querySelector(`[data-scene="${index}"]`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
                className="flex items-center gap-1.5 rounded-full bg-muted/70 py-0.5 pr-2 pl-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <span
                  className={cn("size-1.5 rounded-full", hue.dot)}
                  aria-hidden
                />
                {scene.tag}
                <span className="text-2xs tabular-nums opacity-70">
                  {sceneRuntimeLabel(scene.seconds)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Slash suggestions — shown while typing a /tag line. */}
      {slashPrefix !== null && suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b bg-muted/40 px-4 py-1.5 md:px-5">
          <span className="text-2xs font-medium tracking-widest text-muted-foreground uppercase">
            Scene
          </span>
          {suggestions.slice(0, 6).map((tag) => {
            const hue = hueClasses(tag);
            return (
              <button
                key={tag}
                type="button"
                // Fires before the textarea's blur clears the row.
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertTag(tag);
                }}
                className="flex items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-xs transition-colors hover:bg-accent"
              >
                <span
                  className={cn("size-1.5 rounded-full", hue.dot)}
                  aria-hidden
                />
                {tag}
              </button>
            );
          })}
        </div>
      )}

      <div className="relative">
        {/* Backdrop paints the scene structure; the textarea's own text is
            transparent and sits pixel-for-pixel on top. */}
        <div
          ref={backdropRef}
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 w-full",
            TEXT_METRICS,
          )}
          style={{ maxWidth: "72ch" }}
        >
          {scenes.map((scene, index) => {
            const hue = scene.tag ? hueClasses(scene.tag) : null;
            const lines = scene.text.split("\n");
            const headerLine = scene.hasHeader ? lines[0] : null;
            const body = scene.hasHeader
              ? lines.slice(1).join("\n")
              : scene.text;
            // A scene ending in a newline has a final empty line (often the
            // caret, mid-writing). Splitting consumed that line, so restore
            // its line box with a zero-width space — even when the body is
            // otherwise empty (a bare /tag followed by Enter).
            const bodyText = scene.text.endsWith("\n")
              ? `${body}\u200b`
              : body;
            return (
              <div
                key={scene.startChar}
                data-scene={index}
                // Margin/padding cancel out, so the gutter line sits beside
                // the text without moving it.
                className={cn(
                  "scroll-mt-24",
                  hue && ["-ml-4 pl-4", hue.rule],
                )}
              >
                {headerLine !== null && (
                  <div className={cn(hue?.text)}>{headerLine}</div>
                )}
                {bodyText.length > 0 && <div>{bodyText}</div>}
              </div>
            );
          })}
        </div>
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            onSelectionSync();
            requestAnimationFrame(detectSlash);
          }}
          onSelect={() => {
            onSelectionSync();
            detectSlash();
          }}
          onBlur={() => setSlashPrefix(null)}
          onKeyDown={(e) => {
            if (
              (e.metaKey || e.ctrlKey) &&
              e.shiftKey &&
              e.key.toLowerCase() === "s"
            ) {
              e.preventDefault();
              onCmdShiftS?.();
            } else if (e.key === "Tab" && suggestions.length > 0) {
              e.preventDefault();
              insertTag(suggestions[0]);
            } else if (e.key === "Escape" && slashPrefix !== null) {
              setSlashPrefix(null);
            }
          }}
          placeholder={placeholder}
          aria-label="Script"
          className={cn(
            "relative field-sizing-content max-h-none min-h-[55svh] w-full resize-none rounded-none border-0 bg-transparent text-transparent caret-foreground shadow-none selection:bg-primary/15 selection:text-transparent focus-visible:ring-0 dark:bg-transparent",
            TEXT_METRICS,
          )}
          style={{ maxWidth: "72ch" }}
        />
      </div>
    </div>
  );
}
