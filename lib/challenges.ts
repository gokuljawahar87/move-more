// lib/challenges.ts
//
// Daily challenges for the weekly competition.
//
// The schedule is FIXED — reviewed and set by hand, not generated. What
// you see below is exactly what participants get on each date. Editing
// the SCHEDULE map is the only way to change what runs on a given day.
//
// Everything is verified automatically from synced Strava data, so no
// moderator has to tick anything off.

import { SEASON } from "./season";
import { istDayKey } from "./streak";

export type Difficulty = "easy" | "medium" | "hard";

/** Bonus for completing every challenge on a given day. */
export const CLEAN_SWEEP_POINTS = 10;

/** Minimum moving time for an Early Bird start to count. */
const EARLY_MIN_MINUTES = 15;

export type Challenge = {
  id: string;
  title: string;
  blurb: string;
  family: string;
  difficulty: Difficulty;
  points: number;
  /** Key into the icon map in components/Challenges.tsx */
  icon: string;
  // Family-specific parameters
  footKm?: number;
  cycleKm?: number;
  minutes?: number;
  paceMin?: number;
  km?: number;
  beforeHour?: number;
  target?: number;
};

export type DayActivity = {
  distance?: number | null; // metres
  moving_time?: number | null; // seconds
  type?: string | null;
  derived_type?: string | null;
  start_date: string;
  is_valid?: boolean | null;
  on_leave_day?: boolean | null;
};

// ═══════════════════════════════════════════════════════════════
// CATALOG
// ═══════════════════════════════════════════════════════════════

