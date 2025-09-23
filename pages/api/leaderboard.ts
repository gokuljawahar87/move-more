// File: pages/api/leaderboard.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req, res) {
  try {
    // Fetch activities joined with profiles + employee_master (for team)
    const { data, error } = await supabase
      .from("activities")
      .select(`
        id, type, distance,
        user_id,
        profiles (first_name, last_name, team)
      `);

    if (error) return res.status(500).json({ error });

    // Aggregate scores
    const scores: Record<string, any> = {};
    const teamScores: Record<string, number> = {};

    data.forEach((a: any) => {
      const km = a.distance / 1000;
      let points = 0;

      if (a.type === "Run" || a.type === "TrailRun") points = km * 50;
      if (a.type === "Walk") points = km * 5;
      if (a.type === "Ride") points = km * 20;

      if (!scores[a.user_id]) {
        scores[a.user_id] = {
          user_id: a.user_id,
          name: `${a.profiles?.first_name ?? ""} ${a.profiles?.last_name ?? ""}`,
          run: 0,
          walk: 0,
          cycle: 0,
          totalPoints: 0,
          team: a.profiles?.team ?? "Unknown",
        };
      }

      if (a.type === "Run" || a.type === "TrailRun") scores[a.user_id].run += km;
      if (a.type === "Walk") scores[a.user_id].walk += km;
      if (a.type === "Ride") scores[a.user_id].cycle += km;

      scores[a.user_id].totalPoints += points;

      // Team aggregation
      if (!teamScores[scores[a.user_id].team]) teamScores[scores[a.user_id].team] = 0;
      teamScores[scores[a.user_id].team] += points;
    });

    // Convert to arrays
    const runners = Object.values(scores)
      .sort((a: any, b: any) => b.run - a.run)
      .slice(0, 3);

    const walkers = Object.values(scores)
      .sort((a: any, b: any) => b.walk - a.walk)
      .slice(0, 3);

    const cyclers = Object.values(scores)
      .sort((a: any, b: any) => b.cycle - a.cycle)
      .slice(0, 3);

    const teams = Object.entries(teamScores)
      .map(([team, points]) => ({ team, points }))
      .sort((a: any, b: any) => b.points - a.points)
      .slice(0, 3);

    res.json({ runners, walkers, cyclers, teams });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
