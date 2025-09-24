// app/api/strava/callback/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchStravaActivities } from "@/lib/strava"; // ✅ correct import

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // user_id or session state

    if (!code || !state) {
      return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
    }

    // ✅ Exchange code for access token
    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      throw new Error("Failed to exchange code for Strava token");
    }

    const tokenData = await tokenRes.json();
    const access_token = tokenData.access_token;

    // ✅ Fetch Strava activities
    const activities = await fetchStravaActivities(access_token);

    if (!activities.length) {
      return NextResponse.json({ message: "No activities found" });
    }

    // ✅ Upsert activities into Supabase
    const { error } = await supabaseAdmin.from("activities").upsert(
      activities.map((a) => ({
        user_id: state, // state = user_id from registration/login
        strava_id: a.strava_id, // unique key for dedupe
        name: a.name,
        type: a.type,
        distance: a.distance,
        moving_time: a.moving_time,
        start_date: a.start_date,
        strava_url: a.strava_url,
      })),
      { onConflict: "strava_id" } // ✅ prevent duplicates, update if changed
    );

    if (error) throw error;

    return NextResponse.redirect(new URL("/app", req.url));
  } catch (err: any) {
    console.error("Strava callback error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