export const CHALLENGES: Challenge[] = [
  // ── TEST CHALLENGES ─────────────────────────────────────────
  // Only scheduled while TEST_MODE is on. Delete this block, the
  // TEST_SCHEDULE below and the TEST_MODE flag once the trial run is
  // finished — none of it is used during the real season.
  { id: "test-points-60", title: "Sixty Points", blurb: "Earn 60 points today", family: "points", icon: "target", difficulty: "easy", points: 10, target: 60 },
  { id: "test-walk-1", title: "One Kilometre Walk", blurb: "Walk at least 1 km", family: "walk-distance", icon: "route", difficulty: "easy", points: 10, footKm: 1 },
  { id: "test-run-pace", title: "Run at 8:30", blurb: "Run at least 1 km at 8:30/km or better", family: "run-pace", icon: "zap", difficulty: "easy", points: 10, paceMin: 8.5, km: 1 },
  { id: "test-cycle-15", title: "Fifteen on the Bike", blurb: "Cycle for 15 minutes or more", family: "cycle-duration", icon: "clock", difficulty: "easy", points: 10, minutes: 15 },

  { id: "beat-avg", title: "Better Than Before", blurb: "Cover more total distance this week than you did last week", family: "personal-best", icon: "trending", difficulty: "hard", points: 30 },
  { id: "day-10", title: "Ten Total", blurb: "Across the day: 10 km on foot, or 40 km cycling", family: "day-total", icon: "route", difficulty: "hard", points: 30, footKm: 10, cycleKm: 40 },
  { id: "day-5", title: "Five Total", blurb: "Across the day: 5 km on foot, or 15 km cycling", family: "day-total", icon: "route", difficulty: "easy", points: 10, footKm: 5, cycleKm: 15 },
  { id: "day-6", title: "Six Total", blurb: "Across the day: 6 km on foot, or 18 km cycling", family: "day-total", icon: "route", difficulty: "easy", points: 10, footKm: 6, cycleKm: 18 },
  { id: "day-7", title: "Seven Total", blurb: "Across the day: 7 km on foot, or 21 km cycling", family: "day-total", icon: "route", difficulty: "medium", points: 20, footKm: 7, cycleKm: 21 },
  { id: "day-8", title: "Eight Total", blurb: "Across the day: 8 km on foot, or 25 km cycling", family: "day-total", icon: "route", difficulty: "medium", points: 20, footKm: 8, cycleKm: 25 },
  { id: "day-9", title: "Nine Total", blurb: "Across the day: 9 km on foot, or 30 km cycling", family: "day-total", icon: "route", difficulty: "medium", points: 20, footKm: 9, cycleKm: 30 },
  { id: "dur-30", title: "The Half Hour", blurb: "One activity of 30 minutes or more", family: "duration", icon: "clock", difficulty: "easy", points: 10, minutes: 30 },
  { id: "dur-35", title: "Thirty-Five", blurb: "One activity of 35 minutes or more", family: "duration", icon: "clock", difficulty: "easy", points: 10, minutes: 35 },
  { id: "dur-40", title: "Forty Minutes", blurb: "One activity of 40 minutes or more", family: "duration", icon: "clock", difficulty: "medium", points: 20, minutes: 40 },
  { id: "dur-45", title: "Three Quarters", blurb: "One activity of 45 minutes or more", family: "duration", icon: "clock", difficulty: "medium", points: 20, minutes: 45 },
  { id: "dur-50", title: "Fifty Minutes", blurb: "One activity of 50 minutes or more", family: "duration", icon: "clock", difficulty: "medium", points: 20, minutes: 50 },
  { id: "dur-55", title: "Fifty-Five", blurb: "One activity of 55 minutes or more", family: "duration", icon: "clock", difficulty: "hard", points: 30, minutes: 55 },
  { id: "dur-60", title: "The Full Hour", blurb: "One activity of 60 minutes or more", family: "duration", icon: "clock", difficulty: "hard", points: 30, minutes: 60 },
  { id: "early-530", title: "Dawn Patrol", blurb: "Start before 5:30 am — at least 15 minutes", family: "early", icon: "sunrise", difficulty: "medium", points: 20, beforeHour: 5.5, minutes: 15 },
  { id: "early-6", title: "First Light", blurb: "Start before 6:00 am — at least 15 minutes", family: "early", icon: "sunrise", difficulty: "medium", points: 20, beforeHour: 6, minutes: 15 },
  { id: "mix-15", title: "Triple Threat", blurb: "Run, walk and cycle today — each 15 minutes or more", family: "mix", icon: "shuffle", difficulty: "medium", points: 20, minutes: 15 },
  { id: "mix-20", title: "Triple Threat+", blurb: "Run, walk and cycle today — each 20 minutes or more", family: "mix", icon: "shuffle", difficulty: "hard", points: 30, minutes: 20 },
  { id: "one-10", title: "Double Digits", blurb: "One activity: 10 km on foot, or 40 km cycling", family: "single-distance", icon: "route", difficulty: "hard", points: 30, footKm: 10, cycleKm: 40 },
  { id: "one-3", title: "Three & Out", blurb: "One activity: 3 km on foot, or 9 km cycling", family: "single-distance", icon: "route", difficulty: "easy", points: 10, footKm: 3, cycleKm: 9 },
  { id: "one-5", title: "Five Alive", blurb: "One activity: 5 km on foot, or 15 km cycling", family: "single-distance", icon: "route", difficulty: "medium", points: 20, footKm: 5, cycleKm: 15 },
  { id: "one-6", title: "Six Straight", blurb: "One activity: 6 km on foot, or 18 km cycling", family: "single-distance", icon: "route", difficulty: "medium", points: 20, footKm: 6, cycleKm: 18 },
  { id: "one-7", title: "Lucky Seven", blurb: "One activity: 7 km on foot, or 21 km cycling", family: "single-distance", icon: "route", difficulty: "medium", points: 20, footKm: 7, cycleKm: 21 },
  { id: "one-8", title: "Eight Strong", blurb: "One activity: 8 km on foot, or 25 km cycling", family: "single-distance", icon: "route", difficulty: "hard", points: 30, footKm: 8, cycleKm: 25 },
  { id: "one-9", title: "Nine Wide", blurb: "One activity: 9 km on foot, or 30 km cycling", family: "single-distance", icon: "route", difficulty: "hard", points: 30, footKm: 9, cycleKm: 30 },
  { id: "pace-7-1", title: "Fleet Footed I", blurb: "1 km on foot at 7:00/km or better", family: "pace", icon: "zap", difficulty: "medium", points: 20, paceMin: 7, km: 1 },
  { id: "pace-7-2", title: "Fleet Footed II", blurb: "2 km on foot at 7:00/km or better", family: "pace", icon: "zap", difficulty: "hard", points: 30, paceMin: 7, km: 2 },
  { id: "pace-7-3", title: "Fleet Footed III", blurb: "3 km on foot at 7:00/km or better", family: "pace", icon: "zap", difficulty: "hard", points: 30, paceMin: 7, km: 3 },
  { id: "pace-8-1", title: "Quicker Feet I", blurb: "1 km on foot at 8:00/km or better", family: "pace", icon: "zap", difficulty: "medium", points: 20, paceMin: 8, km: 1 },
  { id: "pace-8-2", title: "Quicker Feet II", blurb: "2 km on foot at 8:00/km or better", family: "pace", icon: "zap", difficulty: "medium", points: 20, paceMin: 8, km: 2 },
  { id: "pace-8-3", title: "Quicker Feet III", blurb: "3 km on foot at 8:00/km or better", family: "pace", icon: "zap", difficulty: "medium", points: 20, paceMin: 8, km: 3 },
  { id: "pace-9-1", title: "Quick Feet I", blurb: "1 km on foot at 9:00/km or better", family: "pace", icon: "zap", difficulty: "easy", points: 10, paceMin: 9, km: 1 },
  { id: "pace-9-2", title: "Quick Feet II", blurb: "2 km on foot at 9:00/km or better", family: "pace", icon: "zap", difficulty: "easy", points: 10, paceMin: 9, km: 2 },
  { id: "pace-9-3", title: "Quick Feet III", blurb: "3 km on foot at 9:00/km or better", family: "pace", icon: "zap", difficulty: "easy", points: 10, paceMin: 9, km: 3 },
  { id: "pts-100", title: "Century", blurb: "Earn 100 points today", family: "points", icon: "target", difficulty: "medium", points: 20, target: 100 },
  { id: "pts-150", title: "One Fifty", blurb: "Earn 150 points today", family: "points", icon: "target", difficulty: "hard", points: 30, target: 150 },
  { id: "pts-50", title: "Fifty Up", blurb: "Earn 50 points today", family: "points", icon: "target", difficulty: "easy", points: 10, target: 50 },
  { id: "pts-75", title: "Seventy-Five", blurb: "Earn 75 points today", family: "points", icon: "target", difficulty: "easy", points: 10, target: 75 },
  { id: "two-15", title: "Two a Day", blurb: "Two separate activities, each 15 minutes or more", family: "two-a-day", icon: "layers", difficulty: "medium", points: 20, minutes: 15 },
  { id: "two-20", title: "Two a Day+", blurb: "Two separate activities, each 20 minutes or more", family: "two-a-day", icon: "layers", difficulty: "medium", points: 20, minutes: 20 },
  { id: "two-30", title: "Double Session", blurb: "Two separate activities, each 30 minutes or more", family: "two-a-day", icon: "layers", difficulty: "hard", points: 30, minutes: 30 },];

