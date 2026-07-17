import { wordCount } from "./script";

/** A `/tag` line opens a scene that runs until a blank line (double Enter),
 *  the next `/tag` line, a `>Section` line, or the end of the script.
 *  `/broll beach sunset` = tag "broll", note "beach sunset". */
export const SCENE_HEADER = /^\/([a-zA-Z][\w-]*)(?:[ \t]+(.*))?[ \t]*$/;

/** A `>Name` line opens a collapsible section that runs until the next
 *  `>` line or the end of the script. */
export const SECTION_HEADER = /^>[ \t]*(.*)$/;

export type Section = {
  /** null = the implicit block before the first `>` line. */
  name: string | null;
  /** Offset of the `>` line (== bodyStart for the implicit block). */
  headerStart: number;
  /** Offset just past the header line's newline; body runs to `end`. */
  bodyStart: number;
  /** Exclusive end of the body (before the \n preceding the next header). */
  end: number;
};

export function parseSections(script: string): Section[] {
  const sections: Section[] = [];
  const lines = script.split("\n");
  let offset = 0;
  let open: Section = { name: null, headerStart: 0, bodyStart: 0, end: 0 };
  for (const line of lines) {
    const match = SECTION_HEADER.exec(line);
    if (match) {
      open.end = Math.max(open.bodyStart, offset - 1);
      // Drop the implicit block only when the script *starts* with a header;
      // otherwise it stays (even empty) so there's room to type above.
      if (open.name !== null || offset > 0) sections.push(open);
      const bodyStart = Math.min(offset + line.length + 1, script.length);
      open = { name: match[1].trim(), headerStart: offset, bodyStart, end: 0 };
    }
    offset += line.length + 1;
  }
  open.end = script.length;
  sections.push(open);
  return sections;
}

/** Starter shot vocabulary — merged with tags already used in the script. */
export const STARTER_TAGS = [
  "talking-head",
  "interview",
  "broll",
  "screen",
  "animation",
  "voiceover",
  "hook",
] as const;

export type Scene = {
  /** null = untagged text (before the first `/tag`, or after a `/` end). */
  tag: string | null;
  note: string | null;
  /** True when the first line is a marker (`/tag` header or `/` end). */
  hasHeader: boolean;
  /** Character offset of the scene's first line. */
  startChar: number;
  /** Scene content including its marker line, when it has one. */
  text: string;
  words: number;
  seconds: number;
};

export type ShotGroup = {
  tag: string;
  count: number;
  words: number;
  seconds: number;
  scenes: Scene[];
};

function sceneSeconds(words: number): number {
  return Math.round(words / 2.5); // PRD §4.2 pacing
}

export function parseScenes(script: string, caretLine = -1): Scene[] {
  const lines = script.split("\n");
  const scenes: Scene[] = [];
  let current: {
    tag: string | null;
    note: string | null;
    start: number;
    hasHeader: boolean;
  } = { tag: null, note: null, start: 0, hasHeader: false };
  let offset = 0;
  let bodyStart = 0; // offset just past the current scene's marker line

  const push = (end: number) => {
    const text = script.slice(current.start, end);
    // Words exclude the marker line itself — it's direction, not narration.
    const body = script.slice(Math.min(bodyStart, end), end);
    const words = wordCount(current.hasHeader ? body : text);
    // Every scene is kept — even an empty untagged one (a lone blank line
    // between scenes): the editor backdrop must reproduce every line box.
    scenes.push({
      tag: current.tag,
      note: current.note,
      hasHeader: current.hasHeader,
      startChar: current.start,
      text,
      words,
      seconds: sceneSeconds(words),
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = SCENE_HEADER.exec(line);
    // A blank line or a `>Section` header ends a tagged scene. Two
    // exceptions keep the scene with the writer mid-keystroke: the line the
    // caret is on (a single Enter just happened there) and a trailing blank
    // at the end of the script.
    const escapes =
      !match &&
      current.tag !== null &&
      (line.startsWith(">") ||
        (line.trim() === "" && i !== caretLine && i < lines.length - 1));
    if (match || escapes) {
      if (offset > 0) push(offset - 1); // exclude the \n before this line
      current = {
        tag: match ? match[1].toLowerCase() : null,
        note: match ? match[2]?.trim() || null : null,
        start: offset,
        hasHeader: Boolean(match),
      };
      bodyStart = match ? offset + line.length + 1 : offset;
    }
    offset += line.length + 1;
  }
  push(script.length);
  return scenes;
}

export function groupScenes(scenes: Scene[]): ShotGroup[] {
  const groups = new Map<string, ShotGroup>();
  for (const scene of scenes) {
    if (!scene.tag) continue;
    const group = groups.get(scene.tag) ?? {
      tag: scene.tag,
      count: 0,
      words: 0,
      seconds: 0,
      scenes: [],
    };
    group.count += 1;
    group.words += scene.words;
    group.seconds += scene.seconds;
    group.scenes.push(scene);
    groups.set(scene.tag, group);
  }
  return [...groups.values()].sort((a, b) => b.seconds - a.seconds);
}

/** Deterministic hue slot (1–6) for a tag, stable across renders/sessions. */
export function sceneHue(tag: string): number {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 6) + 1;
}

export function sceneRuntimeLabel(seconds: number): string {
  if (seconds < 90) return `~${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `~${minutes}m${rest > 0 ? String(rest).padStart(2, "0") : ""}`;
}
