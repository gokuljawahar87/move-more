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
  //
  // The challenge weeks run Monday–Sunday so the winner is settled by
  // Monday morning. 1 Sep is a Tuesday, so week 1 is a 6-day week
  // (Tue–Sun) and every week after is a full Mon–Sun.
  //
  // Two different end dates, deliberately:
  //
  //   end          — the event itself, 31 Oct. Drives the header
  //                  countdown, scoring, and the Champions tab.
  //   challengeEnd — the weekly challenges, 25 Oct. A Sunday, which
  //                  gives exactly 8 Monday-to-Sunday weeks. Running
  //                  them to the 31st would add a 6-day stub week
  //                  ending on a Saturday, so the final weekly winner
  //                  couldn't be announced on a Monday.
  start: new Date("2026-09-01T00:00:00+05:30"),
  end: new Date("2026-10-31T22:00:00+05:30"),
  challengeEnd: new Date("2026-10-25T22:00:00+05:30"),

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

/**
 * The earliest activity date the app should ever display.
 *
 * Belt-and-braces alongside the `season` column. That column has a
 * DEFAULT of 2, so any row written by a route that doesn't set it
 * explicitly — the older Strava callback and token routes do this —
 * lands in the current season no matter when it happened. Filtering on
 * the date as well means a mistagged row still can't show up.
 */
export function displayWindowStart(now: Date = new Date()): Date {
  return now.getTime() >= SEASON.start.getTime() ? SEASON.start : SEASON.trialStart;
}

// ═══════════════════════════════════════════════════════════════
// NIGHT-HOURS EXCLUSION
//
// Activity overlapping 23:00–03:30 IST doesn't count and isn't shown.
// This is a SAFETY rule, not a scheduling one: unlike office hours, a
// declared leave day does not lift it. Nobody should feel pushed into
// running on unlit roads at two in the morning to hold a streak.
// ═══════════════════════════════════════════════════════════════

export const NIGHT_START_MINUTE = 23 * 60; // 23:00
export const NIGHT_END_MINUTE = 3 * 60 + 30; // 03:30

/**
 * The rule applies from this date onward, not to the whole season.
 *
 * It was introduced mid-season, and applying it retroactively would
 * have stripped points from people who had already earned them under
 * the rules as they stood at the time. Changing the rules is fine;
 * changing them backwards is not.
 */
export const NIGHT_RULE_FROM = new Date("2026-09-05T00:00:00+05:30");

/** Minutes past midnight, IST. */
function istMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return (parseInt(get("hour"), 10) % 24) * 60 + parseInt(get("minute"), 10);
}

/**
 * Does this activity touch the night window at any point?
 *
 * The window wraps midnight, so it's treated as two segments —
 * 23:00–24:00 and 00:00–03:30 — and the activity is checked against
 * both, including the case where the activity itself runs past
 * midnight.
 */
export function overlapsNightHours(
  startUTC: Date,
  durationSec: number
): boolean {
  // Anything recorded before the rule existed is left alone
  if (startUTC < NIGHT_RULE_FROM) return false;

  const start = istMinutes(startUTC);
  const end = start + Math.max(0, Math.round(durationSec / 60));

  const segments: [number, number][] = [
    [NIGHT_START_MINUTE, 24 * 60], // 23:00 → midnight
    [0, NIGHT_END_MINUTE], // midnight → 03:30
    // The same two segments on the following day, for an activity that
    // starts before 23:00 and runs into the night
    [NIGHT_START_MINUTE + 24 * 60, 48 * 60],
    [24 * 60, NIGHT_END_MINUTE + 24 * 60],
  ];

  return segments.some(([a, b]) => start < b && end > a);
}