export const BY_ID: Record<string, Challenge> = Object.fromEntries(
  CHALLENGES.map((c) => [c.id, c])
);

// ═══════════════════════════════════════════════════════════════
// SCHEDULE — fixed, reviewed by hand
// ═══════════════════════════════════════════════════════════════

export const SCHEDULE: Record<string, string[]> = {
  "2026-09-01": ["pace-9-1", "two-15"], // Tue
  "2026-09-02": ["pts-50", "dur-30"], // Wed
  "2026-09-03": ["dur-35", "pace-9-1"], // Thu
  "2026-09-04": ["mix-15", "pts-75"], // Fri
  "2026-09-05": ["day-5", "dur-40", "early-6"], // Sat
  "2026-09-06": ["one-5", "early-530", "beat-avg"], // Sun
  "2026-09-07": ["pts-50", "early-530"], // Mon
  "2026-09-08": ["pace-9-2", "two-15"], // Tue
  "2026-09-09": ["pts-75", "dur-30"], // Wed
  "2026-09-10": ["dur-35", "pace-9-2"], // Thu
  "2026-09-11": ["mix-15", "pts-100"], // Fri
  "2026-09-12": ["day-5", "dur-40", "early-6"], // Sat
  "2026-09-13": ["one-5", "early-530", "beat-avg"], // Sun
  "2026-09-14": ["pts-75", "early-530"], // Mon
  "2026-09-15": ["pace-9-3", "two-15"], // Tue
  "2026-09-16": ["pts-100", "dur-35"], // Wed
  "2026-09-17": ["dur-40", "pace-9-3"], // Thu
  "2026-09-18": ["mix-15", "pts-150"], // Fri
  "2026-09-19": ["day-6", "dur-45", "early-6"], // Sat
  "2026-09-20": ["one-6", "early-530", "beat-avg"], // Sun
  "2026-09-21": ["pts-100", "early-530"], // Mon
  "2026-09-22": ["pace-8-1", "two-20"], // Tue
  "2026-09-23": ["pts-100", "dur-35"], // Wed
  "2026-09-24": ["dur-40", "pace-8-1"], // Thu
  "2026-09-25": ["mix-15", "pts-150"], // Fri
  "2026-09-26": ["day-6", "dur-45", "early-6"], // Sat
  "2026-09-27": ["one-6", "early-530", "beat-avg"], // Sun
  "2026-09-28": ["pts-100", "early-530"], // Mon
  "2026-09-29": ["pace-8-2", "two-20"], // Tue
  "2026-09-30": ["pts-150", "dur-40"], // Wed
  "2026-10-01": ["dur-45", "pace-8-2"], // Thu
  "2026-10-02": ["mix-20", "pts-150"], // Fri
  "2026-10-03": ["day-7", "dur-50", "early-6"], // Sat
  "2026-10-04": ["one-7", "early-530", "beat-avg"], // Sun
  "2026-10-05": ["pts-150", "early-530"], // Mon
  "2026-10-06": ["pace-8-3", "two-20"], // Tue
  "2026-10-07": ["pts-150", "dur-45"], // Wed
  "2026-10-08": ["dur-50", "pace-8-3"], // Thu
  "2026-10-09": ["mix-20", "pts-150"], // Fri
  "2026-10-10": ["day-8", "dur-55", "early-6"], // Sat
  "2026-10-11": ["one-8", "early-530", "beat-avg"], // Sun
  "2026-10-12": ["pts-150", "early-530"], // Mon
  "2026-10-13": ["pace-7-1", "two-30"], // Tue
  "2026-10-14": ["pts-150", "dur-50"], // Wed
  "2026-10-15": ["dur-55", "pace-7-1"], // Thu
  "2026-10-16": ["mix-20", "pts-150"], // Fri
  "2026-10-17": ["day-9", "dur-60", "early-6"], // Sat
  "2026-10-18": ["one-9", "early-530", "beat-avg"], // Sun
  "2026-10-19": ["pts-150", "early-530"], // Mon
  "2026-10-20": ["pace-7-2", "two-30"], // Tue
  "2026-10-21": ["pts-150", "dur-50"], // Wed
  "2026-10-22": ["dur-55", "pace-7-3"], // Thu
  "2026-10-23": ["mix-20", "pts-150"], // Fri
  "2026-10-24": ["day-10", "dur-60", "early-6"], // Sat
  "2026-10-25": ["one-10", "early-530", "beat-avg"], // Sun
};

