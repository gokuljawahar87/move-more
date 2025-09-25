// app/api/team-performance/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    // ✅ Fetch all profiles with their activities
    const { data, error } = await supabaseAdmin
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
      );

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

          if (a.type === "Run" || a.type === "TrailRun") {
            run += km;
            points += km * 15; // ✅ Run points
          }
          if (a.type === "Walk") {
            walk += km;
            points += km * 5; // ✅ Walk points
          }
          if (a.type === "Ride" || a.type === "VirtualRide") {
            cycle += km;
            points += km * 10; // ✅ Cycle points
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

    // ✅ Convert to array
    const teams = Object.values(teamMap);

    return NextResponse.json(teams);
  } catch (err: any) {
    console.error("❌ API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
