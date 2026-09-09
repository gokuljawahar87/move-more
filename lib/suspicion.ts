// lib/suspicion.ts
//
// Scores an activity for how much it warrants a look.
//
// The score is NOT a verdict. It sorts a review queue so the twenty
// activities worth checking float above the two thousand that aren't.
// Every rule below came from patterns seen by hand in Season 1:
//
//   1. pace spikes in a walk        → max_speed
//   2. recording left running        → elapsed ÷ moving
//   3. travelling by vehicle         → average_speed
//   4. forgetting to stop            → max_speed
//
// All of it reads Strava summary fields already stored, so scoring
// costs nothing extra.

export type ScoredActivity = {
  id: number | string;
  strava_id?: number | string | null;
  user_id: string;
  name?: string | null;
  type?: string | null;
  derived_type?: string | null;
  distance?: number | null; // metres
  moving_time?: number | null; // seconds
  elapsed_time?: number | null; // seconds
  max_speed?: number | null; // m/s
  average_speed?: number | null; // m/s
  strava_flagged?: boolean | null;
  trainer?: boolean | null;
  device_name?: string | null;
  start_date: string;
  is_valid?: boolean | null;
  is_valid_locked?: boolean | null;
};

export type Flag = {
  code: string;
  label: string;
  detail: string;
  weight: number;
};

/** m/s → km/h */
const kmh = (mps?: number | null) => (Number(mps) || 0) * 3.6;

const RUN = new Set(["Run", "TrailRun"]);
const WALK = new Set(["Walk", "Hike", "Reclassified-Walk"]);
const CYCLE = new Set(["Ride", "VirtualRide"]);

function kindOf(a: ScoredActivity) {
  const t = a.derived_type || a.type || "";
  if (RUN.has(t)) return "run";
  if (WALK.has(t)) return "walk";
  if (CYCLE.has(t)) return "cycle";
  return "other";
}

// ── Thresholds ─────────────────────────────────────────────────────
// Tune these once you've watched the queue for a week. Raising a
// threshold makes the queue shorter and lets more through; lowering it
// does the reverse.
export const LIMITS = {
  walkMaxKmh: 16, // a walk touching vehicle speed
  walkAvgKmh: 9, // sustained faster than anyone walks
  runMaxKmh: 28, // a run touching vehicle speed
  cycleAvgKmh: 35, // sustained faster than most ride
  longElapsedHours: 4,
  elapsedRatio: 2.5, // elapsed ÷ moving
  allDayHours: 8,
};

/**
 * Flags raised against one activity, worst first.
 *
 * A flag explains itself in plain language — the reviewer should never
 * have to work out why something surfaced.
 */