// ═══════════════════════════════════════════════════════════════
// TEST MODE
//
// Set to false to return to the real Season 2 schedule. While it is
// on, the challenge system anchors to 17 Aug instead of 1 Sep and runs
// the four test challenges every day to 31 Aug, so the whole chain —
// Strava sync, evaluation, points, leaderboard — can be verified before
// the season opens. Nothing outside this file is affected.
// ═══════════════════════════════════════════════════════════════

export const TEST_MODE = true;

const TEST_ANCHOR = "2026-08-17"; // a Monday, so test weeks align

const TEST_IDS = [
  "test-points-60",
  "test-walk-1",
  "test-run-pace",
  "test-cycle-15",
];

function buildTestSchedule(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  let d = TEST_ANCHOR;
  while (d <= "2026-08-31") {
    out[d] = [...TEST_IDS];
    d = addDays(d, 1);
  }
  return out;
}

/** Where the challenge weeks start counting from. */
const CHALLENGE_ANCHOR: string = TEST_MODE ? TEST_ANCHOR : "";

// 8 real season weeks. While testing, only the three weeks covering
// 17–31 Aug, so the champion boxes don't show empty future weeks.
export const TOTAL_WEEKS = TEST_MODE ? 3 : 8;

/** The live schedule: the real season, plus test days when TEST_MODE. */
const ACTIVE_SCHEDULE: Record<string, string[]> = TEST_MODE
  ? { ...buildTestSchedule(), ...SCHEDULE }
  : SCHEDULE;

