import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Challenge start (1 Oct 2025 midnight IST)
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
    if (!profiles?.length)
      return NextResponse.json({ error: "No connected users" }, { status: 400 });

    let refreshedUsers = 0;

    for (const profile of profiles) {
      if (!profile.strava_refresh_token) continue;

      let accessToken = profile.strava_access_token;
      const now = Math.floor(Date.now() / 1000);

      // 🔐 Refresh expired token
      if (!accessToken || (profile.strava_token_expires_at ?? 0) < now) {
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
          console.error(`Token refresh failed for ${profile.user_id}`);
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

      // 🕒 Always fetch all challenge-period activities
      let page = 1;
      let allActivities: any[] = [];
      let keepFetching = true;

      while (keepFetching) {
        const url = `https://www.strava.com/api/v3/athlete/activities?after=${challengeStartEpoch}&per_page=100&page=${page}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
          console.error(`Fetch failed for user ${profile.user_id}: ${res.status}`);
          break;
        }

        const batch = await res.json();

        if (Array.isArray(batch) && batch.length > 0) {
          allActivities.push(...batch);
          page++;
        } else {
          keepFetching = false;
        }
      }

      if (allActivities.length > 0) {
        const filtered = allActivities.filter((a) => !a.manual);

        // 🧠 Step 1: Fetch existing validity flags
        const { data: existingFlags, error: flagErr } = await supabase
          .from("activities")
          .select("strava_id, is_valid")
          .eq("user_id", profile.user_id);

        const validMap =
          !flagErr && existingFlags?.length
            ? Object.fromEntries(
                existingFlags.map((r) => [r.strava_id?.toString(), r.is_valid])
              )
            : {};

        // 🧱 Step 2: Format and preserve validity
        const formatted = filtered.map((a) => ({
          user_id: profile.user_id,
          strava_id: a.id.toString(),
          name: a.name,
          type: a.type,
          distance: a.distance,
          moving_time: a.moving_time,
          start_date: a.start_date,
          strava_url: `https://www.strava.com/activities/${a.id}`,
          is_valid: validMap[a.id.toString()] ?? true, // ✅ Preserve if exists
        }));

        // 1️⃣ Upsert with preserved validity
        const { error: insertError } = await supabase
          .from("activities")
          .upsert(formatted, { onConflict: "strava_id" });

        if (insertError) console.error("Insert error:", insertError);
        else refreshedUsers++;

        // 2️⃣ Delete stale activities (removed from Strava)
        const stravaIds = formatted.map((a) => a.strava_id);
        const { data: existing, error: existingErr } = await supabase
          .from("activities")
          .select("strava_id")
          .eq("user_id", profile.user_id);

        if (!existingErr && existing?.length) {
          const existingIds = existing.map((a) => a.strava_id?.toString());
          const toDelete = existingIds.filter((id) => !stravaIds.includes(id));

          if (toDelete.length > 0) {
            console.log(`🗑 Deleting ${toDelete.length} old activities for ${profile.user_id}`);
            const { error: delErr } = await supabase
              .from("activities")
              .delete()
              .in("strava_id", toDelete);

            if (delErr) console.error("❌ Delete error:", delErr);
          }
        }
      }
    }

    // 🔁 Update metadata
    await supabase.from("sync_metadata").upsert({
      id: 1,
      last_refreshed_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, refreshedUsers });
  } catch (err) {
    console.error("Critical refresh error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
