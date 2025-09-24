import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    // 1. Fetch activities with profiles joined
    const { data: activities, error } = await supabaseAdmin
      .from("activities")
      .select(
        `
        id,
        user_id,
        type,
        distance,
        profiles (
          first_name,
          last_name,
          team
        )
      `
      );

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
      const name = `${act.profiles?.first_name ?? ""} ${act.profiles?.last_name ?? ""}`.trim();
      const team = act.profiles?.team ?? null;

      if (!userTotals[act.user_id]) {
        userTotals[act.user_id] = { name, team, run: 0, walk: 0, cycle: 0, points: 0 };
      }

      if (act.type === "Run" || act.type === "TrailRun") {
        userTotals[act.user_id].run += km;
        userTotals[act.user_id].points += km * 100;
      } else if (act.type === "Walk") {
        userTotals[act.user_id].walk += km;
        userTotals[act.user_id].points += km * 50;
      } else if (act.type === "Ride" || act.type === "VirtualRide") {
        userTotals[act.user_id].cycle += km;
        userTotals[act.user_id].points += km * 10;
      }
    }

    // 3. Prepare sorted leaderboards
    const runners = Object.values(userTotals)
      .filter((u) => u.run > 0)
      .sort((a, b) => b.run - a.run);

    const walkers = Object.values(userTotals)
      .filter((u) => u.walk > 0)
      .sort((a, b) => b.walk - a.walk);

    const cyclers = Object.values(userTotals)
      .filter((u) => u.cycle > 0)
      .sort((a, b) => b.cycle - a.cycle);

    // 4. Aggregate by teams
    const teamTotals: Record<string, { team: string; points: number }> = {};
    for (const u of Object.values(userTotals)) {
      if (!u.team) continue;
      if (!teamTotals[u.team]) teamTotals[u.team] = { team: u.team, points: 0 };
      teamTotals[u.team].points += u.points;
    }

    const teams = Object.values(teamTotals).sort((a, b) => b.points - a.points);

    return NextResponse.json({ runners, walkers, cyclers, teams });
  } catch (err: any) {
    console.error("Unexpected error in /api/leaderboard:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
