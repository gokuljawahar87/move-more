// lib/teams.ts
//
// Single source of truth for Season 2 teams.
//
// Season 1 kept a copy of this map inside Leaderboard.tsx and another
// inside TeamPerformance.tsx, so adding a team meant editing two files
// and any mismatch showed up as a silently missing logo. Everything now
// reads from here.

export type Team = {
  /** Canonical name — how it should be displayed */
  name: string;
  /** File in /public/logos */
  logo: string;
};

export const TEAMS: Team[] = [
  { name: "ALPHA WOLVES", logo: "/logos/alpha.png" },
  { name: "BISON UNLEASHED", logo: "/logos/bison.png" },
  { name: "CHEEKY CHEETAHS", logo: "/logos/cheetahs.png" },
  { name: "EAGLE SQUAD", logo: "/logos/eagle.png" },
  { name: "KUNGFU PANDAS", logo: "/logos/panda.png" },
  { name: "PANTHER KINGS", logo: "/logos/panther.png" },
  { name: "REDBULL SYNDICATE", logo: "/logos/redbull.png" },
  { name: "ROYAL TIGERS", logo: "/logos/tigers.png" },
];

/**
 * Alternate spellings seen in the source data, mapped to the canonical
 * name. Add to this rather than creating a second TEAMS entry, so the
 * leaderboard never shows the same team twice.
 */
const ALIASES: Record<string, string> = {
  "kunfu pandas": "KUNGFU PANDAS", // missing G
  "kung fu pandas": "KUNGFU PANDAS", // spaced
  "red bull syndicate": "REDBULL SYNDICATE", // spaced
};

/**
 * Normalise for comparison: trims, collapses internal whitespace, and
 * lowercases. This is what makes "ROYAL TIGERS " (trailing space)
 * resolve to the same team as "Royal Tigers".
 */
function normalise(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

const BY_KEY = new Map<string, Team>();
for (const team of TEAMS) {
  BY_KEY.set(normalise(team.name), team);
}
for (const [alias, canonical] of Object.entries(ALIASES)) {
  const team = TEAMS.find((t) => t.name === canonical);
  if (team) BY_KEY.set(normalise(alias), team);
}

/** Resolve any raw team string from the database to a known team. */
export function findTeam(raw?: string | null): Team | null {
  if (!raw) return null;
  return BY_KEY.get(normalise(raw)) ?? null;
}

/** Logo path for a team, or null if unrecognised. */
export function teamLogo(raw?: string | null): string | null {
  return findTeam(raw)?.logo ?? null;
}

/**
 * Canonical display name. Falls back to the trimmed raw value so an
 * unrecognised team still renders readably instead of vanishing.
 */
export function teamName(raw?: string | null): string {
  if (!raw) return "No team";
  return findTeam(raw)?.name ?? raw.trim();
}
