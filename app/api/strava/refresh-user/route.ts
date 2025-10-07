import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const challengeStart = new Date("2025-10-01T00:00:00+05:30");
const challengeStartEpoch = Math.floor(challengeStart.getTime() / 1000);

export async function POST(req: Request) {
  try {
    const { user_id } = await req.json();
    if (!user_id) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    // ✅ Fetch user tokens
    const { data: profile } = await supabase
      .from("profiles")
      .select("strava_access_token, strava_refresh_token, strava_token_expires_at")
      .eq("user_id", user_id)
      .single();

    if (!profile || !profile.strava_refresh_token) {
      return NextResponse.json({ error: "User not connected to Strava" }, { status: 400 });
    }

    let accessToken = profile.strava_access_token;
    const now = Math.floor(Date.now() / 1000);

    // ✅ Refresh token if expired
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
        return NextResponse.json(
          { error: "Failed to refresh Strava token" },
          { status: 500 }
        );
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
        .eq("user_id", user_id);
    }

    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token" }, { status: 400 });
    }

    // ✅ Fetch all activities from Strava (since Oct 1)
    let page = 1;
    let allActivities: any[] = [];
    let keepFetching = true;

    while (keepFetching) {
      const res = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?after=${challengeStartEpoch}&per_page=50&page=${page}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!res.ok) break;
      const batch = await res.json();

      if (Array.isArray(batch) && batch.length > 0) {
        allActivities.push(...batch);
        page++;
      } else {
        keepFetching = false;
      }
    }

    // ✅ Filter only valid (non-manual) activities
    const filtered = allActivities.filter((a: any) => !a.manual);

    // ✅ Prepare IDs for deletion check
    const currentStravaIds = filtered.map((a: any) => a.id);

    // ✅ Delete from Supabase any activities no longer on Strava
    await supabase
      .from("activities")
      .delete()
      .eq("user_id", user_id)
      .not("strava_id", "in", `(${currentStravaIds.join(",") || 0})`);

    if (filtered.length === 0) {
      return NextResponse.json({
        success: true,
        refreshed: 0,
        deleted: 0,
        skipped: true,
        message: "No valid activities found after filtering.",
      });
    }

    // ✅ Format activities for upsert
    const formatted = filtered.map((a: any) => ({
      user_id,
      strava_id: a.id,
      name: a.name,
      type: a.type,
      distance: a.distance,
      moving_time: a.moving_time,
      start_date: a.start_date,
      strava_url: `https://www.strava.com/activities/${a.id}`,
      is_valid: true,
    }));

    // ✅ Fetch existing activities to compare (for skip optimization)
    const { data: existingActs } = await supabase
      .from("activities")
      .select("strava_id, name, distance, moving_time, type")
      .eq("user_id", user_id);

    const existingMap = new Map(existingActs?.map((a) => [a.strava_id, a]) || []);
    const changed = formatted.filter((a) => {
      const ex = existingMap.get(a.strava_id);
      if (!ex) return true;
      return (
        ex.name !== a.name ||
        ex.distance !== a.distance ||
        ex.moving_time !== a.moving_time ||
        ex.type !== a.type
      );
    });

    if (changed.length === 0) {
      return NextResponse.json({
        success: true,
        refreshed: 0,
        deleted: 0,
        skipped: true,
        message: "No new or updated activities since last sync.",
      });
    }

    // ✅ Upsert changed or new activities (overwrite if changed)
    const { error: insertError } = await supabase
      .from("activities")
      .upsert(changed, {
        onConflict: "strava_id",
        ignoreDuplicates: false, // force update existing entries
      });

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      refreshed: changed.length,
      deleted: allActivities.length - filtered.length,
      skipped: false,
    });
  } catch (err: any) {
    console.error("User manual refresh error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
