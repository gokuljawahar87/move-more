// app/api/leaderboard/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SEASON, activeSeason, SYNC_FLOOR } from "@/lib/season";
import { DailyPoints, disciplineOf } from "@/lib/points";
import {
  computeStreaks,
  qualifiesForStreak,
  istDayKey,
} from "@/lib/streak";

// ─────────────────────────────────────────────────────────────
// SEASON WINDOW
//
// Season 2:
// Start: 01 Sep 2026 00:00 IST
// End:   31 Oct 2026
//
// IMPORTANT:
// We use the actual activity start_date as the authoritative
// date for leaderboard eligibility.
// ─────────────────────────────────────────────────────────────

const CHALLENGE_START = SEASON.start;

// Do not hardcode the end date here.
// SEASON.end should be:
// 31 Oct 2026, 23:59:59 IST
const CHALLENGE_END = SEASON.end;

// Exclusion starts from sync floor.
const EXCLUDE_START = SYNC_FLOOR;

// ─────────────────────────────────────────────────────────────
// OFFICE HOURS
// ─────────────────────────────────────────────────────────────

const WORK_START = { hour: 7, minute: 30 };
const WORK_END = { hour: 15, minute: 45 };

const HOLIDAYS: string[] =
  (SEASON as any).holidays ?? [];

// ─────────────────────────────────────────────────────────────
// IST HELPERS
//
// Uses Intl.DateTimeFormat rather than converting a localized
// string back into a Date object.
// ─────────────────────────────────────────────────────────────

function getISTParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });

  const parts = formatter.formatToParts(date);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
    weekday: get("weekday"),
  };
}

// ─────────────────────────────────────────────────────────────
// OFFICE-HOURS OVERLAP
//
// Working hours:
// Monday-Friday
// 07:30 - 15:45 IST
//
// Leave-day activities bypass the exclusion in the caller.
// ─────────────────────────────────────────────────────────────

function overlapsWorkingHours(
  startUTC: Date,
  durationSec: number
): boolean {
  // Anything before sync floor is not relevant.
  if (startUTC < EXCLUDE_START) return false;

  const ist = getISTParts(startUTC);

  // Sunday / Saturday
  if (ist.weekday === "Sun" || ist.weekday === "Sat") {
    return false;
  }

  // Build an IST calendar-date string.
  const isoDate =
    `${ist.year}-${String(ist.month).padStart(2, "0")}-${String(
      ist.day
    ).padStart(2, "0")}`;

  // Holiday
  if (HOLIDAYS.includes(isoDate)) {
    return false;
  }

  const startMinutes =
    ist.hour * 60 + ist.minute;

  const durationMinutes =
    Math.round(Number(durationSec || 0) / 60);

  const endMinutes =
    startMinutes + durationMinutes;

  const workStartMinutes =
    WORK_START.hour * 60 + WORK_START.minute;

  const workEndMinutes =
    WORK_END.hour * 60 + WORK_END.minute;

  return (
    startMinutes <= workEndMinutes &&
    endMinutes >= workStartMinutes
  );
}

// ─────────────────────────────────────────────────────────────
// POINT ACHIEVEMENT
//
// Determines the first activity timestamp at which the user's
// FINAL point total was reached.
//
// Because DailyPoints has a daily cap, we recreate the same
// chronological accumulation here.
//
// Example:
//
// 100 points → Sep 1
// 150 points → Sep 2 08:15
//
// pointsAchievedAt = Sep 2 08:15
// ─────────────────────────────────────────────────────────────

type CountedActivity = {
  id?: string;
  type?: string | null;
  derived_type?: string | null;
  distance?: number | null;
  moving_time?: number | null;
  start_date: string;
  is_valid?: boolean | null;
  on_leave_day?: boolean | null;
};

function calculatePointsAchievedAt(
  activities: CountedActivity[],
  finalPoints: number
): number {
  if (finalPoints <= 0 || activities.length === 0) {
    return Number.MAX_SAFE_INTEGER;
  }

  // We need the activities in chronological order.
  const chronological = [...activities].sort(
    (a, b) =>
      new Date(a.start_date).getTime() -
      new Date(b.start_date).getTime()
  );

  // DailyPoints uses an IST calendar date and a 100-point cap.
  const dailyPoints: Record<string, number> = {};

  let cumulativePoints = 0;

  for (const a of chronological) {
    const day = istDayKey(
      new Date(a.start_date)
    );

    const discipline = disciplineOf(
      a.derived_type || a.type
    );

    const distanceKm =
      Number(a.distance || 0) / 1000;

    // Reproduce the scoring rates.
    let activityPoints = 0;

    if (discipline === "run") {
      activityPoints = distanceKm * 22;
    } else if (discipline === "walk") {
      activityPoints = distanceKm * 14;
    } else if (discipline === "cycle") {
      activityPoints = distanceKm * 6;
    }

    if (activityPoints <= 0) continue;

    const previousDayPoints =
      dailyPoints[day] ?? 0;

    const available =
      Math.max(0, 100 - previousDayPoints);

    const pointsAdded = Math.min(
      activityPoints,
      available
    );

    if (pointsAdded <= 0) continue;

    dailyPoints[day] =
      previousDayPoints + pointsAdded;

    cumulativePoints += pointsAdded;

    // Floating-point arithmetic can produce values such as
    // 99.9999999997, so use a tiny tolerance.
    if (
      cumulativePoints >=
      finalPoints - 0.000001
    ) {
      return new Date(
        a.start_date
      ).getTime();
    }
  }

  return Number.MAX_SAFE_INTEGER;
}

