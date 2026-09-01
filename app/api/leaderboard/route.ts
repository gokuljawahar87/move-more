// app/api/leaderboard/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SEASON, activeSeason, SYNC_FLOOR } from "@/lib/season";
import { DailyPoints, disciplineOf } from "@/lib/points";
import { computeStreaks } from "@/lib/streak";

// ─────────────────────────────────────────────────────────────
// Season dates come from lib/season.ts
// Season 2:
// Start: 1 Sep 2026, 00:00 IST
// End:   25 Oct 2026, 22:00 IST
// ─────────────────────────────────────────────────────────────

const CHALLENGE_START = SEASON.start;
const CHALLENGE_END = SEASON.end;

// Exclusion applies from the start of the sync window.
const EXCLUDE_START = SYNC_FLOOR;

const WORK_START = { hour: 7, minute: 30 };
const WORK_END = { hour: 15, minute: 45 };

// Holidays come from lib/season.ts
const HOLIDAYS: string[] = (SEASON as any).holidays ?? [];

// ─────────────────────────────────────────────────────────────
// Check whether an activity overlaps office working hours.
//
// Working hours:
// 07:30 – 15:45 IST
//
// Activities overlapping this window on working days are excluded,
// unless the activity is marked as a leave-day activity.
// ─────────────────────────────────────────────────────────────

function overlapsWorkingHours(
  startUTC: Date,
  durationSec: number
): boolean {
  const istStart = new Date(
    startUTC.toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    })
  );

  const istEnd = new Date(
    istStart.getTime() + durationSec * 1000
  );

  // Anything before the sync floor is irrelevant.
  if (istStart < EXCLUDE_START) return false;

  const day = istStart.getDay();

  // Sunday / Saturday
  if (day === 0 || day === 6) return false;

  const isoDate = istStart.toISOString().split("T")[0];

  // Declared holiday
  if (HOLIDAYS.includes(isoDate)) return false;

  const workStart = new Date(istStart);
  workStart.setHours(
    WORK_START.hour,
    WORK_START.minute,
    0,
    0
  );

  const workEnd = new Date(istStart);
  workEnd.setHours(
    WORK_END.hour,
    WORK_END.minute,
    0,
    0
  );

  // Any overlap with 07:30–15:45 is excluded.
  return istStart <= workEnd && istEnd >= workStart;
}

