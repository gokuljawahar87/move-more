// lib/refreshAll.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchStravaActivities } from "@/lib/strava";

/**
 * Upsert a batch of activities for one user.
 * Expects "activities" to be in your normalized shape (strava_id, name, type, distance, moving_time, start_date, strava_url).
 */
async function upsertActivities(user_id: string, activities: any[]) {
  if (!activities?.length) return;
  const { error } = await supabaseAdmin
    .from("activities")
    .upsert(
      activities.map((a) => ({
        user_id,
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

/**
 * Refresh an access token if expired (optional but recommended).
 * Assumes profiles has: strava_access_token, strava_refresh_token, strava_expires_at (unix seconds).
 */
async function ensureValidAccessToken(profile: any) {
  const now = Math.floor(Date.now() / 1000);
  if (profile.strava_access_token && profile.strava_expires_at && profile.strava_expires_at > now) {
    return profile.strava_access_token; // still valid
  }

  if (!profile.strava_refresh_token) return null;

  // Refresh with Strava
  const resp = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: profile.strava_refresh_token,
    }),
  });

  if (!resp.ok) return null;

  const tok = await resp.json();
  const { access_token, refresh_token, expires_at } = tok ?? {};
  await supabaseAdmin
    .from("profiles")
    .update({
      strava_access_token: access_token ?? null,
      strava_refresh_token: refresh_token ?? profile.strava_refresh_token ?? null,
      strava_expires_at: expires_at ?? null,
      strava_connected: true,
    })
    .eq("user_id", profile.user_id);

  return access_token ?? null;
}

/** Refresh all connected users. Returns stats. */
export async function refreshAllConnectedUsers() {
  const { data: users, error } = await supabaseAdmin
    .from("profiles")
    .select("user_id, strava_connected, strava_access_token, strava_refresh_token, strava_expires_at")
    .eq("strava_connected", true);

  if (error) throw error;

  let refreshed = 0;
  for (const u of users ?? []) {
    try {
      // Ensure we have a valid access token
      let token = u.strava_access_token || null;
      token = await ensureValidAccessToken({ ...u, strava_access_token: token }) || token;
      if (!token) continue;

      const acts = await fetchStravaActivities(token);
      await upsertActivities(u.user_id, acts);

      refreshed++;
      // small delay to be nice to Strava API (optional)
      await new Promise((r) => setTimeout(r, 150));
    } catch (e) {
      console.warn("Failed refreshing for user", u.user_id, e);
    }
  }

  return { usersScanned: users?.length ?? 0, refreshed };
}
