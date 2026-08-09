// app/api/strava/refresh/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // ⬅️ was the anon client; writes need service role

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Strava sync across all users can be slow

// ─────────────────────────────────────────────────────────────────────
// 🗓️  SYNC WINDOW  — see refresh-user/route.ts for the full explanation.
// The old 2025-10-29 / 2025-10-31 cutoffs meant this route silently
// synced nothing. Replaced with a rolling lookback for the smoke test.
// ─────────────────────────────────────────────────────────────────────

const TEST_LOOKBACK_DAYS = 30;

const SYNC_START = new Date(
  Date.now() - TEST_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
);
const SYNC_END: Date | null = null; // null = no upper bound

// Set to false while testing — when true, activities that vanished from
// Strava get deleted locally. Risky to leave on during a trial run.
const ENABLE_DELETIONS = false;

async function runRefresh() {
  const { data: profiles, error: fetchError } = await supabaseAdmin
    .from("profiles")
    .select(
      "user_id, strava_access_token, strava_refresh_token, strava_token_expires_at"
    );

  if (fetchError) throw fetchError;
  if (!profiles?.length) {
    return { refreshedUsers: 0, cleanedUsers: 0, note: "No profiles found" };
  }

  let refreshedUsers = 0;
  let cleanedUsers = 0;
  let totalUpserted = 0;
  const failures: { user_id: string; reason: string }[] = [];

  for (const profile of profiles) {
    if (!profile.strava_refresh_token) continue;

    let accessToken = profile.strava_access_token;
    const now = Math.floor(Date.now() / 1000);

    // ── Refresh token if expired ───────────────────────────────────
    if (
      !accessToken ||
      !profile.strava_token_expires_at ||
      profile.strava_token_expires_at < now
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
        // ⬇️ Old code did a silent `continue` here — you could never tell
        // whether a user failed or simply had nothing new.
        failures.push({
          user_id: profile.user_id,
          reason: `token_refresh_${tokenRes.status}`,
        });
        continue;
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
        .eq("user_id", profile.user_id);
    }

    if (!accessToken) continue;

    // ── Pull activities ────────────────────────────────────────────
    const afterEpoch = Math.floor(SYNC_START.getTime() / 1000);
    const allActivities: any[] = [];
    let page = 1;

    while (page <= 10) {
      const res = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?after=${afterEpoch}&per_page=200&page=${page}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!res.ok) {
        failures.push({
          user_id: profile.user_id,
          reason: `activities_${res.status}`,
        });
        break;
      }

      const batch = await res.json();
      if (!Array.isArray(batch) || batch.length === 0) break;

      allActivities.push(...batch);
      page++;
    }

    // ── Filter ─────────────────────────────────────────────────────
    const freshStrava = allActivities.filter((a: any) => {
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
      `🧭 ${profile.user_id}: ${allActivities.length} from Strava, ${freshStrava.length} in window`
    );

    if (freshStrava.length === 0) continue;

    // ── Existing rows ──────────────────────────────────────────────
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("activities")
      .select("id, strava_id, is_valid, is_valid_locked, derived_type, start_date")
      .eq("user_id", profile.user_id);

    if (existingError) {
      failures.push({ user_id: profile.user_id, reason: "db_read_failed" });
      continue;
    }

    const existingMap = new Map(
      (existing || []).map((a) => [String(a.strava_id), a])
    );

    // ── Optional cleanup of deleted-on-Strava activities ───────────
    if (ENABLE_DELETIONS) {
      const stravaIds = new Set(freshStrava.map((a: any) => String(a.id)));
      const deletedIds = (existing || [])
        .filter(
          (a) =>
            !stravaIds.has(String(a.strava_id)) &&
            !a.is_valid_locked &&
            new Date(a.start_date) >= SYNC_START
        )
        .map((a) => a.strava_id);

      if (deletedIds.length) {
        await supabaseAdmin
          .from("activities")
          .delete()
          .in("strava_id", deletedIds)
          .eq("user_id", profile.user_id);
        cleanedUsers++;
      }
    }

    // ── Build upserts ──────────────────────────────────────────────
    const formatted = freshStrava
      .filter((a: any) => !existingMap.get(String(a.id))?.is_valid_locked)
      .map((a: any) => {
        const existingRecord = existingMap.get(String(a.id));

        const paceMinPerKm =
          a.moving_time > 0 && a.distance > 0
            ? a.moving_time / 60 / (a.distance / 1000)
            : 0;

        let derivedType = a.type;
        if ((a.type === "Run" || a.type === "TrailRun") && paceMinPerKm >= 8.5) {
          derivedType = "Reclassified-Walk";
        }

        return {
          user_id: profile.user_id,
          strava_id: a.id,
          name: a.name,
          type: a.type,
          derived_type: existingRecord?.derived_type || derivedType,
          distance: a.distance,
          moving_time: a.moving_time,
          start_date: a.start_date,
          strava_url: `https://www.strava.com/activities/${a.id}`,
          is_valid: existingRecord ? existingRecord.is_valid : true,
          is_valid_locked: existingRecord?.is_valid_locked || false,
        };
      });

    if (formatted.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from("activities")
        .upsert(formatted, { onConflict: "strava_id" });

      if (upsertError) {
        console.error(`❌ Upsert error for ${profile.user_id}:`, upsertError);
        failures.push({ user_id: profile.user_id, reason: "upsert_failed" });
        continue;
      }
      totalUpserted += formatted.length;
    }

    refreshedUsers++;
  }

  await supabaseAdmin.from("sync_metadata").upsert({
    id: 1,
    last_refreshed_at: new Date().toISOString(),
  });

  return {
    refreshedUsers,
    cleanedUsers,
    totalUpserted,
    totalProfiles: profiles.length,
    failures, // ⬅️ now visible instead of silently swallowed
  };
}

// Vercel Cron sends GET requests — the old code only exported POST,
// so the scheduled sync in vercel.json was returning 405 every time.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }
  }

  try {
    const stats = await runRefresh();
    return NextResponse.json({ success: true, source: "cron", ...stats });
  } catch (err: any) {
    console.error("❌ Refresh failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Manual trigger from the admin button in Activities.tsx
export async function POST() {
  try {
    const stats = await runRefresh();
    return NextResponse.json({ success: true, source: "manual", ...stats });
  } catch (err: any) {
    console.error("❌ Refresh failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
