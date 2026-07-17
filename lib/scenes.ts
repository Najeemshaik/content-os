import { wordCount } from "./script";

/** A `/tag` line opens a scene that runs until a blank line (double Enter),
 *  the next `/tag` line, or the end of the script. `/broll beach sunset` =
 *  tag "broll", note "beach sunset". */
export const SCENE_HEADER = /^\/([a-zA-Z][\w-]*)(?:[ \t]+(.*))?[ \t]*$/;

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

export function parseScenes(script: string): Scene[] {
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
    // Keep even whitespace-only untagged scenes: the editor backdrop must
    // reproduce every character so its line boxes match the textarea's.
    if (current.tag !== null || text.length > 0) {
      scenes.push({
        tag: current.tag,
        note: current.note,
        hasHeader: current.hasHeader,
        startChar: current.start,
        text,
        words,
        seconds: sceneSeconds(words),
      });
    }
  };

  for (const line of lines) {
    const match = SCENE_HEADER.exec(line);
    // A blank line ends a tagged scene — text after it is untagged again.
    const escapes = !match && current.tag !== null && line.trim() === "";
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
