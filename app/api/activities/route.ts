import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET /api/activities → returns all activities with user info
export async function GET() {
  try {
    // join activities with profiles to get user names
    const { data, error } = await supabaseAdmin
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
      .order("start_date", { ascending: false });

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
