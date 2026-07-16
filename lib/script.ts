/** Word count + spoken-runtime estimate (PRD §4.2: seconds = words / 2.5). */
export function wordCount(text: string): number {
  return (text.trim().match(/\S+/g) ?? []).length;
}

export function runtimeLabel(words: number): string {
  const seconds = Math.round(words / 2.5);
  if (seconds < 90) return `~${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `~${minutes}m${String(rest).padStart(2, "0")}s`;
}
