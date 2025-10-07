// app/api/strava/refresh/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Fixed challenge start (1 Oct 2025, midnight IST)
const challengeStart = new Date("2025-10-01T00:00:00+05:30");
const challengeStartEpoch = Math.floor(challengeStart.getTime() / 1000);

export async function POST() {
  try {
    const { data: profiles, error: fetchError } = await supabase
      .from("profiles")
      .select(
        "user_id, strava_access_token, strava_refresh_token, strava_token_expires_at"
      );

    if (fetchError) throw fetchError;
    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ error: "No connected users" }, { status: 400 });
    }

    let refreshedUsers = 0;

    for (const profile of profiles) {
      if (!profile.strava_refresh_token) continue;

      let accessToken = profile.strava_access_token;

      // ✅ Refresh token if expired
      const now = Math.floor(Date.now() / 1000);
      if (
        !accessToken ||
        (profile.strava_token_expires_at &&
          profile.strava_token_expires_at < now)
      ) {
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
          console.error(
            `Token refresh failed for user ${profile.user_id}: ${tokenRes.status}`
          );
          continue;
        }

        const tokenData = await tokenRes.json();
        accessToken = tokenData.access_token;

        await supabase
          .from("profiles")
          .update({
            strava_access_token: tokenData.access_token,
            strava_refresh_token: tokenData.refresh_token,
            strava_token_expires_at: tokenData.expires_at,
          })
          .eq("user_id", profile.user_id);
      }

      if (!accessToken) continue;

      // ✅ Get last synced activity
      const { data: lastActivity } = await supabase
        .from("activities")
        .select("start_date")
        .eq("user_id", profile.user_id)
        .order("start_date", { ascending: false })
        .limit(1)
        .single();

      const afterEpoch = lastActivity
        ? Math.floor(new Date(lastActivity.start_date).getTime() / 1000)
        : challengeStartEpoch;

      // ✅ Fetch with pagination
      let page = 1;
      let allActivities: any[] = [];
      let keepFetching = true;

      while (keepFetching) {
        const url = `https://www.strava.com/api/v3/athlete/activities?after=${afterEpoch}&per_page=50&page=${page}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
          console.error(
            `Activities fetch failed for user ${profile.user_id}: ${res.status}`
          );
          break;
        }

        const batch = await res.json();

        if (Array.isArray(batch) && batch.length > 0) {
          allActivities.push(...batch);
          page++;
        } else {
          keepFetching = false; // ✅ no more activities
        }
      }

      if (allActivities.length > 0) {
        // ✅ Filter out manually added activities (no GPS)
        const filtered = allActivities.filter((a: any) => !a.manual);

        if (filtered.length === 0) continue; // no valid activities

        const formatted = filtered.map((a: any) => ({
          user_id: profile.user_id,
          strava_id: a.id,
          name: a.name,
          type: a.type,
          distance: a.distance,
          moving_time: a.moving_time,
          start_date: a.start_date,
          strava_url: `https://www.strava.com/activities/${a.id}`,
          is_valid: true,
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

    // ✅ Update sync metadata
    await supabase.from("sync_metadata").upsert({
      id: 1,
      last_refreshed_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, refreshedUsers });
  } catch (err) {
    console.error("Manual refresh error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
