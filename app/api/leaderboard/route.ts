// app/api/leaderboard/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SEASON, activeSeason, SYNC_FLOOR } from "@/lib/season";

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
        runners: [],
        walkers: [],
        cyclers: [],
        teams: [],
        topFemales: [],
      });
    }

    const userTotals: Record<
      string,
      { name: string; team: string | null; gender?: string; run: number; walk: number; cycle: number; points: number }
    > = {};

    for (const profile of profiles) {
      if (!Array.isArray(profile.activities) || profile.activities.length === 0) continue;

      let run = 0,
        walk = 0,
        cycle = 0,
        points = 0;

      for (const a of profile.activities) {
        if (!a?.is_valid || !a.start_date) continue;

        const startUTC = new Date(a.start_date);
        // A declared leave day lifts the office-hours exclusion.
        if (!a.on_leave_day && overlapsWorkingHours(startUTC, a.moving_time || 0)) continue;

        const km = Number(a.distance || 0) / 1000;
        const type = a.derived_type || a.type;

        if (type === "Run" || type === "TrailRun") {
          run += km;
          points += km * 22; // 🏃 updated from 25 → 22
        } else if (type === "Walk" || type === "Reclassified-Walk") {
          walk += km;
          points += km * 14;
        } else if (type === "Ride" || type === "VirtualRide") {
          cycle += km;
          points += km * 6;
        }
      }

      const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
      const team = profile.team ?? null;
      const gender = genderDict[profile.user_id] ?? "NA";

      userTotals[profile.user_id] = { name, team, gender, run, walk, cycle, points };
    }

    const users = Object.values(userTotals);

    const runners = users.filter((u) => u.run > 0).sort((a, b) => b.run - a.run).slice(0, 3);
    const walkers = users.filter((u) => u.walk > 0).sort((a, b) => b.walk - a.walk).slice(0, 3);
    const cyclers = users.filter((u) => u.cycle > 0).sort((a, b) => b.cycle - a.cycle).slice(0, 3);

    const topFemales = users
      .filter((u) => u.gender === "FEMALE" && u.points > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, 3);

    const teamTotals: Record<string, { team: string; points: number }> = {};
    for (const u of users) {
      if (!u.team) continue;
      if (!teamTotals[u.team]) teamTotals[u.team] = { team: u.team, points: 0 };
      teamTotals[u.team].points += u.points;
    }

    const teams = Object.values(teamTotals).sort((a, b) => b.points - a.points).slice(0, 3);

    return NextResponse.json({ runners, walkers, cyclers, teams, topFemales });
  } catch (err: any) {
    console.error("❌ Unexpected error in /leaderboard:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
