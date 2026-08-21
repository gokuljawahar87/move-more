// app/api/leaderboard/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SEASON, activeSeason, SYNC_FLOOR } from "@/lib/season";
import { DailyPoints, disciplineOf } from "@/lib/points";
import { computeStreaks } from "@/lib/streak";

// Season dates now come from lib/season.ts, replacing the six
// hardcoded copies of this constant.
const CHALLENGE_START = SEASON.start;
// Exclusion applies from the start of the sync window, not a fixed
// October 2025 date.
const EXCLUDE_START = SYNC_FLOOR;

const WORK_START = { hour: 7, minute: 30 };
const WORK_END = { hour: 15, minute: 45 };
// Holidays now come from lib/season.ts
const HOLIDAYS: string[] = (SEASON as any).holidays ?? [];

function overlapsWorkingHours(startUTC: Date, durationSec: number): boolean {
  const istStart = new Date(startUTC.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const istEnd = new Date(istStart.getTime() + durationSec * 1000);

  if (istStart < EXCLUDE_START) return false;
  const day = istStart.getDay();
  if (day === 0 || day === 6) return false;

  const isoDate = istStart.toISOString().split("T")[0];
  if (HOLIDAYS.includes(isoDate)) return false;

  const workStart = new Date(istStart);
  workStart.setHours(WORK_START.hour, WORK_START.minute, 0, 0);
  const workEnd = new Date(istStart);
  workEnd.setHours(WORK_END.hour, WORK_END.minute, 0, 0);

  return istStart <= workEnd && istEnd >= workStart;
}

export async function GET() {
  try {
    const now = new Date();

    // 🧩 Fetch profiles + activities
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
      // Only members registered for this season. Unregistered people
      // (still tagged last season) are excluded entirely.
      .eq("season", SEASON.number)
      // Only the season currently on display: trial data before Sep 1,
      // Season 2 after. Season 1 is never shown.
      .eq("activities.season", activeSeason());

    if (error) throw error;

    let profiles = rawProfiles ?? [];

    // ✅ Challenge start cutoff
    if (now >= CHALLENGE_START) {
      profiles = profiles.filter((p: any) =>
        p.activities?.some((a: any) => new Date(a.start_date) >= CHALLENGE_START)
      );
    }

    // 🧩 Gender mapping
    const { data: genderRows } = await supabaseAdmin
      .from("employee_master")
      .select("user_id, gender");

    const genderDict: Record<string, string> = {};
    genderRows?.forEach((r) => {
      genderDict[r.user_id] = r.gender?.toUpperCase?.() ?? "NA";
    });

    if (!profiles.length) {
      return NextResponse.json({
        topFemales: [],
        topMales: [],
        topStreaks: [],
        teams: [],
        participation: [],
      });
    }

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

    // Registered members per team, including those with nothing logged —
    // needed for the participation rate below.
    const teamRoster: Record<string, number> = {};

    for (const profile of profiles) {
      const team = profile.team ?? null;
      if (team) teamRoster[team] = (teamRoster[team] ?? 0) + 1;

      const acts = Array.isArray(profile.activities) ? profile.activities : [];

      // Points are capped per person per day; distance is not. The
      // accumulator keeps a per-day tally so each day is clamped before
      // the days are summed.
      const acc = new DailyPoints();
      const counted: any[] = [];

      for (const a of acts) {
        if (!a?.is_valid || !a.start_date) continue;

        const startUTC = new Date(a.start_date);
        // A declared leave day lifts the office-hours exclusion.
        if (!a.on_leave_day && overlapsWorkingHours(startUTC, a.moving_time || 0)) continue;

        counted.push(a);
        acc.add(
          a.start_date,
          disciplineOf(a.derived_type || a.type),
          Number(a.distance || 0) / 1000
        );
      }

      const { run, walk, cycle } = acc.km;
      const points = acc.points;

      userTotals[profile.user_id] = {
        user_id: profile.user_id,
        name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
        team,
        gender: genderDict[profile.user_id] ?? "NA",
        run,
        walk,
        cycle,
        points,
        streak: computeStreaks(counted).currentStreak,
        // "Active" means they've logged at least one qualifying activity
        active: counted.length > 0,
      };
    }

    const users = Object.values(userTotals);
    const scored = users.filter((u) => u.points > 0);

    const byPoints = (a: UserRow, b: UserRow) => b.points - a.points;

    // ── Podiums by gender ────────────────────────────────────────
    const topFemales = scored
      .filter((u) => u.gender.startsWith("F"))
      .sort(byPoints)
      .slice(0, 3);
    const topMales = scored
      .filter((u) => !u.gender.startsWith("F"))
      .sort(byPoints)
      .slice(0, 3);

    // ── Longest current streaks ──────────────────────────────────
    const topStreaks = users
      .filter((u) => u.streak > 0)
      .sort((a, b) => b.streak - a.streak || b.points - a.points)
      .slice(0, 3);

    // ── Team points ──────────────────────────────────────────────
    const teamTotals: Record<string, { team: string; points: number }> = {};
    for (const u of users) {
      if (!u.team) continue;
      if (!teamTotals[u.team]) teamTotals[u.team] = { team: u.team, points: 0 };
      teamTotals[u.team].points += u.points;
    }
    const teams = Object.values(teamTotals).sort((a, b) => b.points - a.points).slice(0, 3);

    // ── Participation ────────────────────────────────────────────
    // As a SHARE of each team, not a headcount. Teams range from 11 to
    // 14 people, so counting active members outright would just rank
    // the biggest teams highest.
    const teamActive: Record<string, number> = {};
    for (const u of users) {
      if (!u.team || !u.active) continue;
      teamActive[u.team] = (teamActive[u.team] ?? 0) + 1;
    }

    // Ranked by headcount, not share. A percentage moves as people
    // register, so a team could slide down the board without anyone
    // doing anything differently.
    const participation = Object.entries(teamRoster)
      .map(([team, size]) => {
        const active = teamActive[team] ?? 0;
        return { team, active, size };
      })
      .filter((t) => t.size > 0)
      .sort((a, b) => b.active - a.active || a.size - b.size)
      .slice(0, 3);

    return NextResponse.json({
      topFemales,
      topMales,
      topStreaks,
      teams,
      participation,
    });
  } catch (err: any) {
    console.error("❌ Unexpected error in /leaderboard:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