// ─────────────────────────────────────────────────────────────
// GET /api/leaderboard
// ─────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const now = new Date();

    // ───────────────────────────────────────────────────────────
    // Fetch registered Season 2 profiles + valid Season 2
    // activities.
    //
    // IMPORTANT:
    // We ALSO filter activities by their actual start_date.
    //
    // The "season" column alone is NOT sufficient because older
    // routes/database defaults may have incorrectly tagged older
    // activities as Season 2.
    // ───────────────────────────────────────────────────────────

    const { data: rawProfiles, error } = await supabaseAdmin
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

      // Only employees registered for the current season.
      .eq("season", SEASON.number)

      // Only activities tagged to the currently displayed season.
      .eq("activities.season", activeSeason())

      // ────────────────────────────────────────────────────────
      // CRITICAL DATE FILTER
      //
      // Season 2 starts at:
      // 1 Sep 2026 00:00 IST
      //
      // Anything before this is trial / historical data and
      // MUST NOT contribute to Season 2 leaderboard points.
      // ────────────────────────────────────────────────────────
      .gte(
        "activities.start_date",
        CHALLENGE_START.toISOString()
      )

      // Do not allow activities after the Season 2 end.
      .lt(
        "activities.start_date",
        CHALLENGE_END.toISOString()
      );

    if (error) throw error;

    let profiles = rawProfiles ?? [];

    // ───────────────────────────────────────────────────────────
    // Additional profile-level filtering.
    //
    // A profile should only appear if it has at least one
    // qualifying Season 2 activity.
    // ───────────────────────────────────────────────────────────

    if (now >= CHALLENGE_START) {
      profiles = profiles.filter((p: any) =>
        p.activities?.some((a: any) => {
          if (!a?.start_date) return false;

          const activityDate = new Date(a.start_date);

          return (
            activityDate >= CHALLENGE_START &&
            activityDate < CHALLENGE_END
          );
        })
      );
    }

    // ───────────────────────────────────────────────────────────
    // Gender mapping
    // ───────────────────────────────────────────────────────────

    const { data: genderRows } = await supabaseAdmin
      .from("employee_master")
      .select("user_id, gender");

    const genderDict: Record<string, string> = {};

    genderRows?.forEach((r) => {
      genderDict[r.user_id] =
        r.gender?.toUpperCase?.() ?? "NA";
    });

    // ───────────────────────────────────────────────────────────
    // Empty leaderboard
    // ───────────────────────────────────────────────────────────

    if (!profiles.length) {
      return NextResponse.json({
        topFemales: [],
        topMales: [],
        topStreaks: [],
        teams: [],
        participation: [],
      });
    }

    // ───────────────────────────────────────────────────────────
    // User leaderboard row
    // ───────────────────────────────────────────────────────────

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
    };

    const userTotals: Record<string, UserRow> = {};

    // ───────────────────────────────────────────────────────────
    // Registered members per team.
    //
    // Used for participation calculations.
    // ───────────────────────────────────────────────────────────

    const teamRoster: Record<string, number> = {};

    // ───────────────────────────────────────────────────────────
    // Calculate each user's Season 2 totals.
    // ───────────────────────────────────────────────────────────

    for (const profile of profiles) {
      const team = profile.team ?? null;

      if (team) {
        teamRoster[team] =
          (teamRoster[team] ?? 0) + 1;
      }

      const acts = Array.isArray(profile.activities)
        ? profile.activities
        : [];

      // DailyPoints:
      // - Points are capped per person per IST day.
      // - Distance is NOT capped.
      const acc = new DailyPoints();

      // Activities that actually count for streak calculation.
      const counted: any[] = [];

      for (const a of acts) {
        if (!a?.is_valid || !a.start_date) continue;

        const startUTC = new Date(a.start_date);

        // ──────────────────────────────────────────────────────
        // 🚨 CRITICAL SEASON 2 CUTOFF
        //
        // NOTHING before 1 Sep 2026 can contribute to:
        // - points
        // - distance
        // - streaks
        // - active participation
        //
        // This is the protection against old/trial activities
        // incorrectly tagged with season = 2.
        // ──────────────────────────────────────────────────────

        if (startUTC < CHALLENGE_START) {
          continue;
        }

        // ──────────────────────────────────────────────────────
        // Do not score activities after Season 2 ends.
        // ──────────────────────────────────────────────────────

        if (startUTC >= CHALLENGE_END) {
          continue;
        }

        // ──────────────────────────────────────────────────────
        // Office-hours exclusion.
        //
        // A leave-day activity bypasses the exclusion.
        // ──────────────────────────────────────────────────────

        if (
          !a.on_leave_day &&
          overlapsWorkingHours(
            startUTC,
            a.moving_time || 0
          )
        ) {
          continue;
        }

        // ──────────────────────────────────────────────────────
        // This activity has passed ALL qualification checks.
        // ──────────────────────────────────────────────────────

        counted.push(a);

        // ──────────────────────────────────────────────────────
        // Add distance and points.
        //
        // DailyPoints handles:
        // - Run / Walk / Cycle classification
        // - IST calendar-day grouping
        // - 100 point daily cap
        // ──────────────────────────────────────────────────────

        acc.add(
          a.start_date,
          disciplineOf(
            a.derived_type || a.type
          ),
          Number(a.distance || 0) / 1000
        );
      }

      // ─────────────────────────────────────────────────────────
      // Final user totals
      // ─────────────────────────────────────────────────────────

      const { run, walk, cycle } = acc.km;
      const points = acc.points;

      userTotals[profile.user_id] = {
        user_id: profile.user_id,

        name: `${profile.first_name || ""} ${
          profile.last_name || ""
        }`.trim(),

        team,

        gender:
          genderDict[profile.user_id] ?? "NA",

        run,
        walk,
        cycle,

        points,

        // Streak is calculated ONLY from qualifying
        // Season 2 activities.
        streak:
          computeStreaks(counted).currentStreak,

        // Active means at least one qualifying Season 2
        // activity exists.
        active: counted.length > 0,
      };
    }

    // ───────────────────────────────────────────────────────────
    // Users
    // ───────────────────────────────────────────────────────────

    const users = Object.values(userTotals);

    // Only users with points appear in scored leaderboards.
    const scored = users.filter(
      (u) => u.points > 0
    );

    const byPoints = (
      a: UserRow,
      b: UserRow
    ) => b.points - a.points;

    // ───────────────────────────────────────────────────────────
    // TOP FEMALES
    // ───────────────────────────────────────────────────────────

    const topFemales = scored
      .filter((u) =>
        u.gender.startsWith("F")
      )
      .sort(byPoints)
      .slice(0, 3);

    // ───────────────────────────────────────────────────────────
    // TOP MALES
    // ───────────────────────────────────────────────────────────

    const topMales = scored
      .filter((u) =>
        !u.gender.startsWith("F")
      )
      .sort(byPoints)
      .slice(0, 3);

    // ───────────────────────────────────────────────────────────
    // LONGEST CURRENT STREAKS
    // ───────────────────────────────────────────────────────────

    const topStreaks = users
      .filter((u) => u.streak > 0)
      .sort(
        (a, b) =>
          b.streak - a.streak ||
          b.points - a.points
      )
      .slice(0, 3);

    // ───────────────────────────────────────────────────────────
    // TEAM POINTS
    // ───────────────────────────────────────────────────────────

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

      teamTotals[u.team].points += u.points;
    }

    const teams = Object.values(teamTotals)
      .sort(
        (a, b) => b.points - a.points
      )
      .slice(0, 3);

    // ───────────────────────────────────────────────────────────
    // PARTICIPATION
    //
    // Ranked by number of active people, rather than percentage.
    // ───────────────────────────────────────────────────────────

    const teamActive: Record<
      string,
      number
    > = {};

    for (const u of users) {
      if (!u.team || !u.active) continue;

      teamActive[u.team] =
        (teamActive[u.team] ?? 0) + 1;
    }

    const participation = Object.entries(
      teamRoster
    )
      .map(([team, size]) => {
        const active =
          teamActive[team] ?? 0;

        return {
          team,
          active,
          size,
        };
      })
      .filter(
        (t) => t.size > 0
      )
      .sort(
        (a, b) =>
          b.active - a.active ||
          a.size - b.size
      )
      .slice(0, 3);

    // ───────────────────────────────────────────────────────────
    // RESPONSE
    // ───────────────────────────────────────────────────────────

    return NextResponse.json({
      topFemales,
      topMales,
      topStreaks,
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