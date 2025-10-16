import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Challenge start (1 Oct 2025, 00:00 IST)
const CHALLENGE_START = new Date("2025-10-01T00:00:00+05:30");
// Work-hour cutoff active from 16 Oct 2025
const EXCLUDE_START = new Date("2025-10-16T00:00:00+05:30");

// Work hours (IST)
const WORK_START = { hour: 7, minute: 30 };
const WORK_END = { hour: 15, minute: 45 };

// Holidays (YYYY-MM-DD)
const HOLIDAYS = ["2025-10-20", "2025-10-21"];

// ──────────────────────────────────────────────────────────────
// Helper: true ⇒ activity overlaps working hours (so exclude)
// ──────────────────────────────────────────────────────────────
function overlapsWorkingHours(startUTC: Date, durationSec: number): boolean {
  const istStart = new Date(startUTC.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const istEnd = new Date(istStart.getTime() + durationSec * 1000);

  // Skip rule before cutoff
  if (istStart < EXCLUDE_START) return false;

  // Weekend exemption (0 = Sun, 6 = Sat)
  const day = istStart.getDay();
  if (day === 0 || day === 6) return false;

  // Holiday exemption
  const isoDate = istStart.toISOString().split("T")[0];
  if (HOLIDAYS.includes(isoDate)) return false;

  // Define work window for that day
  const workStart = new Date(istStart);
  workStart.setHours(WORK_START.hour, WORK_START.minute, 0, 0);
  const workEnd = new Date(istStart);
  workEnd.setHours(WORK_END.hour, WORK_END.minute, 0, 0);

  // ❌ Exclude if any overlap with work window
  const overlaps = istStart <= workEnd && istEnd >= workStart;
  return overlaps;
}

// ──────────────────────────────────────────────────────────────
// Main API
// ──────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const now = new Date();

    // Base query: profiles → activities
    let query = supabaseAdmin
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
          is_valid
        )
      `)
      .eq("activities.is_valid", true);

    // Apply challenge start cutoff
    if (now >= CHALLENGE_START) {
      query = query.gte("activities.start_date", CHALLENGE_START.toISOString());
    }

    const { data, error } = await query;
    if (error) {
      console.error("❌ Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data?.length) {
      return NextResponse.json({ runners: [], walkers: [], cyclers: [], teams: [] });
    }

    // ───────────────  Aggregate user totals  ───────────────
    const userTotals: Record<
      string,
      { name: string; team: string | null; run: number; walk: number; cycle: number; points: number }
    > = {};

    for (const profile of data) {
      if (!Array.isArray(profile.activities) || profile.activities.length === 0) continue;

      let run = 0,
        walk = 0,
        cycle = 0,
        points = 0;

      for (const a of profile.activities) {
        if (!a?.is_valid || !a.start_date) continue;

        const startUTC = new Date(a.start_date);
        if (overlapsWorkingHours(startUTC, a.moving_time || 0)) continue; // 🚫 skip

        const km = Number(a.distance || 0) / 1000;
        const type = a.derived_type || a.type;

        // 🧮 Points logic
        if (type === "Run" || type === "TrailRun") {
          run += km;
          points += km * 25;          // 🏃 Run = 25 pts/km
        } else if (type === "Walk" || type === "Reclassified-Walk") {
          walk += km;
          points += km * 14;          // 🚶 Walk = 14 pts/km
        } else if (type === "Ride" || type === "VirtualRide") {
          cycle += km;
          points += km * 6;           // 🚴 Ride = 6 pts/km
        }
      }

      const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
      const team = profile.team ?? null;
      userTotals[profile.user_id] = { name, team, run, walk, cycle, points };
    }

    const users = Object.values(userTotals);

    // Top 3 per category
    const runners = users.filter(u => u.run > 0).sort((a,b) => b.run - a.run).slice(0,3);
    const walkers = users.filter(u => u.walk > 0).sort((a,b) => b.walk - a.walk).slice(0,3);
    const cyclers = users.filter(u => u.cycle > 0).sort((a,b) => b.cycle - a.cycle).slice(0,3);

    // Team totals
    const teamTotals: Record<string, { team: string; points: number }> = {};
    for (const u of users) {
      if (!u.team) continue;
      if (!teamTotals[u.team]) teamTotals[u.team] = { team: u.team, points: 0 };
      teamTotals[u.team].points += u.points;
    }

    const teams = Object.values(teamTotals).sort((a,b) => b.points - a.points).slice(0,3);

    // ✅ Response
    return NextResponse.json({ runners, walkers, cyclers, teams });
  } catch (err: any) {
    console.error("❌ Unexpected error in /leaderboard:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch leaderboard" }, { status: 500 });
  }
}
