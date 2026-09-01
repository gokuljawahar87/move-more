// app/api/strava/refresh/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SEASON, SYNC_FLOOR, seasonForDate } from "@/lib/season";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Sync reaches back to the trial start; the season each activity
// belongs to is decided per-activity by seasonForDate().
const SYNC_START = SYNC_FLOOR;
const SYNC_END: Date | null = null;

// Deletion of vanished activities stays off through the trial.
// Activities deleted on Strava are removed here too. Guarded by
// fetchOk below: a partial fetch must never be read as "everything
// else was deleted".
const ENABLE_DELETIONS = true;

async function runRefresh() {
  // Only people who have registered for THIS season. Without this the
  // sync pulls activities for last season's participants, which is how
  // unregistered members' data was appearing in the app.
  const { data: profiles, error: fetchError } = await supabaseAdmin
    .from("profiles")
    .select(
      "user_id, strava_access_token, strava_refresh_token, strava_token_expires_at"
    )
    .eq("season", SEASON.number);

  if (fetchError) throw fetchError;
  if (!profiles?.length) {
    return { refreshedUsers: 0, cleanedUsers: 0, note: "No profiles found" };
  }

  // Declared leave days for everyone, fetched once rather than per user
  const { data: allLeave } = await supabaseAdmin
    .from("leave_days")
    .select("user_id, leave_date, created_at");

  const leaveByUser = new Map<string, Map<string, Date>>();
  for (const l of allLeave || []) {
    if (!leaveByUser.has(l.user_id)) leaveByUser.set(l.user_id, new Map());
    leaveByUser.get(l.user_id)!.set(l.leave_date, new Date(l.created_at));
  }

  const istDay = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);

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
    // Only trust the fetch for deletions if every page came back.
    let fetchOk = true;

    while (page <= 10) {
      const res = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?after=${afterEpoch}&per_page=200&page=${page}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!res.ok) {
        fetchOk = false;
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
    // A partial fetch would make every unfetched activity look deleted,
    // so skip the cleanup entirely unless the whole window came back.
    if (ENABLE_DELETIONS && fetchOk) {
      const stravaIds = new Set(freshStrava.map((a: any) => String(a.id)));
      const deletedIds = (existing || [])
        .filter(
          (a) =>
            !stravaIds.has(String(a.strava_id)) &&
            !a.is_valid_locked &&
            new Date(a.start_date) >= SYNC_START
        )
        .map((a) => a.strava_id);

      // A sanity ceiling. Losing a handful to a genuine deletion is
      // normal; losing dozens at once means something is wrong with the
      // fetch, and it's better to skip than to destroy the season.
      const tooMany = deletedIds.length > 25;

      if (deletedIds.length && !tooMany) {
        await supabaseAdmin
          .from("activities")
          .delete()
          .in("strava_id", deletedIds)
          .eq("user_id", profile.user_id);
        cleanedUsers++;
        console.log(
          `🗑️ ${profile.user_id}: removed ${deletedIds.length} deleted from Strava`
        );
      } else if (tooMany) {
        failures.push({
          user_id: profile.user_id,
          reason: `skipped_bulk_delete_${deletedIds.length}`,
        });
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

          // Which season this belongs to — trial data is tagged 0
          season: seasonForDate(new Date(a.start_date)),
          on_leave_day: (() => {
            const start = new Date(a.start_date);
            const declaredAt = leaveByUser.get(profile.user_id)?.get(istDay(start));
            // Same-day declarations only cover later activities
            return !!declaredAt && start >= declaredAt;
          })(),

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
