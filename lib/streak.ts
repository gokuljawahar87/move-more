// lib/streak.ts
//
// Streak rules, as agreed:
//   - One SINGLE activity of 30 minutes or more of moving time
//     (two 15-minute walks do not qualify)
//   - Run, walk or cycle
//   - Must not overlap office hours
//   - Must be valid (not voided in review)
//
// Day boundaries are computed in IST. This matters more than it sounds:
// an activity at 06:00 IST is 00:30 UTC the same day, but one at 02:00
// IST is 20:30 UTC the PREVIOUS day. Keying days off UTC would put those
// two in different buckets and silently break streaks overnight.

import { SEASON } from "./season";

export const STREAK_MIN_MOVING_SECONDS = 30 * 60;

const STREAK_TYPES = new Set([
  "Run",
  "TrailRun",
  "Walk",
  "Hike",
  "Reclassified-Walk",
  "Ride",
  "VirtualRide",
]);

/**
 * Calendar date in IST as "YYYY-MM-DD".
 *
 * Uses Intl with an explicit timeZone rather than the
 * `new Date(d.toLocaleString(...))` trick used elsewhere in this
 * codebase — that trick produces a Date in server-local time that merely
 * READS as IST, so any later .toISOString() on it shifts the date by
 * 5h30m and can land on the wrong day.
 */
export function istDayKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Hour and minute in IST, plus weekday (0 = Sunday). */
function istClock(date: Date): { minutes: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;

  const hour = parseInt(get("hour"), 10) % 24;
  const minute = parseInt(get("minute"), 10);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return {
    minutes: hour * 60 + minute,
    weekday: days.indexOf(get("weekday")),
  };
}

/** Does this activity overlap the office-hours exclusion window? */
export function overlapsOfficeHours(
  startUTC: Date,
  movingSeconds: number
): boolean {
  const { minutes: startMin, weekday } = istClock(startUTC);

  // Weekends are never excluded
  if (weekday === 0 || weekday === 6) return false;

  // Defaults, so a season config missing workHours/holidays degrades to
  // the standard window rather than throwing and zeroing every stat.
  const holidays: string[] = (SEASON as any).holidays ?? [];
  const workStart: number =
    (SEASON as any).workHours?.startMinute ?? 7 * 60 + 30;
  const workEnd: number =
    (SEASON as any).workHours?.endMinute ?? 15 * 60 + 45;

  // Declared holidays are never excluded
  if (holidays.includes(istDayKey(startUTC))) return false;

  const endMin = startMin + Math.round(movingSeconds / 60);

  return startMin <= workEnd && endMin >= workStart;
}

export type StreakActivity = {
  moving_time?: number | null;
  type?: string | null;
  derived_type?: string | null;
  start_date: string;
  is_valid?: boolean | null;
  /** Declared personal leave — lifts the office-hours exclusion */
  on_leave_day?: boolean | null;
};

/** Does a single activity qualify as a streak day on its own? */
export function qualifiesForStreak(a: StreakActivity): boolean {
  if (a.is_valid === false) return false;

  const moving = Number(a.moving_time ?? 0);
  if (moving < STREAK_MIN_MOVING_SECONDS) return false;

  const kind = a.derived_type || a.type || "";
  if (!STREAK_TYPES.has(kind)) return false;

  const start = new Date(a.start_date);
  if (!a.on_leave_day && overlapsOfficeHours(start, moving)) return false;

  return true;
}

export type StreakResult = {
  currentStreak: number;
  maxStreak: number;
  /** IST dates that qualified, ascending */
  qualifyingDays: string[];
  /** True if today already has a qualifying activity */
  todayDone: boolean;
};

function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

export function computeStreaks(
  activities: StreakActivity[],
  now: Date = new Date()
): StreakResult {
  const days = new Set<string>();

  for (const a of activities) {
    if (qualifiesForStreak(a)) {
      days.add(istDayKey(new Date(a.start_date)));
    }
  }

  const sorted = [...days].sort();

  // Longest run of consecutive days anywhere in the season
  let maxStreak = 0;
  let run = 0;
  let prev: string | null = null;

  for (const day of sorted) {
    run = prev && addDays(prev, 1) === day ? run + 1 : 1;
    if (run > maxStreak) maxStreak = run;
    prev = day;
  }

  // Current streak counts back from today. If today has nothing yet we
  // start from yesterday — the day isn't over, so an unfinished today
  // shouldn't read as a broken streak.
  const today = istDayKey(now);
  const todayDone = days.has(today);

  let currentStreak = 0;
  let cursor = todayDone ? today : addDays(today, -1);

  while (days.has(cursor)) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }

  return {
    currentStreak,
    maxStreak,
    qualifyingDays: sorted,
    todayDone,
  };
}
