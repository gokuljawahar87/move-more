// app/api/strava/callback/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchStravaActivities } from "@/lib/strava";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // state = user_id

    if (!code || !state) {
      return NextResponse.json(
        { error: "Missing code or state" },
        { status: 400 }
      );
    }

    // ✅ Exchange Strava code for access/refresh tokens
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
      const errText = await tokenRes.text();
      throw new Error(
        `Failed to exchange code for Strava token: ${tokenRes.status} ${errText}`
      );
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_at } = tokenData;

    // ✅ Fetch initial Strava activities
    const activities = await fetchStravaActivities(access_token);

    if (activities.length > 0) {
      const { error } = await supabaseAdmin.from("activities").upsert(
        activities.map((a) => ({
          user_id: state,
          strava_id: a.strava_id,
          name: a.name,
          type: a.type,
          distance: a.distance,
          moving_time: a.moving_time,
          start_date: a.start_date,
          strava_url: a.strava_url,
        })),
        { onConflict: "strava_id" }
      );

      if (error) throw error;
    }

    // ✅ Save tokens & mark as connected
    await supabaseAdmin
      .from("profiles")
      .update({
        strava_connected: true,
        strava_access_token: access_token,
        strava_refresh_token: refresh_token,
        strava_token_expires_at: expires_at,
      })
      .eq("user_id", state);

    // ✅ Persist session cookie
    const res = NextResponse.redirect(new URL("/app", req.url));
    res.cookies.set("user_id", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 90, // 90 days
    });

    return res;
  } catch (err: any) {
    console.error("Strava callback error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
