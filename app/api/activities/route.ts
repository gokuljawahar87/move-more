import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Fixed challenge start (1 Oct 2025, midnight IST)
const challengeStart = new Date("2025-10-01T00:00:00+05:30");

export async function GET() {
  try {
    const now = new Date();

    // join activities with profiles to get user names
    let query = supabaseAdmin
      .from("activities")
      .select(
        `
        id,
        name,
        type,
        distance,
        moving_time,
        start_date,
        strava_url,
        user_id,
        profiles (
          first_name,
          last_name,
          team
        )
      `
      )
      .eq("is_valid", true)   // ✅ filter only valid
      .order("start_date", { ascending: false });

    // ✅ Apply cutoff only if we're past challenge start
    if (now >= challengeStart) {
      query = query.gte("start_date", challengeStart.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching activities:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("✅ Activities fetched:", data?.length || 0);

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error("Unexpected error in /api/activities:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch activities" },
      { status: 500 }
    );
  }
}
