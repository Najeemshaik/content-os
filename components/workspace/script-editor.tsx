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

/* Inline styling: **bold**, *italic*, __underline__, ~~strike~~. Every
   trick is metric-safe — bold is a text-shadow double-strike and italic a
   synthesized oblique — so the backdrop's glyph widths and wrap points
   stay identical to the textarea's. (Font size is impossible here: it
   would change line metrics and break the seamless overlay.) */
const INLINE_PATTERNS: { re: RegExp; cls: string }[] = [
  { re: /\*\*([^*]+)\*\*/, cls: "[text-shadow:0.045em_0_0_currentColor]" },
  { re: /__([^_]+)__/, cls: "underline underline-offset-3" },
  { re: /~~([^~]+)~~/, cls: "line-through" },
  { re: /\*([^*]+)\*/, cls: "italic" },
];

function renderInline(text: string, depth = 0): React.ReactNode {
  if (text === "") return "\u200b";
  if (depth > 4) return text;
  let earliest: {
    match: RegExpExecArray;
    cls: string;
    markerLen: number;
  } | null = null;
  for (const p of INLINE_PATTERNS) {
    const m = p.re.exec(text);
    if (m && (earliest === null || m.index < earliest.match.index)) {
      earliest = {
        match: m,
        cls: p.cls,
        markerLen: (m[0].length - m[1].length) / 2,
      };
    }
  }
  if (!earliest) return text;
  const { match, cls, markerLen } = earliest;
  const marker = match[0].slice(0, markerLen);
  return (
    <>
      {text.slice(0, match.index)}
      <span className="opacity-30">{marker}</span>
      <span className={cls}>{renderInline(match[1], depth + 1)}</span>
      <span className="opacity-30">{marker}</span>
      {renderInline(text.slice(match.index + match[0].length), depth + 1)}
    </>
  );
}

/* Typography shared by the textarea and its backdrop — they must wrap
   identically, character for character. */
const TEXT_METRICS =
  "px-5 py-5 !text-base leading-7 whitespace-pre-wrap break-words md:px-8";

