// lib/season.ts
//
// Single source of truth for the current season. The Header reads from
// this, so you change the dates here and nowhere else.
//
// (When we do the full backend refactor, the scoring routes will read
// from this file too, replacing the six copies of CHALLENGE_START.)

export const SEASON = {
  number: 2,
  title: "Move-Athon Mania",
  tagline: "Season Two",

  // ⬇️ SET YOUR REAL DATES HERE
  start: new Date("2026-09-01T00:00:00+05:30"),
  end: new Date("2026-09-30T22:00:00+05:30"),

  // Trial period — the app is open, but nothing here is ever scored.
  // Its purpose is to collect real fraud examples so the detection
  // thresholds can be tuned before Season 2 starts.
  trialStart: new Date("2026-08-15T00:00:00+05:30"),

  // The Champions tab stays hidden until the season ends. Flip this to
  // true if you want to preview that tab before then.
  forceShowChampions: false,

  // ── Office-hours exclusion ────────────────────────────────────────
  // Activity overlapping this window on a working day is excluded from
  // scoring and from streaks. Minutes from midnight, IST.
  workHours: {
    startMinute: 7 * 60 + 30, // 07:30
    endMinute: 15 * 60 + 45, // 15:45
  },

  // ⬇️ Declared holidays — office hours are NOT excluded on these days.
  // Season 1 had these hardcoded as 2025-10-20 / 21 in four separate
  // route files; update the list here instead.
  holidays: [] as string[],
};

/**
 * Which season an activity belongs to, decided by when it happened.
 *   0 = trial (never scored)
 *   2 = Season 2
 * Anything before the trial is Season 1 and is not re-synced.
 */
export function seasonForDate(date: Date): number {
  if (date.getTime() >= SEASON.start.getTime()) return SEASON.number;
  return 0;
}

/** Earliest date the sync should reach back to. */
export const SYNC_FLOOR = SEASON.trialStart;

/**
 * Which season the app should DISPLAY right now.
 *
 * Read routes filter on this, so:
 *   - during the trial → 0, testers see only trial data
 *   - from Sep 1       → 2, trial data vanishes on its own
 *
 * Season 1 is never displayed; it stays in the table as history.
 */
export function activeSeason(now: Date = new Date()): number {
  return now.getTime() >= SEASON.start.getTime() ? SEASON.number : 0;
}

/** Champions tab is revealed only once the season has finished. */
export function showChampions(now: Date = new Date()): boolean {
  if (SEASON.forceShowChampions) return true;
  return now.getTime() >= SEASON.end.getTime();
}

export type SeasonStatus = {
  phase: "upcoming" | "live" | "ended";
  /** 0–100, how far through the season we are */
  progress: number;
  /** Day number within the season, 1-indexed. Null before it starts. */
  dayNumber: number | null;
  totalDays: number;
  /** Human-readable time remaining, e.g. "12d 04h" */
  remaining: string;
};

export function getSeasonStatus(now: Date = new Date()): SeasonStatus {
  const startMs = SEASON.start.getTime();
  const endMs = SEASON.end.getTime();
  const nowMs = now.getTime();

  const totalMs = Math.max(1, endMs - startMs);
  const totalDays = Math.ceil(totalMs / 86_400_000);

  if (nowMs < startMs) {
    return {
      phase: "upcoming",
      progress: 0,
      dayNumber: null,
      totalDays,
      remaining: formatGap(startMs - nowMs),
    };
  }

  if (nowMs >= endMs) {
    return {
      phase: "ended",
      progress: 100,
      dayNumber: totalDays,
      totalDays,
      remaining: "",
    };
  }

  const elapsed = nowMs - startMs;
  return {
    phase: "live",
    progress: Math.min(100, (elapsed / totalMs) * 100),
    dayNumber: Math.floor(elapsed / 86_400_000) + 1,
    totalDays,
    remaining: formatGap(endMs - nowMs),
  };
}

function formatGap(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${String(hours).padStart(2, "0")}h`;
  if (hours > 0)
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m`;
}