// ─────────────────────────────────────────────────────────────
// STREAK ACHIEVEMENT
//
// Your streak implementation defines a streak using qualifying
// IST calendar days.
//
// We determine when the FINAL current streak length was first
// reached.
//
// Example:
//
// Sep 1 → qualifying
// Sep 2 → qualifying
// Sep 3 → qualifying
//
// Current streak = 3
// Achievement date = Sep 3
//
// Earlier 3-day streaks are not relevant if the current streak
// is longer.
// ─────────────────────────────────────────────────────────────

function calculateStreakAchievedAt(
  activities: CountedActivity[],
  currentStreak: number
): number {
  if (
    currentStreak <= 0 ||
    activities.length === 0
  ) {
    return Number.MAX_SAFE_INTEGER;
  }

  // Get qualifying activities using exactly the same
  // qualification rules as lib/streak.ts.
  const qualifyingDays = new Set<string>();

  for (const a of activities) {
    if (!qualifiesForStreak(a)) {
      continue;
    }

    const day = istDayKey(
      new Date(a.start_date)
    );

    qualifyingDays.add(day);
  }

  if (qualifyingDays.size === 0) {
    return Number.MAX_SAFE_INTEGER;
  }

  const sortedDays = [
    ...qualifyingDays,
  ].sort();

  // Find the first date on which a streak of the final
  // currentStreak length was completed.
  let run = 0;
  let previousDay: string | null = null;

  let achievementDay: string | null = null;

  function addDays(
    key: string,
    delta: number
  ): string {
    const [y, m, d] =
      key.split("-").map(Number);

    const dt = new Date(
      Date.UTC(y, m - 1, d)
    );

    dt.setUTCDate(
      dt.getUTCDate() + delta
    );

    return dt.toISOString().slice(0, 10);
  }

  for (const day of sortedDays) {
    run =
      previousDay &&
      addDays(previousDay, 1) === day
        ? run + 1
        : 1;

    if (
      run >= currentStreak &&
      achievementDay === null
    ) {
      achievementDay = day;
      break;
    }

    previousDay = day;
  }

  if (!achievementDay) {
    return Number.MAX_SAFE_INTEGER;
  }

  // Find the earliest qualifying activity on that final
  // streak-achievement day.
  const matchingActivities = activities
    .filter((a) => {
      if (!qualifiesForStreak(a)) {
        return false;
      }

      return (
        istDayKey(
          new Date(a.start_date)
        ) === achievementDay
      );
    })
    .sort(
      (a, b) =>
        new Date(a.start_date).getTime() -
        new Date(b.start_date).getTime()
    );

  if (!matchingActivities.length) {
    return Number.MAX_SAFE_INTEGER;
  }

  return new Date(
    matchingActivities[0].start_date
  ).getTime();
}

