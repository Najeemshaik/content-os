"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  parseScenes,
  parseSections,
  sceneHue,
  sceneRuntimeLabel,
  STARTER_TAGS,
  type Scene,
  type Section,
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
  jumpToScene: (startChar: number) => void;
};

/* Typography shared by the textareas and their backdrops — they must wrap
   identically, character for character. */
const TEXT_METRICS =
  "px-5 py-4 !text-base leading-7 whitespace-pre-wrap break-words md:px-8";

type SectionScenes = { section: Section; index: number; scenes: Scene[] };

export function ScriptEditor({
  value,
  onChange,
  onSelectionChange,
  onCmdShiftS,
  handleRef,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelectionChange: (start: number, end: number) => void;
  onCmdShiftS?: () => void;
  handleRef?: React.Ref<ScriptEditorHandle>;
  placeholder?: string;
}) {
  const sections = React.useMemo(() => parseSections(value), [value]);
  const [collapsed, setCollapsed] = React.useState<Set<number>>(new Set());
  const [caretGlobal, setCaretGlobal] = React.useState(-1);
  const textareaRefs = React.useRef(new Map<number, HTMLTextAreaElement>());
  const headerRefs = React.useRef(new Map<number, HTMLInputElement>());
  const pendingCaretRef = React.useRef<number | null>(null);

  // Scenes per section, caret-aware inside the section that holds the caret.
  const sectionScenes: SectionScenes[] = React.useMemo(
    () =>
      sections.map((section, index) => {
        const body = value.slice(section.bodyStart, section.end);
        let relCaretLine = -1;
        if (caretGlobal >= section.bodyStart && caretGlobal <= section.end) {
          relCaretLine = 0;
          for (let i = section.bodyStart; i < caretGlobal; i++) {
            if (value.charCodeAt(i) === 10) relCaretLine++;
          }
        }
        return { section, index, scenes: parseScenes(body, relCaretLine) };
      }),
    [sections, value, caretGlobal],
  );

  const knownTags = React.useMemo(() => {
    const used = sectionScenes.flatMap(({ scenes }) =>
      scenes.flatMap((s) => (s.tag ? [s.tag] : [])),
    );
    return [...new Set([...used, ...STARTER_TAGS])];
  }, [sectionScenes]);

  /** Splice a section's edited body back into the full script. */
  function updateBody(section: Section, newBody: string, localCaret: number) {
    const next =
      value.slice(0, section.bodyStart) + newBody + value.slice(section.end);
    pendingCaretRef.current = section.bodyStart + localCaret;
    setCaretGlobal(section.bodyStart + localCaret);
    onChange(next);
  }

  function renameSection(section: Section, name: string) {
    const next =
      value.slice(0, section.headerStart) +
      `>${name}` +
      value.slice(Math.min(section.bodyStart - 1, value.length));
    onChange(next);
  }

  function removeSection(section: Section) {
    // Delete the header line only — the body merges into the block above.
    const next =
      value.slice(0, section.headerStart) +
      value.slice(Math.min(section.bodyStart, value.length));
    onChange(next);
  }

  // After a structural change (typing `>name` splits a block), the caret's
  // textarea may be a different one — move focus to wherever the caret
  // landed. Same-textarea edits are left alone.
  React.useLayoutEffect(() => {
    const caret = pendingCaretRef.current;
    if (caret === null) return;
    pendingCaretRef.current = null;
    // Caret inside a `>Name` header line → focus that inline input.
    const headerIndex = sections.findIndex(
      (s) =>
        s.name !== null && caret >= s.headerStart && caret < s.bodyStart,
    );
    if (headerIndex >= 0) {
      const input = headerRefs.current.get(headerIndex);
      if (input && document.activeElement !== input) {
        const local = Math.max(
          0,
          Math.min(caret - sections[headerIndex].headerStart - 1, input.value.length),
        );
        input.focus({ preventScroll: true });
        input.setSelectionRange(local, local);
      }
      return;
    }
    const index = sections.findLastIndex(
      (s) => caret >= s.bodyStart && caret <= s.end,
    );
    if (index < 0) return;
    const textarea = textareaRefs.current.get(index);
    if (!textarea) return;
    const local = caret - sections[index].bodyStart;
    if (
      document.activeElement === textarea &&
      textarea.selectionStart === local &&
      textarea.selectionEnd === local
    )
      return;
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(local, local);
  }, [sections]);

  const jumpToScene = React.useCallback(
    (startChar: number) => {
      const holder = sectionScenes.find(
        ({ section }) =>
          startChar >= section.bodyStart && startChar <= section.end,
      );
      if (!holder) return;
      setCollapsed((prev) => {
        if (!prev.has(holder.index)) return prev;
        const next = new Set(prev);
        next.delete(holder.index);
        return next;
      });
      requestAnimationFrame(() => {
        const local = startChar - holder.section.bodyStart;
        const el = document.querySelector(
          `[data-section="${holder.index}"] [data-scene-start="${local}"]`,
        );
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [sectionScenes],
  );

  React.useImperativeHandle(handleRef, () => ({ jumpToScene }), [jumpToScene]);

  const allTagged = sectionScenes.flatMap(({ section, scenes }) =>
    scenes
      .filter((s) => s.tag)
      .map((s) => ({ ...s, globalStart: section.bodyStart + s.startChar })),
  );

  return (
    <div>
      {/* Scene map — one chip per tagged scene, click to jump. */}
      {allTagged.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-2 md:px-5">
          {allTagged.map((scene) => {
            const hue = hueClasses(scene.tag!);
            return (
              <button
                key={scene.globalStart}
                type="button"
                onClick={() => jumpToScene(scene.globalStart)}
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

      {sectionScenes.map(({ section, index, scenes }) => {
        const body = value.slice(section.bodyStart, section.end);
        const isCollapsed = collapsed.has(index) && section.name !== null;
        const tagged = scenes.filter((s) => s.tag);
        const seconds = tagged.reduce((sum, s) => sum + s.seconds, 0);
        return (
          <div key={`${index}-${section.headerStart}`} data-section={index}>
            {section.name !== null && (
              // Reddit-thread style: the `>Name` line sits in the text flow;
              // the only chrome is a small chevron in the left gutter.
              <div
                className={cn(
                  "relative flex items-baseline px-5 leading-7 md:px-8",
                  isCollapsed && "text-muted-foreground",
                )}
                style={{ maxWidth: "72ch" }}
              >
                <button
                  type="button"
                  aria-expanded={!isCollapsed}
                  aria-label={`${isCollapsed ? "Expand" : "Collapse"} section`}
                  onClick={() =>
                    setCollapsed((prev) => {
                      const next = new Set(prev);
                      if (next.has(index)) next.delete(index);
                      else next.add(index);
                      return next;
                    })
                  }
                  className="absolute top-1/2 left-0.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground/60 hover:bg-accent hover:text-foreground md:left-2"
                >
                  <ChevronRight
                    className={cn(
                      "size-3.5 transition-transform",
                      !isCollapsed && "rotate-90",
                    )}
                    aria-hidden
                  />
                </button>
                <span
                  aria-hidden
                  className="!text-base text-muted-foreground/50"
                >
                  &gt;
                </span>
                <input
                  ref={(el) => {
                    if (el) headerRefs.current.set(index, el);
                    else headerRefs.current.delete(index);
                  }}
                  value={section.name}
                  onChange={(e) => renameSection(section, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && section.name === "") {
                      e.preventDefault();
                      removeSection(section);
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      textareaRefs.current.get(index)?.focus();
                      textareaRefs.current.get(index)?.setSelectionRange(0, 0);
                    }
                  }}
                  placeholder="Section"
                  aria-label="Section name"
                  className="min-w-0 flex-1 bg-transparent !text-base font-medium tracking-tight outline-none placeholder:font-normal placeholder:text-muted-foreground/50"
                />
                {isCollapsed && (
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground/70">
                    {tagged.length} {tagged.length === 1 ? "scene" : "scenes"}
                    {seconds > 0 && ` · ${sceneRuntimeLabel(seconds)}`}
                  </span>
                )}
              </div>
            )}
            {!isCollapsed && (
              <SectionBody
                body={body}
                scenes={scenes}
                knownTags={knownTags}
                isOnly={sections.length === 1}
                placeholder={index === 0 ? placeholder : undefined}
                onBody={(next, caret) => updateBody(section, next, caret)}
                onSelection={(start, end) =>
                  onSelectionChange(
                    section.bodyStart + start,
                    section.bodyStart + end,
                  )
                }
                onCaret={(local) => setCaretGlobal(section.bodyStart + local)}
                onCmdShiftS={onCmdShiftS}
                registerRef={(el) => {
                  if (el) textareaRefs.current.set(index, el);
                  else textareaRefs.current.delete(index);
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SectionBody({
  body,
  scenes,
  knownTags,
  isOnly,
  placeholder,
  onBody,
  onSelection,
  onCaret,
  onCmdShiftS,
  registerRef,
}: {
  body: string;
  scenes: Scene[];
  knownTags: string[];
  isOnly: boolean;
  placeholder?: string;
  onBody: (next: string, caret: number) => void;
  onSelection: (start: number, end: number) => void;
  onCaret: (local: number) => void;
  onCmdShiftS?: () => void;
  registerRef: (el: HTMLTextAreaElement | null) => void;
}) {
  const localRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [slashPrefix, setSlashPrefix] = React.useState<string | null>(null);

  function detectSlash() {
    const textarea = localRef.current;
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
    const textarea = localRef.current;
    if (!textarea) return;
    const text = textarea.value;
    const caret = textarea.selectionStart;
    const lineStart = text.lastIndexOf("\n", caret - 1) + 1;
    const next = `${text.slice(0, lineStart)}/${tag}${text.slice(caret)}`;
    setSlashPrefix(null);
    onBody(next, lineStart + tag.length + 1);
  }

  function sync() {
    const textarea = localRef.current;
    if (!textarea) return;
    onSelection(textarea.selectionStart, textarea.selectionEnd);
    onCaret(textarea.selectionStart);
  }

  const suggestions =
    slashPrefix !== null
      ? knownTags.filter((t) => t.startsWith(slashPrefix) && t !== slashPrefix)
      : [];

  return (
    <div>
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
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 w-full",
            TEXT_METRICS,
          )}
          style={{ maxWidth: "72ch" }}
        >
          {scenes.map((scene) => {
            const hue = scene.tag ? hueClasses(scene.tag) : null;
            const lines = scene.text.split("\n");
            const headerLine = scene.hasHeader ? lines[0] : null;
            const sceneBody = scene.hasHeader
              ? lines.slice(1).join("\n")
              : scene.text;
            // A scene ending in a newline has a final empty line (often the
            // caret, mid-writing). Splitting consumed that line, so restore
            // its line box with a zero-width space.
            // Empty scenes (a lone blank line between scenes) and trailing
            // newlines still need their line boxes — a zero-width space
            // makes them render so the layers can't drift.
            const bodyText =
              scene.text === ""
                ? "\u200b"
                : scene.text.endsWith("\n")
                  ? `${sceneBody}\u200b`
                  : sceneBody;
            return (
              <div
                key={scene.startChar}
                data-scene-start={scene.startChar}
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
          ref={(el) => {
            localRef.current = el;
            registerRef(el);
          }}
          value={body}
          onChange={(e) => {
            onBody(e.target.value, e.target.selectionStart);
            sync();
            requestAnimationFrame(detectSlash);
          }}
          onSelect={() => {
            sync();
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
            "relative field-sizing-content max-h-none w-full resize-none rounded-none border-0 bg-transparent text-transparent caret-foreground shadow-none selection:bg-primary/15 selection:text-transparent focus-visible:ring-0 dark:bg-transparent",
            isOnly ? "min-h-[50svh]" : "min-h-16",
            TEXT_METRICS,
          )}
          style={{ maxWidth: "72ch" }}
        />
      </div>
    </div>
  );
}