type Fold = { start: number; end: number; sectionIndex: number };
type Piece = { r: number; d: number; len: number };

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
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const backdropRef = React.useRef<HTMLDivElement | null>(null);
  const [foldedIdx, setFoldedIdx] = React.useState<Set<number>>(new Set());
  const [caretDisplayed, setCaretDisplayed] = React.useState(-1);
  const [slashPrefix, setSlashPrefix] = React.useState<string | null>(null);
  const pendingCaretRef = React.useRef<{ start: number; end: number } | null>(
    null,
  );

  const sections = React.useMemo(() => parseSections(value), [value]);

  /* ── Fold engine: hidden ranges of the real string ─────────── */

  const folds: Fold[] = React.useMemo(() => {
    const list: Fold[] = [];
    for (const index of foldedIdx) {
      const s = sections[index];
      if (!s || s.name === null || s.end <= s.bodyStart) continue;
      // Also eat the separator newline so the next `>` sits directly below.
      list.push({
        start: s.bodyStart,
        end: Math.min(s.end + 1, value.length),
        sectionIndex: index,
      });
    }
    return list.sort((a, b) => a.start - b.start);
  }, [foldedIdx, sections, value.length]);

  const pieces: Piece[] = React.useMemo(() => {
    const segs: Piece[] = [];
    let r = 0;
    let d = 0;
    for (const f of folds) {
      if (f.start > r) {
        segs.push({ r, d, len: f.start - r });
        d += f.start - r;
      }
      r = Math.max(r, f.end);
    }
    segs.push({ r, d, len: Math.max(0, value.length - r) });
    return segs;
  }, [folds, value.length]);

  const displayed = React.useMemo(
    () => pieces.map((p) => value.slice(p.r, p.r + p.len)).join(""),
    [pieces, value],
  );

  /** Displayed seam positions — a fold's hidden text lives at each one. */
  const seams = React.useMemo(
    () => pieces.slice(1).map((p) => p.d),
    [pieces],
  );

  const d2r = React.useCallback(
    (d: number) => {
      for (const p of pieces) {
        if (d <= p.d + p.len) return p.r + Math.max(0, d - p.d);
      }
      return value.length;
    },
    [pieces, value.length],
  );

  const r2d = React.useCallback(
    (r: number) => {
      let best = 0;
      for (const p of pieces) {
        if (r >= p.r && r <= p.r + p.len) return p.d + (r - p.r);
        if (r > p.r + p.len) best = p.d + p.len;
      }
      return best;
    },
    [pieces],
  );

  function expandFoldsAt(positions: number[]) {
    const hit = new Set<number>();
    for (const d of positions) {
      const seamIndex = seams.indexOf(d);
      if (seamIndex >= 0 && folds[seamIndex])
        hit.add(folds[seamIndex].sectionIndex);
    }
    if (hit.size === 0) return false;
    setFoldedIdx((prev) => {
      const next = new Set(prev);
      for (const i of hit) next.delete(i);
      return next;
    });
    return true;
  }

  /* ── Edits: diff the displayed text, splice into the real one ── */

  const lastDisplayedRef = React.useRef(displayed);
  React.useEffect(() => {
    lastDisplayedRef.current = displayed;
  }, [displayed]);

  function handleDisplayedChange(next: string, caret: number) {
    const old = lastDisplayedRef.current;
    let p = 0;
    const minL = Math.min(old.length, next.length);
    while (p < minL && old[p] === next[p]) p++;
    let s = 0;
    while (
      s < minL - p &&
      old[old.length - 1 - s] === next[next.length - 1 - s]
    )
      s++;
    const inserted = next.slice(p, next.length - s);
    // A replacement crossing a fold would silently touch hidden text —
    // expand instead and let the keystroke land on the visible document.
    const crossed = seams.filter((d) => d > p && d < old.length - s);
    if (crossed.length > 0) {
      expandFoldsAt(crossed);
      return;
    }
    const rStart = d2r(p);
    const rEnd = d2r(old.length - s);
    lastDisplayedRef.current = next;
    pendingCaretRef.current = { start: caret, end: caret };
    onChange(value.slice(0, rStart) + inserted + value.slice(rEnd));
  }

  // Restore the caret after programmatic inserts (tag completion) and let
  // native typing keep its own caret.
  React.useLayoutEffect(() => {
    const caret = pendingCaretRef.current;
    if (caret === null) return;
    pendingCaretRef.current = null;
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (
      textarea.selectionStart !== caret.start ||
      textarea.selectionEnd !== caret.end
    ) {
      textarea.setSelectionRange(caret.start, caret.end);
    }
  }, [displayed]);

  /* ── Caret / selection sync ────────────────────────────────── */

  function sync() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    setCaretDisplayed(textarea.selectionStart);
    onSelectionChange(d2r(textarea.selectionStart), d2r(textarea.selectionEnd));
    // A selection spanning a collapsed fold would edit hidden text — open it.
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (end > start) expandFoldsAt(seams.filter((d) => d > start && d < end));
  }

  const caretLine = React.useMemo(() => {
    if (caretDisplayed < 0 || caretDisplayed > displayed.length) return -1;
    let line = 0;
    for (let i = 0; i < caretDisplayed; i++) {
      if (displayed.charCodeAt(i) === 10) line++;
    }
    return line;
  }, [displayed, caretDisplayed]);

  /* ── Structure over the displayed text (for the backdrop) ────── */

  const scenes = React.useMemo(
    () => parseScenes(displayed, caretLine),
    [displayed, caretLine],
  );

  // Displayed offset of each visible `>` header line → its section.
  const headerAt = React.useMemo(() => {
    const map = new Map<
      number,
      { sectionIndex: number; folded: boolean; summary: string | null }
    >();
    sections.forEach((section, sectionIndex) => {
      if (section.name === null) return;
      const folded = foldedIdx.has(sectionIndex);
      let summary: string | null = null;
      if (folded) {
        const tagged = parseScenes(
          value.slice(section.bodyStart, section.end),
        ).filter((s) => s.tag);
        const secs = tagged.reduce((sum, s) => sum + s.seconds, 0);
        summary =
          tagged.length > 0
            ? `${tagged.length} ${tagged.length === 1 ? "scene" : "scenes"}${
                secs > 0 ? ` · ${sceneRuntimeLabel(secs)}` : ""
              }`
            : "…";
      }
      map.set(r2d(section.headerStart), { sectionIndex, folded, summary });
    });
    return map;
  }, [sections, foldedIdx, value, r2d]);

  const globalTagged = React.useMemo(
    () => parseScenes(value).filter((s) => s.tag),
    [value],
  );

  const knownTags = React.useMemo(() => {
    const used = globalTagged.map((s) => s.tag!) as string[];
    return [...new Set([...used, ...STARTER_TAGS])];
  }, [globalTagged]);

  /* ── Fold-boundary keystroke guards ───────────────────────── */

  function guardKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (seams.length === 0) return false;
    if (end > start) {
      if (seams.some((d) => d > start && d < end)) {
        expandFoldsAt(seams.filter((d) => d > start && d < end));
        e.preventDefault();
        return true;
      }
      return false;
    }
    const editing =
      e.key.length === 1 || ["Backspace", "Delete", "Enter"].includes(e.key);
    if (!editing) return false;
    if (seams.includes(start)) {
      expandFoldsAt([start]);
      e.preventDefault();
      return true;
    }
    if (e.key === "Delete" && seams.includes(start + 1)) {
      expandFoldsAt([start + 1]);
      e.preventDefault();
      return true;
    }
    if (e.key === "Backspace" && seams.includes(start - 1)) {
      expandFoldsAt([start - 1]);
      e.preventDefault();
      return true;
    }
    return false;
  }

  /* ── Slash suggestions ────────────────────────────────────── */

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
    setSlashPrefix(null);
    handleDisplayedChange(next, lineStart + tag.length + 1);
  }

  /** ⌘B / ⌘I / ⌘U — wrap (or unwrap) the selection in a style marker. */
  function toggleWrap(marker: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const text = textarea.value;
    const s = textarea.selectionStart;
    const e = textarea.selectionEnd;
    const sel = text.slice(s, e);
    let next: string;
    let ns: number;
    let ne: number;
    if (
      sel.startsWith(marker) &&
      sel.endsWith(marker) &&
      sel.length >= marker.length * 2
    ) {
      const inner = sel.slice(marker.length, sel.length - marker.length);
      next = text.slice(0, s) + inner + text.slice(e);
      ns = s;
      ne = s + inner.length;
    } else if (
      text.slice(Math.max(0, s - marker.length), s) === marker &&
      text.slice(e, e + marker.length) === marker
    ) {
      next =
        text.slice(0, s - marker.length) + sel + text.slice(e + marker.length);
      ns = s - marker.length;
      ne = ns + sel.length;
    } else {
      next = text.slice(0, s) + marker + sel + marker + text.slice(e);
      ns = s + marker.length;
      ne = ns + sel.length;
    }
    handleDisplayedChange(next, ne);
    pendingCaretRef.current = { start: ns, end: ne };
  }

  const suggestions =
    slashPrefix !== null
      ? knownTags.filter((t) => t.startsWith(slashPrefix) && t !== slashPrefix)
      : [];

  /* ── Jumps ────────────────────────────────────────────────── */

  function jumpToScene(startChar: number) {
    const holderIndex = sections.findLastIndex(
      (s) => startChar >= s.bodyStart && startChar <= s.end,
    );
    if (holderIndex >= 0 && foldedIdx.has(holderIndex)) {
      setFoldedIdx((prev) => {
        const next = new Set(prev);
        next.delete(holderIndex);
        return next;
      });
    }
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el = backdropRef.current?.querySelector(
          `[data-line-r="${startChar}"]`,
        );
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }),
    );
  }

  React.useImperativeHandle(handleRef, () => ({ jumpToScene }));

  /* ── Render ───────────────────────────────────────────────── */

  return (
    <div>
      {/* Scene map — one chip per tagged scene (folded ones included). */}
      {globalTagged.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-2 md:px-5">
          {globalTagged.map((scene) => {
            const hue = hueClasses(scene.tag!);
            return (
              <button
                key={scene.startChar}
                type="button"
                onClick={() => jumpToScene(scene.startChar)}
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

      <div className="relative">
        {/* Floats — appearing must never shift the text under the caret. */}
        {slashPrefix !== null && suggestions.length > 0 && (
          <div className="absolute top-2 right-3 z-10 flex max-w-[70%] flex-wrap items-center justify-end gap-1.5 rounded-full border bg-popover px-2 py-1 shadow-card-hover">
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

        {/* Backdrop paints scene rules, header styling, and the fold
            chevrons; the textarea's own text is transparent on top. */}
        <div
          ref={backdropRef}
                    className={cn(
            "pointer-events-none absolute inset-0 w-full",
            TEXT_METRICS,
          )}
          style={{ maxWidth: "72ch" }}
        >
          {(() => {
            return scenes.map((scene) => {
              const hue = scene.tag ? hueClasses(scene.tag) : null;
              const sceneStart = scene.startChar;
              const lines = scene.text.split("\n");
              let lineOffset = sceneStart;
              return (
                <div
                  key={sceneStart}
                  className={cn(
                    "scroll-mt-24",
                    hue && ["-ml-4 pl-4", hue.rule],
                  )}
                >
                  {lines.map((line, i) => {
                    const dStart = lineOffset;
                    lineOffset += line.length + 1;
                    const header = headerAt.get(dStart);
                    if (header) {
                      return (
                        <div
                          key={dStart}
                          data-line-r={d2r(dStart)}
                          className="relative"
                        >
                          <button
                            type="button"
                            aria-expanded={!header.folded}
                            aria-label={
                              header.folded
                                ? "Expand section"
                                : "Collapse section"
                            }
                            onClick={() =>
                              setFoldedIdx((prev) => {
                                const next = new Set(prev);
                                if (next.has(header.sectionIndex))
                                  next.delete(header.sectionIndex);
                                else next.add(header.sectionIndex);
                                return next;
                              })
                            }
                            className="pointer-events-auto absolute top-1 -left-4 z-10 flex size-5 items-center justify-center rounded-md text-muted-foreground/60 hover:bg-accent hover:text-foreground md:-left-6"
                          >
                            <ChevronRight
                              className={cn(
                                "size-3.5 transition-transform",
                                !header.folded && "rotate-90",
                              )}
                              aria-hidden
                            />
                          </button>
                          {/* The typed `>` stays in the text (caret space)
                              but the chevron is its visual. */}
                          <span className="opacity-0">{line.slice(0, 1)}</span>
                          <span className="text-foreground">
                            {line.slice(1) || "\u200b"}
                          </span>
                          {header.summary && (
                            <span className="pl-3 text-sm text-muted-foreground/70">
                              {header.summary}
                            </span>
                          )}
                        </div>
                      );
                    }
                    const isSceneHeader = scene.hasHeader && i === 0;
                    if (line.startsWith(">>")) {
                      // Escaped literal: `>>` renders as a single `>`.
                      return (
                        <div key={dStart} data-line-r={d2r(dStart)}>
                          <span className="opacity-0">{line.slice(0, 1)}</span>
                          {renderInline(line.slice(1))}
                        </div>
                      );
                    }
                    if (isSceneHeader) {
                      // Only the /tag token carries the hue; a note after
                      // the first space reads as plain text.
                      const space = line.search(/[ \t]/);
                      const tagPart = space < 0 ? line : line.slice(0, space);
                      const rest = space < 0 ? "" : line.slice(space);
                      return (
                        <div key={dStart} data-line-r={d2r(dStart)}>
                          <span className={cn(hue?.text)}>{tagPart}</span>
                          {rest ? renderInline(rest) : null}
                        </div>
                      );
                    }
                    return (
                      <div key={dStart} data-line-r={d2r(dStart)}>
                        {renderInline(line)}
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()}
        </div>
        <Textarea
          ref={textareaRef}
          value={displayed}
          onChange={(e) => {
            handleDisplayedChange(e.target.value, e.target.selectionStart);
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
              return;
            }
            if (guardKey(e)) return;
            if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
              const marker =
                e.key === "b" ? "**" : e.key === "i" ? "*" : e.key === "u" ? "__" : null;
              if (marker) {
                e.preventDefault();
                toggleWrap(marker);
                return;
              }
            }
            if (e.key === "Tab" && suggestions.length > 0) {
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
