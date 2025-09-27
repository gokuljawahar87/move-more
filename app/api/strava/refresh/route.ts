import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST() {
  try {
    // 1. Get all connected users with Strava tokens
    const { data: profiles, error: fetchError } = await supabase
      .from("profiles")
      .select("user_id, strava_access_token, strava_refresh_token, strava_token_expires_at");

    if (fetchError) throw fetchError;

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ error: "No connected users" }, { status: 400 });
    }

    let refreshedUsers = 0;

    for (const profile of profiles) {
      if (!profile.strava_refresh_token) continue;

      let accessToken = profile.strava_access_token;

      // 2. Refresh if token is missing or expired
      const now = Math.floor(Date.now() / 1000);
      if (!accessToken || (profile.strava_token_expires_at && profile.strava_token_expires_at < now)) {
        const tokenRes = await fetch("https://www.strava.com/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            grant_type: "refresh_token",
            refresh_token: profile.strava_refresh_token,
          }),
        });

        if (!tokenRes.ok) {
          const errTxt = await tokenRes.text();
          console.error(
            `Token refresh failed for user ${profile.user_id}:`,
            tokenRes.status,
            errTxt
          );
          continue;
        }

        const tokenData = await tokenRes.json();
        if (tokenData.errors) {
          console.error(
            `Token refresh failed for user ${profile.user_id}:`,
            tokenData.errors
          );
          continue;
        }

        accessToken = tokenData.access_token;

        // Save tokens & expiry in DB (using your actual column names ✅)
        await supabase
          .from("profiles")
          .update({
            strava_access_token: tokenData.access_token,
            strava_refresh_token: tokenData.refresh_token,
            strava_token_expires_at: tokenData.expires_at, // Unix timestamp
          })
          .eq("user_id", profile.user_id);
      }

      if (!accessToken) continue;

      // 3. Fetch recent activities from Strava
      const activitiesRes = await fetch(
        "https://www.strava.com/api/v3/athlete/activities?per_page=50",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!activitiesRes.ok) {
        const errTxt = await activitiesRes.text();
        console.error(
          `Activities fetch failed for user ${profile.user_id}:`,
          activitiesRes.status,
          errTxt
        );
        continue;
      }

      const activities = await activitiesRes.json();

      if (Array.isArray(activities)) {
        // 4. Upsert activities into Supabase
        const formatted = activities.map((a: any) => ({
          user_id: profile.user_id,
          strava_id: a.id,
          name: a.name,
          type: a.type,
          distance: a.distance,
          moving_time: a.moving_time,
          start_date: a.start_date,
          strava_url: `https://www.strava.com/activities/${a.id}`,
        }));

        const { error: insertError } = await supabase
          .from("activities")
          .upsert(formatted, { onConflict: "strava_id" });

        if (insertError) {
          console.error("Insert error:", insertError);
        } else {
          refreshedUsers++;
        }
      }
    }

    return NextResponse.json({ success: true, refreshedUsers });
  } catch (err) {
    console.error("Manual refresh error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
