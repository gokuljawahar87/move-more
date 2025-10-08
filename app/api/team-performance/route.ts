import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Fixed challenge start (1 Oct 2025, midnight IST)
const challengeStart = new Date("2025-10-01T00:00:00+05:30");

export async function GET() {
  try {
    const now = new Date();

    // ✅ Fetch all profiles with their activities
    let query = supabaseAdmin
      .from("profiles")
      .select(
        `
        user_id,
        first_name,
        last_name,
        team,
        activities (
          id,
          name,
          type,
          distance,
          moving_time,
          start_date
        )
      `
      )
      .eq("activities.is_valid", true); // ✅ only valid activities

    // ✅ Apply cutoff only if we're past challenge start
    if (now >= challengeStart) {
      query = query.gte("activities.start_date", challengeStart.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json([]);
    }

    // ✅ Group by team
    const teamMap: Record<
      string,
      {
        teamName: string;
        totalPoints: number;
        members: {
          name: string;
          run: number;
          walk: number;
          cycle: number;
          points: number;
        }[];
      }
    > = {};

    for (const profile of data) {
      if (!profile.team) continue; // skip users without team

      let run = 0,
        walk = 0,
        cycle = 0,
        points = 0;

      if (Array.isArray(profile.activities)) {
        profile.activities.forEach((a: any) => {
          const km = Number(a.distance || 0) / 1000;

          // 🧮 Updated points system
          if (a.type === "Run" || a.type === "TrailRun") {
            run += km;
            points += km * 15; // 🏃 Running = 15 pts/km
          }
          if (a.type === "Walk") {
            walk += km;
            points += km * 14; // 🚶 Walking = 14 pts/km
          }
          if (a.type === "Ride" || a.type === "VirtualRide") {
            cycle += km;
            points += km * 6; // 🚴 Cycling = 6 pts/km
          }
        });
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

    // ✅ Convert to array for response
    const teams = Object.values(teamMap).sort((a, b) => b.totalPoints - a.totalPoints);

    return NextResponse.json(teams);
  } catch (err: any) {
    console.error("❌ API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