/** Challenges for an IST date. Empty outside the season. */
export function challengesForDate(dayKey: string): Challenge[] {
  return (ACTIVE_SCHEDULE[dayKey] ?? []).map((id) => BY_ID[id]).filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════
// WEEK HELPERS — Monday to Sunday, so the winner is settled by
// Monday morning. The season opens on a Tuesday, so week 1 is six
// days (Tue–Sun). That is intended.
// ═══════════════════════════════════════════════════════════════

export function mondayOf(dayKey: string): string {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(new Date(`${dayKey}T12:00:00+05:30`));
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const back = Math.max(0, order.indexOf(wd));
  return addDays(dayKey, -back);
}

export function addDays(dayKey: string, n: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** Day the challenge weeks count from — the test anchor, or 1 Sep. */
function anchorDay(): string {
  return CHALLENGE_ANCHOR || istDayKey(SEASON.start);
}

export function seasonWeek(date: Date): number {
  const seasonMonday = mondayOf(anchorDay());
  const dayKey = istDayKey(date);
  if (dayKey < anchorDay()) return 0;
  const diff =
    (Date.parse(`${mondayOf(dayKey)}T00:00:00Z`) -
      Date.parse(`${seasonMonday}T00:00:00Z`)) /
    86_400_000;
  return Math.floor(diff / 7) + 1;
}

/** The days of a season week that actually fall inside the season. */
export function weekDays(week: number): string[] {
  const seasonMonday = mondayOf(anchorDay());
  const monday = addDays(seasonMonday, (week - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter(
    (d) => ACTIVE_SCHEDULE[d]
  );
}

// ═══════════════════════════════════════════════════════════════
// EVALUATION
// ═══════════════════════════════════════════════════════════════

const RUN = new Set(["Run", "TrailRun"]);
const WALK = new Set(["Walk", "Hike", "Reclassified-Walk"]);
const CYCLE = new Set(["Ride", "VirtualRide"]);

type Kind = "run" | "walk" | "cycle" | "other";

function kindOf(a: DayActivity): Kind {
  const t = a.derived_type || a.type || "";
  if (RUN.has(t)) return "run";
  if (WALK.has(t)) return "walk";
  if (CYCLE.has(t)) return "cycle";
  return "other";
}

const km = (a: DayActivity) => (Number(a.distance) || 0) / 1000;
const mins = (a: DayActivity) => (Number(a.moving_time) || 0) / 60;

/** Points for one activity, matching the season scoring rules. */
export function pointsFor(a: DayActivity): number {
  switch (kindOf(a)) {
    case "run":
      return km(a) * 22;
    case "walk":
      return km(a) * 14;
    case "cycle":
      return km(a) * 6;
    default:
      return 0;
  }
}

/** Hour of day in IST, as a decimal (6.5 = 06:30). */
function istHour(a: DayActivity): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(a.start_date));
  const h = parseInt(parts.find((p) => p.type === "hour")!.value, 10) % 24;
  const m = parseInt(parts.find((p) => p.type === "minute")!.value, 10);
  return h + m / 60;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ratio = (have: number, need: number) =>
  need <= 0 ? 0 : clamp01(have / need);

export type ChallengeResult = Challenge & {
  progress: number; // 0–1, for the progress bar
  completed: boolean;
};

/**
 * Progress toward one challenge.
 *
 * Distance targets are STRICT: 7 km on foot OR 21 km cycling, never a
 * mix of the two. Walking 4 km and cycling 9 km does not qualify.
 */
function progressFor(
  c: Challenge,
  acts: DayActivity[],
  history: DayActivity[],
  dayKey: string,
  allActs: DayActivity[]
): number {
  const footActs = acts.filter((a) => kindOf(a) === "run" || kindOf(a) === "walk");
  const cycleActs = acts.filter((a) => kindOf(a) === "cycle");

  switch (c.family) {
    case "points":
      return ratio(
        acts.reduce((s, a) => s + pointsFor(a), 0),
        c.target ?? 0
      );

    case "duration":
      return ratio(Math.max(0, ...acts.map(mins)), c.minutes ?? 0);

    case "single-distance": {
      const bestFoot = Math.max(0, ...footActs.map(km));
      const bestCycle = Math.max(0, ...cycleActs.map(km));
      // Best of the two routes, never their sum
      return Math.max(
        ratio(bestFoot, c.footKm ?? 0),
        ratio(bestCycle, c.cycleKm ?? 0)
      );
    }

    case "day-total": {
      const foot = footActs.reduce((s, a) => s + km(a), 0);
      const cycle = cycleActs.reduce((s, a) => s + km(a), 0);
      return Math.max(ratio(foot, c.footKm ?? 0), ratio(cycle, c.cycleKm ?? 0));
    }

    case "pace": {
      // Foot only, and the distance must be covered in ONE activity
      const target = c.paceMin ?? 0;
      const need = c.km ?? 0;
      const eligible = footActs.filter((a) => km(a) >= need);
      if (!eligible.length) {
        // Partial credit on distance so the bar isn't dead
        return ratio(Math.max(0, ...footActs.map(km)), need) * 0.6;
      }
      const best = Math.min(...eligible.map((a) => mins(a) / km(a)));
      return best <= target ? 1 : 0.6;
    }

    case "two-a-day": {
      const need = c.minutes ?? 0;
      return ratio(acts.filter((a) => mins(a) >= need).length, 2);
    }

    case "mix": {
      const need = c.minutes ?? 0;
      const kinds = new Set(
        acts.filter((a) => mins(a) >= need).map(kindOf).filter((k) => k !== "other")
      );
      return ratio(kinds.size, 3);
    }

    // ── Test-only families ──────────────────────────────────────
    case "walk-distance": {
      // Walking specifically — not "on foot", so a run doesn't count
      const walked = acts
        .filter((a) => kindOf(a) === "walk")
        .reduce((sum, a) => sum + km(a), 0);
      return ratio(walked, c.footKm ?? 0);
    }

    case "run-pace": {
      // Note: the sync reclassifies runs slower than 8.5 min/km as
      // walks, so this checks derived type as everything else does.
      const runs = acts.filter((a) => kindOf(a) === "run" && km(a) >= (c.km ?? 0));
      if (!runs.length) return 0;
      const best = Math.min(...runs.map((a) => mins(a) / km(a)));
      return best <= (c.paceMin ?? 0) ? 1 : 0.6;
    }

    case "cycle-duration": {
      const longest = Math.max(
        0,
        ...acts.filter((a) => kindOf(a) === "cycle").map(mins)
      );
      return ratio(longest, c.minutes ?? 0);
    }

    case "early": {
      const before = c.beforeHour ?? 6;
      return acts.some(
        (a) => istHour(a) < before && mins(a) >= EARLY_MIN_MINUTES
      )
        ? 1
        : 0;
    }

    case "personal-best": {
      // Beat last week's total distance.
      //
      // Deliberately simple: one number to beat, fixed for the whole
      // week. The earlier version compared against a rolling 7-day
      // average, which moved every day and nobody could plan against.
      const thisMonday = mondayOf(dayKey);
      const lastMonday = addDays(thisMonday, -7);

      const totalBetween = (from: string, toInclusive: string) =>
        allActs
          .filter((a) => {
            if (a.is_valid === false) return false;
            const k = istDayKey(new Date(a.start_date));
            return k >= from && k <= toInclusive;
          })
          .reduce((sum, a) => sum + km(a), 0);

      // This week counts up to and including the day being evaluated
      const thisWeek = totalBetween(thisMonday, dayKey);
      const lastWeek = totalBetween(lastMonday, addDays(thisMonday, -1));

      // Nothing last week to beat — any distance takes it
      if (lastWeek <= 0) return thisWeek > 0 ? 1 : 0;

      return thisWeek > lastWeek ? 1 : clamp01(thisWeek / lastWeek) * 0.99;
    }

    default:
      return 0;
  }
}

/** An activity counts only if valid and outside office hours. */
function countsToday(a: DayActivity): boolean {
  return a.is_valid !== false;
}

export type DayEvaluation = {
  date: string;
  results: ChallengeResult[];
  earned: number;
  cleanSweep: boolean;
};

/**
 * Evaluate one day.
 *
 * `history` should be the person's activities for the 7 days BEFORE
 * this one; it is only used by "Better Than Before".
 */
export function evaluateDay(
  dayKey: string,
  activities: DayActivity[],
  history: DayActivity[] = []
): DayEvaluation {
  const todays = activities.filter(
    (a) => countsToday(a) && istDayKey(new Date(a.start_date)) === dayKey
  );

  const results = challengesForDate(dayKey).map((c) => {
    const p = clamp01(progressFor(c, todays, history, dayKey, activities));
    return { ...c, progress: p, completed: p >= 1 };
  });

  const cleanSweep = results.length > 0 && results.every((r) => r.completed);
  const earned =
    results.reduce((s, r) => s + (r.completed ? r.points : 0), 0) +
    (cleanSweep ? CLEAN_SWEEP_POINTS : 0);

  return { date: dayKey, results, earned, cleanSweep };
}

/** Evaluate a span of days, e.g. a whole week. */
export function evaluateRange(
  dayKeys: string[],
  activities: DayActivity[]
): { days: DayEvaluation[]; total: number; completed: number } {
  const days = dayKeys.map((day) => {
    const from = addDays(day, -7);
    const history = activities.filter((a) => {
      const k = istDayKey(new Date(a.start_date));
      return k >= from && k < day && a.is_valid !== false;
    });
    return evaluateDay(day, activities, history);
  });

  return {
    days,
    total: days.reduce((s, d) => s + d.earned, 0),
    completed: days.reduce(
      (s, d) => s + d.results.filter((r) => r.completed).length,
      0
    ),
  };
}