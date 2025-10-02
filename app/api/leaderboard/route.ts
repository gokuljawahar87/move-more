// app/api/leaderboard/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Fixed challenge start (1 Oct 2025, midnight IST)
const challengeStart = new Date("2025-10-01T00:00:00+05:30");

export async function GET() {
  try {
    const now = new Date();

// 1. Build base query
let query = supabaseAdmin
  .from("activities")
  .select(
    `
    id,
    user_id,
    type,
    distance,
    start_date,
    profiles (
      first_name,
      last_name,
      team
    )
  `
  )
  .eq("is_valid", true);   // ✅ only valid activities

// ✅ Apply cutoff only if we're past challenge start
if (now >= challengeStart) {
  query = query.gte("start_date", challengeStart.toISOString());
}

    const { data: activities, error } = await query;

    if (error) {
      console.error("Error fetching leaderboard data:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!activities) {
      return NextResponse.json({
        runners: [],
        walkers: [],
        cyclers: [],
        teams: [],
      });
    }

    // 2. Aggregate distances by user
    const userTotals: Record<
      string,
      {
        name: string;
        team: string | null;
        run: number;
        walk: number;
        cycle: number;
        points: number;
      }
    > = {};

    for (const act of activities) {
      const km = Number(act.distance || 0) / 1000;
      const profile = Array.isArray(act.profiles) ? act.profiles[0] : act.profiles;
      const name = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
      const team = profile?.team ?? null;

      if (!userTotals[act.user_id]) {
        userTotals[act.user_id] = { name, team, run: 0, walk: 0, cycle: 0, points: 0 };
      }

      if (act.type === "Run" || act.type === "TrailRun") {
        userTotals[act.user_id].run += km;
        userTotals[act.user_id].points += km * 15;
      } else if (act.type === "Walk") {
        userTotals[act.user_id].walk += km;
        userTotals[act.user_id].points += km * 5;
      } else if (act.type === "Ride" || act.type === "VirtualRide") {
        userTotals[act.user_id].cycle += km;
        userTotals[act.user_id].points += km * 10;
      }
    }

    // 3. Prepare sorted leaderboards
    const runners = Object.values(userTotals)
      .filter((u) => u.run > 0)
      .sort((a, b) => b.run - a.run)
      .slice(0, 3);

    const walkers = Object.values(userTotals)
      .filter((u) => u.walk > 0)
      .sort((a, b) => b.walk - a.walk)
      .slice(0, 3);

    const cyclers = Object.values(userTotals)
      .filter((u) => u.cycle > 0)
      .sort((a, b) => b.cycle - a.cycle)
      .slice(0, 3);

    // 4. Aggregate by teams
    const teamTotals: Record<string, { team: string; points: number }> = {};
    for (const u of Object.values(userTotals)) {
      if (!u.team) continue;
      if (!teamTotals[u.team]) teamTotals[u.team] = { team: u.team, points: 0 };
      teamTotals[u.team].points += u.points;
    }

    const teams = Object.values(teamTotals)
      .sort((a, b) => b.points - a.points)
      .slice(0, 3);

    return NextResponse.json({ runners, walkers, cyclers, teams });
  } catch (err: any) {
    console.error("Unexpected error in /api/leaderboard:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
