import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Challenge start date (1 Oct 2025, midnight IST)
const challengeStart = new Date("2025-10-01T00:00:00+05:30");

export async function GET() {
  try {
    const now = new Date();

    // ✅ Base query: profiles → activities
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
          distance,
          start_date,
          is_valid
        )
      `)
      .eq("activities.is_valid", true);

    // ✅ Apply challenge start filter
    if (now >= challengeStart) {
      query = query.gte("activities.start_date", challengeStart.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        runners: [],
        walkers: [],
        cyclers: [],
        teams: [],
      });
    }

    // ✅ Calculate user totals
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

    for (const profile of data) {
      if (!profile.activities?.length) continue;

      let run = 0,
        walk = 0,
        cycle = 0,
        points = 0;

      for (const a of profile.activities) {
        const km = Number(a.distance || 0) / 1000;

        if (a.type === "Run" || a.type === "TrailRun") {
          run += km;
          points += km * 15;
        } else if (a.type === "Walk") {
          walk += km;
          points += km * 14;
        } else if (a.type === "Ride" || a.type === "VirtualRide") {
          cycle += km;
          points += km * 6;
        }
      }

      const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
      const team = profile.team ?? null;

      userTotals[profile.user_id] = { name, team, run, walk, cycle, points };
    }

    const users = Object.values(userTotals);

    // ✅ Top 3 individuals per activity
    const runners = users
      .filter((u) => u.run > 0)
      .sort((a, b) => b.run - a.run)
      .slice(0, 3);

    const walkers = users
      .filter((u) => u.walk > 0)
      .sort((a, b) => b.walk - a.walk)
      .slice(0, 3);

    const cyclers = users
      .filter((u) => u.cycle > 0)
      .sort((a, b) => b.cycle - a.cycle)
      .slice(0, 3);

    // ✅ Team leaderboard (same formula as team-performance)
    const teamTotals: Record<string, { team: string; points: number }> = {};
    for (const u of users) {
      if (!u.team) continue;
      if (!teamTotals[u.team]) teamTotals[u.team] = { team: u.team, points: 0 };
      teamTotals[u.team].points += u.points;
    }

    const teams = Object.values(teamTotals).sort((a, b) => b.points - a.points).slice(0, 3);

    // ✅ Final response
    return NextResponse.json({ runners, walkers, cyclers, teams });
  } catch (err: any) {
    console.error("❌ Unexpected error in /api/leaderboard:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
