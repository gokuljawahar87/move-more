import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Challenge start (1 Oct 2025, 00:00 IST)
const CHALLENGE_START = new Date("2025-10-01T00:00:00+05:30");
// Work-hour exclusion active from 16 Oct 2025
const EXCLUDE_START = new Date("2025-10-16T00:00:00+05:30");

// Work hours (IST)
const WORK_START = { hour: 7, minute: 30 };
const WORK_END = { hour: 15, minute: 45 };

// Holidays (YYYY-MM-DD)
const HOLIDAYS = ["2025-10-20", "2025-10-21"];

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
          is_valid
        )
      `)
      .eq("activities.is_valid", true);

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

      let run = 0,
        walk = 0,
        cycle = 0,
        points = 0;

      if (Array.isArray(profile.activities)) {
        for (const a of profile.activities) {
          if (!a?.is_valid || !a.start_date) continue;

          const startUTC = new Date(a.start_date);
          if (overlapsWorkingHours(startUTC, a.moving_time || 0)) continue; // 🚫 skip

          const km = Number(a.distance || 0) / 1000;
          const type = a.derived_type || a.type;

          // 🧮 Points logic
          if (type === "Run" || type === "TrailRun") {
            run += km;
            points += km * 25; // 🏃 Run = 25 pts/km
          } else if (type === "Walk" || type === "Reclassified-Walk") {
            walk += km;
            points += km * 14; // 🚶 Walk = 14 pts/km
          } else if (type === "Ride" || type === "VirtualRide") {
            cycle += km;
            points += km * 6; // 🚴 Cycle = 6 pts/km
          }
        }
      }

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
