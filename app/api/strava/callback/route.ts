// app/api/strava/callback/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchStravaActivities } from "@/lib/strava"; // ✅ correct import

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // state = user_id

    if (!code || !state) {
      return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
    }

    // ✅ Exchange Strava code for access token
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
      return NextResponse.redirect(new URL("/app", req.url));
    }

    // ✅ Insert/Update activities in Supabase
    const { error } = await supabaseAdmin.from("activities").upsert(
      activities.map((a) => ({
        user_id: state, // from state param (registration step)
        strava_id: a.strava_id, // must exist as unique key in DB
        name: a.name,
        type: a.type,
        distance: a.distance,
        moving_time: a.moving_time,
        start_date: a.start_date,
        strava_url: a.strava_url,
      })),
      { onConflict: "strava_id" } // ensures no duplicates + auto-update fields
    );

    if (error) throw error;

    // ✅ Persist session cookie
    const res = NextResponse.redirect(new URL("/app", req.url));
    res.cookies.set("user_id", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res;
  } catch (err: any) {
    console.error("Strava callback error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
