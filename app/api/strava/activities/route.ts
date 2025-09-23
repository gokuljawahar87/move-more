import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const cookieStore = cookies();
    const user_id = cookieStore.get("user_id")?.value;

    if (!user_id) {
      return NextResponse.json({ error: "No user session found" }, { status: 401 });
    }

    // Get Strava tokens for this user
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("access_token, refresh_token, strava_id")
      .eq("user_id", user_id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { access_token } = profile;

    // Fetch activities from Strava API
    const activitiesResponse = await fetch(
      "https://www.strava.com/api/v3/athlete/activities?per_page=50",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const activities = await activitiesResponse.json();

    if (!activitiesResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch activities", details: activities },
        { status: activitiesResponse.status }
      );
    }

    // Insert or update activities in DB with employee user_id
    const mappedActivities = activities.map((act: any) => ({
      id: act.id,
      user_id, // ✅ use employee Uxxxx ID, not strava:xxxx
      name: act.name,
      type: act.type,
      distance: act.distance / 1000, // meters → km
      moving_time: act.moving_time,
      start_date: act.start_date,
    }));

    const { error: upsertError } = await supabase
      .from("activities")
      .upsert(mappedActivities, { onConflict: "id" });

    if (upsertError) {
      console.error("Error saving activities:", upsertError.message);
      return NextResponse.json({ error: "Error saving activities" }, { status: 500 });
    }

    return NextResponse.json({ success: true, activities: mappedActivities });
  } catch (err: any) {
    console.error("Activities error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
