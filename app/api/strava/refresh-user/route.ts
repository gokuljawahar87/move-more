import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const challengeStart = new Date("2025-10-01T00:00:00+05:30");
const challengeStartEpoch = Math.floor(challengeStart.getTime() / 1000);

// 🚫 Freeze cutoff date — protect all activities before this
const refreshCutoff = new Date("2025-10-29T00:00:00+05:30");

// 🚫 End of competition cutoff — ignore anything beyond this time
const competitionCutoff = new Date("2025-10-31T22:00:00+05:30"); // 10 PM IST

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

    // 🔁 Refresh token if expired
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

      if (!tokenRes.ok) {
        return NextResponse.json({ error: "Failed to refresh Strava token" }, { status: 500 });
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

    // ✅ Fetch activities from Strava since challenge start
    let page = 1;
    let allActivities: any[] = [];
    let keepFetching = true;

    while (keepFetching) {
      const res = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?after=${challengeStartEpoch}&per_page=100&page=${page}`,
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

    // ✅ Filter only non-manual + within valid window
    const filtered = allActivities.filter((a: any) => {
      if (a.manual) return false;

      const startDate = new Date(a.start_date);
      const endDate = new Date(startDate.getTime() + (a.moving_time || 0) * 1000);

      // ✅ Include only if within the valid time window
      return startDate >= refreshCutoff && endDate <= competitionCutoff;
    });

    console.log(
      `🧭 User ${user_id}: Found ${filtered.length} valid activities between ${refreshCutoff.toISOString().split("T")[0]} and cutoff ${competitionCutoff.toISOString()}`
    );

    if (filtered.length === 0) {
      return NextResponse.json({
        success: true,
        refreshed: 0,
        skipped: true,
        message: "No valid activities found after cutoff — older ones preserved.",
      });
    }

    // ✅ Prepare formatted activities for upsert
    const formatted = filtered.map((a: any) => ({
      user_id,
      strava_id: a.id,
      name: a.name,
      type: a.type,
      distance: a.distance,
      moving_time: a.moving_time,
      start_date: a.start_date,
      strava_url: `https://www.strava.com/activities/${a.id}`,
      is_valid: true, // default true for new activities only
    }));

    // ✅ Fetch existing for lock protection
    const { data: existingActs } = await supabase
      .from("activities")
      .select("strava_id, is_valid, is_valid_locked, start_date")
      .eq("user_id", user_id);

    const existingMap = new Map(
      (existingActs || []).map((a) => [String(a.strava_id), a])
    );

    const upserts = formatted.filter((a) => {
      const existing = existingMap.get(String(a.strava_id));
      if (existing?.is_valid_locked) return false; // skip locked
      return true;
    });

    if (upserts.length > 0) {
      const { error: upsertError } = await supabase
        .from("activities")
        .upsert(upserts, { onConflict: "strava_id" });

      if (upsertError) throw upsertError;
    }

    return NextResponse.json({
      success: true,
      refreshed: upserts.length,
      message: `Refreshed ${upserts.length} activities within valid window.`,
    });
  } catch (err: any) {
    console.error("User refresh error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
