// app/api/strava/refresh/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const challengeStart = new Date("2025-10-01T00:00:00+05:30");
const challengeStartEpoch = Math.floor(challengeStart.getTime() / 1000);

export async function POST() {
  try {
    const { data: profiles, error: fetchError } = await supabase
      .from("profiles")
      .select("user_id, strava_access_token, strava_refresh_token, strava_token_expires_at");

    if (fetchError) throw fetchError;
    if (!profiles?.length) return NextResponse.json({ error: "No connected users" }, { status: 400 });

    let refreshedUsers = 0;
    let cleanedUsers = 0;

    for (const profile of profiles) {
      if (!profile.strava_refresh_token) continue;
      let accessToken = profile.strava_access_token;

      // 🔁 Refresh token if expired
      const now = Math.floor(Date.now() / 1000);
      if (!accessToken || profile.strava_token_expires_at < now) {
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
        if (!tokenRes.ok) continue;

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

      // 🗂 Fetch all Strava activities
      let page = 1;
      let allActivities: any[] = [];
      let keepFetching = true;

      while (keepFetching) {
        const url = `https://www.strava.com/api/v3/athlete/activities?after=${challengeStartEpoch}&per_page=200&page=${page}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!res.ok) break;

        const batch = await res.json();
        if (batch.length > 0) {
          allActivities.push(...batch);
          page++;
        } else keepFetching = false;
      }

      // 🧹 Filter manual uploads
      const freshStrava = allActivities.filter((a: any) => !a.manual);

      // 📥 Fetch existing records for this user
      const { data: existing, error: existingError } = await supabase
        .from("activities")
        .select("id, strava_id, is_valid")
        .eq("user_id", profile.user_id);

      if (existingError) continue;

      const existingMap = new Map(
        (existing || []).map((a) => [String(a.strava_id), a.is_valid])
      );

      const stravaIds = new Set(freshStrava.map((a: any) => String(a.id)));

      // ❌ Remove deleted Strava activities
      const deletedIds = (existing || [])
        .filter((a) => !stravaIds.has(String(a.strava_id)))
        .map((a) => a.strava_id);

      if (deletedIds.length) {
        await supabase
          .from("activities")
          .delete()
          .in("strava_id", deletedIds)
          .eq("user_id", profile.user_id);
        cleanedUsers++;
      }

      // 🧩 Prepare upserts (preserve manual FALSE always)
      const formatted = freshStrava.map((a: any) => ({
        user_id: profile.user_id,
        strava_id: a.id,
        name: a.name,
        type: a.type,
        distance: a.distance,
        moving_time: a.moving_time,
        start_date: a.start_date,
        strava_url: `https://www.strava.com/activities/${a.id}`,
        // 🚫 Never overwrite manual FALSE
        is_valid: existingMap.has(String(a.id)) ? existingMap.get(String(a.id)) : true,
      }));

      // 🧷 First upsert without touching is_valid at all
      const { error: upsertError } = await supabase
        .from("activities")
        .upsert(formatted, { onConflict: "strava_id" });

      if (upsertError) {
        console.error(`❌ Upsert error for ${profile.user_id}:`, upsertError);
        continue;
      }

      refreshedUsers++;
    }

    // 🕒 Update sync metadata
    await supabase.from("sync_metadata").upsert({
      id: 1,
      last_refreshed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      refreshedUsers,
      cleanedUsers,
    });
  } catch (err: any) {
    console.error("❌ Refresh failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
