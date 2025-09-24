import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const team = searchParams.get("team");

    if (!team) {
      return NextResponse.json({ error: "Missing team parameter" }, { status: 400 });
    }

    // Fetch profiles + joined activities
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
      )
      .eq("team", team);

    if (error) {
      console.error("❌ Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      console.log("⚠️ No profiles found for team:", team);
      return NextResponse.json([]);
    }

    console.log("✅ Raw profiles fetched:", JSON.stringify(data, null, 2));

    const members = data.map((profile: any) => {
      let run = 0,
        walk = 0,
        cycle = 0;

      console.log(`📊 Activities for ${profile.first_name} ${profile.last_name}:`, profile.activities);

      if (Array.isArray(profile.activities)) {
        profile.activities.forEach((a: any) => {
          if (a.type === "Run" || a.type === "TrailRun") run += a.distance / 1000;
          if (a.type === "Walk") walk += a.distance / 1000;
          if (a.type === "Ride" || a.type === "VirtualRide") cycle += a.distance / 1000;
        });
      } else {
        console.log(`⚠️ No activities array for ${profile.first_name} ${profile.last_name}`);
      }

      return {
        name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
        run,
        walk,
        cycle,
      };
    });

    console.log("✅ Aggregated results:", members);

    return NextResponse.json(members);
  } catch (err: any) {
    console.error("❌ API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