// ─────────────────────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const now = new Date();

    // ─────────────────────────────────────────────────────────
    // Fetch Season 2 profiles and activities.
    //
    // IMPORTANT:
    // season = 2 alone is NOT trusted as the date boundary.
    // Actual start_date is also checked.
    // ─────────────────────────────────────────────────────────

    const { data: rawProfiles, error } =
      await supabaseAdmin
        .from("profiles")
        .select(`
          user_id,
          first_name,
          last_name,
          team,
          activities (
            id,
            type,
            derived_type,
            distance,
            moving_time,
            start_date,
            is_valid,
            on_leave_day
          )
        `)
        .eq("activities.is_valid", true)
        .eq("season", SEASON.number)
        .eq(
          "activities.season",
          activeSeason()
        )
        .gte(
          "activities.start_date",
          CHALLENGE_START.toISOString()
        )
        .lt(
          "activities.start_date",
          CHALLENGE_END.toISOString()
        );

    if (error) {
      throw error;
    }

    let profiles = rawProfiles ?? [];

    // ─────────────────────────────────────────────────────────
    // Keep only profiles having at least one activity inside
    // the Season 2 window.
    // ─────────────────────────────────────────────────────────

    if (now >= CHALLENGE_START) {
      profiles = profiles.filter(
        (p: any) =>
          p.activities?.some(
            (a: any) => {
              if (!a?.start_date) {
                return false;
              }

              const date =
                new Date(a.start_date);

              return (
                date >= CHALLENGE_START &&
                date < CHALLENGE_END
              );
            }
          )
      );
    }

    // ─────────────────────────────────────────────────────────
    // Gender
    // ─────────────────────────────────────────────────────────

    const { data: genderRows } =
      await supabaseAdmin
        .from("employee_master")
        .select("user_id, gender");

    const genderDict: Record<
      string,
      string
    > = {};

    genderRows?.forEach((r) => {
      genderDict[r.user_id] =
        r.gender?.toUpperCase?.() ?? "NA";
    });

    // ─────────────────────────────────────────────────────────
    // Empty response
    // ─────────────────────────────────────────────────────────

    if (!profiles.length) {
      return NextResponse.json({
        topFemales: [],
        topMales: [],
        topStreaks: [],
        teams: [],
        participation: [],
      });
    }

    // ─────────────────────────────────────────────────────────
    // USER ROW
    // ─────────────────────────────────────────────────────────

    type UserRow = {
      user_id: string;
      name: string;
      team: string | null;
      gender: string;

      run: number;
      walk: number;
      cycle: number;

      points: number;
      streak: number;
      active: boolean;

      // Internal tie-break fields.
      pointsAchievedAt: number;
      streakAchievedAt: number;
    };

    const userTotals: Record<
      string,
      UserRow
    > = {};

    // ─────────────────────────────────────────────────────────
    // TEAM ROSTER
    // ─────────────────────────────────────────────────────────

    const teamRoster: Record<
      string,
      number
    > = {};

    // ─────────────────────────────────────────────────────────
    // PROCESS USERS
    // ─────────────────────────────────────────────────────────

    for (const profile of profiles) {
      const team =
        profile.team ?? null;

      if (team) {
        teamRoster[team] =
          (teamRoster[team] ?? 0) + 1;
      }

      const acts = Array.isArray(
        profile.activities
      )
        ? profile.activities
        : [];

      const acc = new DailyPoints();

      const counted: CountedActivity[] =
        [];

      // ───────────────────────────────────────────────────────
      // QUALIFY ACTIVITIES
      // ───────────────────────────────────────────────────────

      for (const a of acts) {
        if (
          !a?.is_valid ||
          !a.start_date
        ) {
          continue;
        }

        const startUTC =
          new Date(a.start_date);

        // ────────────────────────────────────────────────────
        // SEASON 2 START CUTOFF
        // ────────────────────────────────────────────────────

        if (
          startUTC < CHALLENGE_START
        ) {
          continue;
        }

        // ────────────────────────────────────────────────────
        // SEASON 2 END CUTOFF
        // ────────────────────────────────────────────────────

        if (
          startUTC >= CHALLENGE_END
        ) {
          continue;
        }

        // ────────────────────────────────────────────────────
        // OFFICE-HOURS EXCLUSION
        // ────────────────────────────────────────────────────

        if (
          !a.on_leave_day &&
          overlapsWorkingHours(
            startUTC,
            a.moving_time || 0
          )
        ) {
          continue;
        }

        // Activity is fully qualified.
        counted.push(a);

        // Add to DailyPoints.
        acc.add(
          a.start_date,
          disciplineOf(
            a.derived_type || a.type
          ),
          Number(a.distance || 0) / 1000
        );
      }

      // ───────────────────────────────────────────────────────
      // TOTALS
      // ───────────────────────────────────────────────────────

      const {
        run,
        walk,
        cycle,
      } = acc.km;

      const points = acc.points;

      // ───────────────────────────────────────────────────────
      // STREAK
      //
      // computeStreaks uses the exact rules from lib/streak.ts.
      // ───────────────────────────────────────────────────────

      const streakResult =
        computeStreaks(counted);

      const streak =
        streakResult.currentStreak;

      // ───────────────────────────────────────────────────────
      // TIE-BREAK TIMESTAMPS
      // ───────────────────────────────────────────────────────

      const pointsAchievedAt =
        calculatePointsAchievedAt(
          counted,
          points
        );

      const streakAchievedAt =
        calculateStreakAchievedAt(
          counted,
          streak
        );

      // ───────────────────────────────────────────────────────
      // STORE USER
      // ───────────────────────────────────────────────────────

      userTotals[profile.user_id] = {
        user_id: profile.user_id,

        name:
          `${profile.first_name || ""} ${
            profile.last_name || ""
          }`.trim(),

        team,

        gender:
          genderDict[profile.user_id] ??
          "NA",

        run,
        walk,
        cycle,

        points,
        streak,

        active:
          counted.length > 0,

        pointsAchievedAt,
        streakAchievedAt,
      };
    }

    // ─────────────────────────────────────────────────────────
    // USERS
    // ─────────────────────────────────────────────────────────

    const users =
      Object.values(userTotals);

    const scored =
      users.filter(
        (u) => u.points > 0
      );

    // ─────────────────────────────────────────────────────────
    // POINTS SORT
    //
    // 1. Higher points first
    // 2. If tied → earlier achievement first
    // 3. If still tied → user_id
    //
    // This guarantees deterministic ordering.
    // ─────────────────────────────────────────────────────────

    const byPoints = (
      a: UserRow,
      b: UserRow
    ) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }

      if (
        a.pointsAchievedAt !==
        b.pointsAchievedAt
      ) {
        return (
          a.pointsAchievedAt -
          b.pointsAchievedAt
        );
      }

      return a.user_id.localeCompare(
        b.user_id
      );
    };

    // ─────────────────────────────────────────────────────────
    // FEMALE PODIUM
    // ─────────────────────────────────────────────────────────

    const topFemales = scored
      .filter((u) =>
        u.gender.startsWith("F")
      )
      .sort(byPoints)
      .slice(0, 3);

    // ─────────────────────────────────────────────────────────
    // MALE PODIUM
    // ─────────────────────────────────────────────────────────

    const topMales = scored
      .filter(
        (u) =>
          !u.gender.startsWith("F")
      )
      .sort(byPoints)
      .slice(0, 3);

    // ─────────────────────────────────────────────────────────
    // STREAK SORT
    //
    // 1. Longer streak first
    // 2. If tied → earlier achievement first
    // 3. If still tied → points
    // 4. If still tied → user_id
    // ─────────────────────────────────────────────────────────

    const topStreaks = users
      .filter(
        (u) => u.streak > 0
      )
      .sort((a, b) => {
        if (
          b.streak !== a.streak
        ) {
          return b.streak - a.streak;
        }

        if (
          a.streakAchievedAt !==
          b.streakAchievedAt
        ) {
          return (
            a.streakAchievedAt -
            b.streakAchievedAt
          );
        }

        if (
          b.points !== a.points
        ) {
          return b.points - a.points;
        }

        return a.user_id.localeCompare(
          b.user_id
        );
      })
      .slice(0, 3);

    // ─────────────────────────────────────────────────────────
    // TEAM POINTS
    // ─────────────────────────────────────────────────────────

    const teamTotals: Record<
      string,
      {
        team: string;
        points: number;
      }
    > = {};

    for (const u of users) {
      if (!u.team) continue;

      if (!teamTotals[u.team]) {
        teamTotals[u.team] = {
          team: u.team,
          points: 0,
        };
      }

      teamTotals[u.team].points +=
        u.points;
    }

    const teams = Object.values(
      teamTotals
    )
      .sort(
        (a, b) =>
          b.points - a.points
      )
      .slice(0, 3);

    // ─────────────────────────────────────────────────────────
    // PARTICIPATION
    // ─────────────────────────────────────────────────────────

    const teamActive: Record<
      string,
      number
    > = {};

    for (const u of users) {
      if (
        !u.team ||
        !u.active
      ) {
        continue;
      }

      teamActive[u.team] =
        (teamActive[u.team] ?? 0) + 1;
    }

    const participation =
      Object.entries(teamRoster)
        .map(
          ([team, size]) => {
            const active =
              teamActive[team] ?? 0;

            return {
              team,
              active,
              size,
            };
          }
        )
        .filter(
          (t) => t.size > 0
        )
        .sort(
          (a, b) =>
            b.active - a.active ||
            a.size - b.size
        )
        .slice(0, 3);

    // ─────────────────────────────────────────────────────────
    // RESPONSE
    //
    // pointsAchievedAt and streakAchievedAt are intentionally
    // removed from the public response.
    // They are only used internally for ranking.
    // ─────────────────────────────────────────────────────────

    const cleanUser = (
      u: UserRow
    ) => {
      const {
        pointsAchievedAt,
        streakAchievedAt,
        ...publicUser
      } = u;

      return publicUser;
    };

    return NextResponse.json({
      topFemales:
        topFemales.map(cleanUser),

      topMales:
        topMales.map(cleanUser),

      topStreaks:
        topStreaks.map(cleanUser),

      teams,

      participation,
    });
  } catch (err: any) {
    console.error(
      "❌ Unexpected error in /leaderboard:",
      err
    );

    return NextResponse.json(
      {
        error:
          err.message ||
          "Failed to fetch leaderboard",
      },
      {
        status: 500,
      }
    );
  }
}