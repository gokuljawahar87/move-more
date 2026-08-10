import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SYNC_FLOOR, seasonForDate } from "@/lib/season";

export const dynamic = "force-dynamic";

// Sync reaches back to the trial start; the season each activity
// belongs to is decided per-activity by seasonForDate().
const SYNC_START = SYNC_FLOOR;
const SYNC_END: Date | null = null;

export async function POST(req: Request) {
  try {
    const { user_id } = await req.json();
    if (!user_id) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    // ── Load tokens ──────────────────────────────────────────────────
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("strava_access_token, strava_refresh_token, strava_token_expires_at")
      .eq("user_id", user_id)
      .maybeSingle();

    if (profileError || !profile?.strava_refresh_token) {
      return NextResponse.json(
        { error: "User not connected to Strava" },
        { status: 400 }
      );
    }

    let accessToken = profile.strava_access_token;
    const now = Math.floor(Date.now() / 1000);

    // ── Refresh token if expired (or missing) ────────────────────────
    if (!accessToken || !profile.strava_token_expires_at || profile.strava_token_expires_at < now) {
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
        const detail = await tokenRes.text();
        console.error(`❌ Token refresh failed for ${user_id}:`, tokenRes.status, detail);
        return NextResponse.json(
          { error: "Failed to refresh Strava token", status: tokenRes.status },
          { status: 502 }
        );
      }

      const tokenData = await tokenRes.json();
      accessToken = tokenData.access_token;

      await supabaseAdmin
        .from("profiles")
        .update({
          strava_access_token: tokenData.access_token,
          strava_refresh_token: tokenData.refresh_token,
          strava_token_expires_at: tokenData.expires_at,
        })
        .eq("user_id", user_id);
    }

    // ── Pull activities ──────────────────────────────────────────────
    const afterEpoch = Math.floor(SYNC_START.getTime() / 1000);
    const allActivities: any[] = [];
    let page = 1;

    while (page <= 10) {
      const res = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?after=${afterEpoch}&per_page=100&page=${page}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!res.ok) {
        const detail = await res.text();
        console.error(`❌ Strava activities fetch failed:`, res.status, detail);
        break;
      }

      const batch = await res.json();
      if (!Array.isArray(batch) || batch.length === 0) break;

      allActivities.push(...batch);
      page++;
    }

    // ── Filter: no manual entries, inside the sync window ────────────
    const filtered = allActivities.filter((a: any) => {
      if (a.manual) return false;

      const startDate = new Date(a.start_date);
      if (startDate < SYNC_START) return false;

      if (SYNC_END) {
        const endDate = new Date(
          startDate.getTime() + (a.moving_time || 0) * 1000
        );
        if (endDate > SYNC_END) return false;
      }
      return true;
    });

    console.log(
      `🧭 ${user_id}: Strava returned ${allActivities.length}, ${filtered.length} within window since ${SYNC_START.toISOString()}`
    );

    if (filtered.length === 0) {
      return NextResponse.json({
        success: true,
        refreshed: 0,
        skipped: true,
        fetchedFromStrava: allActivities.length,
        message: "Strava responded, but no non-manual activities in the window.",
      });
    }

    // ── Respect locked rows ──────────────────────────────────────────
    const { data: existingActs } = await supabaseAdmin
      .from("activities")
      .select("strava_id, is_valid, is_valid_locked, derived_type")
      .eq("user_id", user_id);

    const existingMap = new Map(
      (existingActs || []).map((a) => [String(a.strava_id), a])
    );

    const upserts = filtered
      .filter((a: any) => !existingMap.get(String(a.id))?.is_valid_locked)
      .map((a: any) => {
        const existing = existingMap.get(String(a.id));

        // Slow "runs" get reclassified as walks (same rule as the master refresh)
        const paceMinPerKm =
          a.moving_time > 0 && a.distance > 0
            ? a.moving_time / 60 / (a.distance / 1000)
            : 0;

        let derivedType = a.type;
        if ((a.type === "Run" || a.type === "TrailRun") && paceMinPerKm >= 8.5) {
          derivedType = "Reclassified-Walk";
        }

        return {
          user_id,
          strava_id: a.id,
          name: a.name,
          type: a.type,
          derived_type: existing?.derived_type || derivedType,
          distance: a.distance,
          moving_time: a.moving_time,
          start_date: a.start_date,
          strava_url: `https://www.strava.com/activities/${a.id}`,
          is_valid: existing ? existing.is_valid : true,
          is_valid_locked: existing?.is_valid_locked || false,

          // Which season this belongs to — trial data is tagged 0
          season: seasonForDate(new Date(a.start_date)),

          // ── Fraud-detection fields ──────────────────────────────
          // elapsed vs moving catches all-day recording;
          // max_speed catches vehicle spikes in walks and runs.
          elapsed_time: a.elapsed_time ?? null,
          max_speed: a.max_speed ?? null,
          average_speed: a.average_speed ?? null,
          strava_flagged: a.flagged ?? false,
          trainer: a.trainer ?? false,
          device_name: a.device_name ?? null,
        };
      });

    if (upserts.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from("activities")
        .upsert(upserts, { onConflict: "strava_id" });

      if (upsertError) throw upsertError;
    }

    return NextResponse.json({
      success: true,
      refreshed: upserts.length,
      fetchedFromStrava: allActivities.length,
      message: `Synced ${upserts.length} activities.`,
    });
  } catch (err: any) {
    console.error("User refresh error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
