// app/api/strava/refresh-user/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SEASON, SYNC_FLOOR, seasonForDate } from "@/lib/season";

export const dynamic = "force-dynamic";

// Sync reaches back to the trial start; the season each activity
// belongs to is decided per-activity by seasonForDate().
const SYNC_START = SYNC_FLOOR;

// A manual refresh only needs the last few days. Re-fetching the whole
// season on every tap meant 2-3 Strava requests per person; with a
// hundred people refreshing each morning that exhausts the app-wide
// rate limit and everyone starts getting nothing back.
const MANUAL_LOOKBACK_DAYS = 5;
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
      .select(
        "season, strava_access_token, strava_refresh_token, strava_token_expires_at"
      )
      .eq("user_id", user_id)
      .maybeSingle();

    if (profileError || !profile?.strava_refresh_token) {
      return NextResponse.json(
        { error: "User not connected to Strava" },
        { status: 400 }
      );
    }

    // Not registered for this season — nothing should sync for them.
    if (profile.season !== SEASON.number) {
      return NextResponse.json(
        { error: "Not registered for this season" },
        { status: 403 }
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
    // Start from whichever is later: the season floor, or a few days
    // back. One page, one request.
    const lookbackStart = new Date(
      Date.now() - MANUAL_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
    );
    const fetchFrom =
      lookbackStart > SYNC_START ? lookbackStart : SYNC_START;
    const afterEpoch = Math.floor(fetchFrom.getTime() / 1000);

    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${afterEpoch}&per_page=100&page=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
      const detail = await res.text();
      const usage = res.headers.get("x-ratelimit-usage");
      console.error(
        `❌ Strava fetch failed for ${user_id}:`,
        res.status,
        `rate-limit usage ${usage}`,
        detail.slice(0, 200)
      );

      // Rate limiting used to be swallowed — the loop broke, zero
      // activities came back, and the app reported "nothing new". Say
      // what actually happened instead.
      if (res.status === 429) {
        return NextResponse.json(
          {
            error: "rate_limited",
            message:
              "Strava is busy right now. Your activity will appear automatically within a few minutes.",
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: "strava_error",
          status: res.status,
          message: "Couldn't reach Strava. Try again in a moment.",
        },
        { status: 502 }
      );
    }

    const batch = await res.json();
    const allActivities: any[] = Array.isArray(batch) ? batch : [];

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
      `🧭 ${user_id}: Strava returned ${allActivities.length}, ${filtered.length} within window since ${fetchFrom.toISOString()}`
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

    // ── Declared leave days ──────────────────────────────────────────
    // Needed at sync time so activities arriving later still pick up an
    // existing declaration.
    const { data: leaveRows } = await supabaseAdmin
      .from("leave_days")
      .select("leave_date, created_at")
      .eq("user_id", user_id);

    const leaveMap = new Map(
      (leaveRows || []).map((l: any) => [l.leave_date, new Date(l.created_at)])
    );

    const istDay = (d: Date) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);

    const onLeave = (startISO: string) => {
      const start = new Date(startISO);
      const declaredAt = leaveMap.get(istDay(start));
      // Same-day declarations only cover activities started afterwards
      return !!declaredAt && start >= declaredAt;
    };

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
          on_leave_day: onLeave(a.start_date),

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
