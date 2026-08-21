// lib/points.ts
//
// The daily contribution cap.
//
// A Season 1 learning: one very high-volume person could carry a whole
// team, which made everyone else's contribution feel pointless. Capping
// the daily contribution means a team wins by having more people
// moving, not one person moving a great deal.
//
// The cap applies to POINTS ONLY. Distance still counts in full toward
// the run, walk and cycle leaderboards — go as far as you like, it just
// stops adding to the team total past the cap.

export const DAILY_POINT_CAP = 100;

/** Points per kilometre, by discipline. */
export const RATE = {
  run: 22,
  walk: 14,
  cycle: 6,
} as const;

export type Discipline = keyof typeof RATE | null;

const RUN_TYPES = new Set(["Run", "TrailRun"]);
const WALK_TYPES = new Set(["Walk", "Hike", "Reclassified-Walk"]);
const CYCLE_TYPES = new Set(["Ride", "VirtualRide"]);

/** Which discipline an activity scores as, after any reclassification. */
export function disciplineOf(type?: string | null): Discipline {
  if (!type) return null;
  if (RUN_TYPES.has(type)) return "run";
  if (WALK_TYPES.has(type)) return "walk";
  if (CYCLE_TYPES.has(type)) return "cycle";
  return null;
}

/** Calendar date in IST, "YYYY-MM-DD". */
export function istDay(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Accumulates a person's distance and points, applying the daily cap.
 *
 * Points have to be capped per DAY, which means they can't simply be
 * summed as activities are read — the running total has to be kept per
 * date and each day clamped before the days are added together.
 *
 *   const acc = new DailyPoints();
 *   acc.add(startDate, "run", 5);
 *   acc.points;      // capped
 *   acc.rawPoints;   // uncapped, for showing what was trimmed
 *   acc.km.run;      // never capped
 */
export class DailyPoints {
  /** Uncapped points per IST day */
  private byDay = new Map<string, number>();

  /** Distance by discipline — never capped */
  km: Record<"run" | "walk" | "cycle", number> = { run: 0, walk: 0, cycle: 0 };

  add(startDate: string | Date, discipline: Discipline, distanceKm: number) {
    if (!discipline || !(distanceKm > 0)) return;

    this.km[discipline] += distanceKm;

    const day = istDay(
      typeof startDate === "string" ? new Date(startDate) : startDate
    );
    const earned = distanceKm * RATE[discipline];
    this.byDay.set(day, (this.byDay.get(day) ?? 0) + earned);
  }

  /** Total points after the daily cap is applied to each day. */
  get points(): number {
    let total = 0;
    for (const v of this.byDay.values()) {
      total += Math.min(v, DAILY_POINT_CAP);
    }
    return total;
  }

  /** What the total would have been with no cap. */
  get rawPoints(): number {
    let total = 0;
    for (const v of this.byDay.values()) total += v;
    return total;
  }

  /** Points lost to the cap. Useful for showing people what was trimmed. */
  get cappedAway(): number {
    return Math.max(0, this.rawPoints - this.points);
  }

  /** Days on which this person hit the cap. */
  get daysAtCap(): number {
    let n = 0;
    for (const v of this.byDay.values()) if (v >= DAILY_POINT_CAP) n++;
    return n;
  }

  /** Points for one specific IST day, capped. */
  pointsOn(day: string): number {
    return Math.min(this.byDay.get(day) ?? 0, DAILY_POINT_CAP);
  }
}
