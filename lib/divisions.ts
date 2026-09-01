// lib/divisions.ts
//
// The Pacesetters.
//
// A handful of people run regularly enough that most daily challenges
// are routine for them. Rather than bar them — which would be an odd
// message in an event about encouraging activity — they play as normal,
// see their own progress, and are ranked in their own column.
//
// They are not eligible for the weekly champion slots; those belong to
// the main board.

export const PACESETTER_IDS: ReadonlySet<string> = new Set([
  "U433518",
  "U261638",
  "U262861",
  "U420814",
  "U443186",
]);

export const PACESETTER_LABEL = "Pacesetters";
export const MAIN_LABEL = "Open";

export function isPacesetter(userId?: string | null): boolean {
  return !!userId && PACESETTER_IDS.has(userId);
}
