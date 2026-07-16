import type { VideoType } from "@/lib/types";

// PRD §4.7 — pure combinatorics, no AI.
const TAKE_STARTERS = [
  "Everyone's wrong about ___",
  "___ is overrated, ___ is underrated",
  "Stop ___, start ___",
  "The real reason ___",
  "___ changed and nobody noticed",
];

const TOPICS = [
  "AI coding tools",
  "vibe coding",
  "design taste",
  "what AI still can't do",
  "building solo",
  "speed vs quality",
];

const TEACH_FORMATS = [
  "How I ___",
  "Why ___ feels ___",
  "3 things ___",
  "Watch me ___",
  "The mistake everyone makes with ___",
];

const STORY_PROMPTS = [
  "A time I failed at ___",
  "How I actually learned ___",
  "The moment I realized ___",
  "What building ___ taught me",
];

export type Spark = { type: VideoType; text: string };

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function fill(pattern: string): string {
  let result = pattern;
  while (result.includes("___")) {
    result = result.replace("___", pick(TOPICS));
  }
  return result;
}

export function generateSparks(count = 9): Spark[] {
  const sparks: Spark[] = [];
  const sources: { type: VideoType; patterns: string[] }[] = [
    { type: "take", patterns: TAKE_STARTERS },
    { type: "teach", patterns: TEACH_FORMATS },
    { type: "story", patterns: STORY_PROMPTS },
  ];
  const seen = new Set<string>();
  let guard = 0;
  while (sparks.length < count && guard++ < 100) {
    const source = sources[sparks.length % sources.length];
    const text = fill(pick(source.patterns));
    if (seen.has(text)) continue;
    seen.add(text);
    sparks.push({ type: source.type, text });
  }
  return sparks;
}
