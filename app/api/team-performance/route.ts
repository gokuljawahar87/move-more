// app/api/team-performance/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SEASON, activeSeason, SYNC_FLOOR } from "@/lib/season";
import { DailyPoints, disciplineOf } from "@/lib/points";

// Challenge start (1 Oct 2025, 00:00 IST)
// Season dates now come from lib/season.ts, replacing the six
// hardcoded copies of this constant.
const CHALLENGE_START = SEASON.start;
// Work-hour exclusion active from 16 Oct 2025
// Exclusion applies from the start of the sync window, not a fixed
// October 2025 date.
const EXCLUDE_START = SYNC_FLOOR;

// Work hours (IST)
const WORK_START = { hour: 7, minute: 30 };
const WORK_END = { hour: 15, minute: 45 };

// Holidays (YYYY-MM-DD)
// Holidays now come from lib/season.ts
const HOLIDAYS: string[] = (SEASON as any).holidays ?? [];

/**
 * Checks if an activity overlaps with office hours (7:30 AM – 3:45 PM IST)
 * and should be excluded.
 */
function overlapsWorkingHours(startUTC: Date, durationSec: number): boolean {
  const istStart = new Date(startUTC.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const istEnd = new Date(istStart.getTime() + durationSec * 1000);

  // Skip exclusion if before 16 Oct 2025
  if (istStart < EXCLUDE_START) return false;

  // Weekend exemption (0 = Sun, 6 = Sat)
  const day = istStart.getDay();
  if (day === 0 || day === 6) return false;

  // Holiday exemption
  const isoDate = istStart.toISOString().split("T")[0];
  if (HOLIDAYS.includes(isoDate)) return false;

  // Define day’s work window
  const workStart = new Date(istStart);
  workStart.setHours(WORK_START.hour, WORK_START.minute, 0, 0);
  const workEnd = new Date(istStart);
  workEnd.setHours(WORK_END.hour, WORK_END.minute, 0, 0);

  // ❌ Exclude if any overlap
  return istStart <= workEnd && istEnd >= workStart;
}

export async function GET(request: Request) {
  try {
    const now = new Date();
    const { searchParams } = new URL(request.url);
    const selectedDate = searchParams.get("date");

    // Base query: profiles + valid activities
    let query = supabaseAdmin
      .from("profiles")
      .select(`
        user_id,
        first_name,
        last_name,
        team,
        activities (
          id,
          name,
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

    // Apply challenge start cutoff
    if (now >= CHALLENGE_START) {
      query = query.gte("activities.start_date", CHALLENGE_START.toISOString());
    }

    // Optional daily filter
    if (selectedDate) {
      const start = new Date(`${selectedDate}T00:00:00+05:30`).toISOString();
      const end = new Date(`${selectedDate}T23:59:59+05:30`).toISOString();
      query = query.gte("activities.start_date", start).lte("activities.start_date", end);
    }

    const { data, error } = await query;
    if (error) {
      console.error("❌ Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data?.length) {
      return NextResponse.json({ message: "No activities found for this day", teams: [] });
    }

    // 🧮 Group by team
    const teamMap: Record<
      string,
      {
        teamName: string;
        totalPoints: number;
        members: { name: string; run: number; walk: number; cycle: number; points: number }[];
      }
    > = {};

    for (const profile of data) {
      if (!profile.team) continue; // skip users without team

      // Points capped at 175 per person per day; distance uncapped.
      const acc = new DailyPoints();

      if (Array.isArray(profile.activities)) {
        for (const a of profile.activities) {
          if (!a?.is_valid || !a.start_date) continue;

          const startUTC = new Date(a.start_date);
          // A declared leave day lifts the office-hours exclusion.
          if (!a.on_leave_day && overlapsWorkingHours(startUTC, a.moving_time || 0)) continue;

          acc.add(
            a.start_date,
            disciplineOf(a.derived_type || a.type),
            Number(a.distance || 0) / 1000
          );
        }
      }

      const { run, walk, cycle } = acc.km;
      const points = acc.points;

      const member = {
        name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
        run,
        walk,
        cycle,
        points,
      };

      if (!teamMap[profile.team]) {
        teamMap[profile.team] = {
          teamName: profile.team,
          totalPoints: 0,
          members: [],
        };
      }

      teamMap[profile.team].members.push(member);
      teamMap[profile.team].totalPoints += points;
    }

    // Sort members and teams
    Object.values(teamMap).forEach((team) =>
      team.members.sort((a, b) => b.points - a.points)
    );
    const teams = Object.values(teamMap).sort((a, b) => b.totalPoints - a.totalPoints);

    return NextResponse.json(teams);
  } catch (err: any) {
    console.error("❌ API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
