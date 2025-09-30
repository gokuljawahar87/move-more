import { supabase } from "@/lib/supabaseClient";

// Fixed challenge start (1 Oct 2025, midnight IST)
const challengeStart = new Date("2025-10-01T00:00:00+05:30");
const challengeStartEpoch = Math.floor(challengeStart.getTime() / 1000);

export async function refreshAllConnectedUsers() {
  const { data: profiles, error: fetchError } = await supabase
    .from("profiles")
    .select(
      "user_id, strava_access_token, strava_refresh_token, strava_token_expires_at"
    );

  if (fetchError) throw fetchError;

  let refreshedUsers = 0;

  for (const profile of profiles || []) {
    if (!profile.strava_refresh_token) continue;

    let accessToken = profile.strava_access_token;

    // Refresh token if expired
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

    // Fetch only activities after challenge start
    const activitiesRes = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=50&after=${challengeStartEpoch}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!activitiesRes.ok) continue;
    const activities = await activitiesRes.json();

    if (Array.isArray(activities)) {
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

      if (!insertError) refreshedUsers++;
    }
  }

  return { refreshedUsers };
}