export function flagsFor(a: ScoredActivity): Flag[] {
  const flags: Flag[] = [];

  const kind = kindOf(a);
  const moving = Number(a.moving_time) || 0;
  const elapsed = Number(a.elapsed_time) || 0;
  const maxKmh = kmh(a.max_speed);
  const avgKmh = kmh(a.average_speed);

  // ── Strava's own view ────────────────────────────────────────────
  if (a.strava_flagged) {
    flags.push({
      code: "strava_flagged",
      label: "Flagged by Strava",
      detail: "Strava's own checks marked this activity.",
      weight: 50,
    });
  }

  // ── All-day recording ────────────────────────────────────────────
  if (elapsed > 0 && moving > 0) {
    const ratio = elapsed / moving;
    if (elapsed > LIMITS.longElapsedHours * 3600 && ratio > LIMITS.elapsedRatio) {
      flags.push({
        code: "left_running",
        label: "Recording left running",
        detail: `${(elapsed / 3600).toFixed(1)}h elapsed for ${(
          moving / 3600
        ).toFixed(1)}h of movement (${ratio.toFixed(1)}×).`,
        weight: 45,
      });
    }
  }

  if (elapsed > LIMITS.allDayHours * 3600) {
    flags.push({
      code: "all_day",
      label: "Implausible duration",
      detail: `${(elapsed / 3600).toFixed(1)} hours from start to finish.`,
      weight: 30,
    });
  }

  // ── Vehicle speeds ───────────────────────────────────────────────
  if (kind === "walk" && maxKmh > LIMITS.walkMaxKmh) {
    flags.push({
      code: "walk_spike",
      label: "Vehicle-speed spike",
      detail: `Peaked at ${maxKmh.toFixed(1)} km/h during a walk.`,
      weight: 40,
    });
  }

  if (kind === "walk" && avgKmh > LIMITS.walkAvgKmh) {
    flags.push({
      code: "walk_too_fast",
      label: "Faster than walking",
      detail: `Averaged ${avgKmh.toFixed(1)} km/h for the whole activity.`,
      weight: 35,
    });
  }

  if (kind === "run" && maxKmh > LIMITS.runMaxKmh) {
    flags.push({
      code: "run_spike",
      label: "Vehicle-speed spike",
      detail: `Peaked at ${maxKmh.toFixed(1)} km/h during a run.`,
      weight: 40,
    });
  }

  if (kind === "cycle" && avgKmh > LIMITS.cycleAvgKmh) {
    flags.push({
      code: "cycle_too_fast",
      label: "Sustained vehicle speed",
      detail: `Averaged ${avgKmh.toFixed(1)} km/h for the ride.`,
      weight: 30,
    });
  }

  // ── Context, not accusation ──────────────────────────────────────
  if (a.trainer) {
    flags.push({
      code: "trainer",
      label: "Indoor / treadmill",
      detail: "Recorded on a trainer or treadmill.",
      weight: 10,
    });
  }

  return flags.sort((x, y) => y.weight - x.weight);
}

/** 0–100. Higher means more worth a look. */
export function suspicionScore(a: ScoredActivity): number {
  const total = flagsFor(a).reduce((s, f) => s + f.weight, 0);
  return Math.min(100, total);
}

export type Reviewed = ScoredActivity & {
  flags: Flag[];
  score: number;
};

/** Score a batch and return only what's worth reviewing, worst first. */
export function buildQueue(
  activities: ScoredActivity[],
  minScore = 1
): Reviewed[] {
  return activities
    .map((a) => {
      const flags = flagsFor(a);
      return {
        ...a,
        flags,
        score: Math.min(
          100,
          flags.reduce((s, f) => s + f.weight, 0)
        ),
      };
    })
    .filter((a) => a.score >= minScore)
    .sort(
      (x, y) =>
        y.score - x.score ||
        new Date(y.start_date).getTime() - new Date(x.start_date).getTime()
    );
}

/**
 * Two activities from the same person that overlap in time.
 *
 * Handled separately because it's a property of a PAIR, not of one
 * activity — usually a double-recorded session, occasionally a phone
 * and a watch both running.
 */
export function findOverlaps(
  activities: ScoredActivity[]
): { a: ScoredActivity; b: ScoredActivity; minutes: number }[] {
  const byUser = new Map<string, ScoredActivity[]>();
  for (const a of activities) {
    byUser.set(a.user_id, [...(byUser.get(a.user_id) ?? []), a]);
  }

  const out: { a: ScoredActivity; b: ScoredActivity; minutes: number }[] = [];

  for (const list of byUser.values()) {
    const sorted = [...list].sort(
      (x, y) =>
        new Date(x.start_date).getTime() - new Date(y.start_date).getTime()
    );

    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const aEnd =
        new Date(a.start_date).getTime() +
        (Number(a.elapsed_time) || Number(a.moving_time) || 0) * 1000;

      for (let j = i + 1; j < sorted.length; j++) {
        const b = sorted[j];
        const bStart = new Date(b.start_date).getTime();
        if (bStart >= aEnd) break; // sorted, so nothing later overlaps either

        out.push({
          a,
          b,
          minutes: Math.round((aEnd - bStart) / 60000),
        });
      }
    }
  }

  return out;
}
