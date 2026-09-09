// app/api/admin/refresh-day/route.ts
//
// Re-pull one person's activities for one day.
//
// The case this exists for: you flag something, they fix it on Strava
// — trim it, rename it, split it, delete it — and you need that day to
// reflect reality without re-syncing the whole season.
//
// Unlike the automatic syncs, this DOES delete. That's the point: if
// they removed an activity, it should go. The window is a single day
// and it's a deliberate action, so the boundary problem that made the
// automatic deletes unsafe doesn't apply here.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdmin } from "@/lib/adminAuth";
import { SEASON, seasonForDate } from "@/lib/season";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const { user_id, date } = await req.json();

    if (!user_id || !/^\d{4}-\d{2}-\d{2}$/.test(String(date ?? ""))) {
      return NextResponse.json(
        { error: "Need a user_id and a date as YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // The IST day, as an absolute window
    const dayStart = new Date(`${date}T00:00:00+05:30`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    // ── Tokens ───────────────────────────────────────────────────
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select(
        "first_name, last_name, strava_access_token, strava_refresh_token, strava_token_expires_at"
      )
      .eq("user_id", user_id)
      .maybeSingle();

    if (!profile?.strava_refresh_token) {
      return NextResponse.json(
        { error: "That person has no Strava connection." },
        { status: 400 }
      );
    }

    let accessToken = profile.strava_access_token;
    const now = Math.floor(Date.now() / 1000);

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
        return NextResponse.json(
          { error: `Strava rejected the token (${tokenRes.status}).` },
          { status: 502 }
        );
      }

      const t = await tokenRes.json();
      accessToken = t.access_token;

      await supabaseAdmin
        .from("profiles")
        .update({
          strava_access_token: t.access_token,
          strava_refresh_token: t.refresh_token,
          strava_token_expires_at: t.expires_at,
        })
        .eq("user_id", user_id);
    }

    // ── Fetch the day, with an hour either side ──────────────────
    // The margin covers an activity that begins just before midnight,
    // and any drift in how Strava interprets the timestamp.
    const after = Math.floor(dayStart.getTime() / 1000) - 3600;
    const before = Math.floor(dayEnd.getTime() / 1000) + 3600;

    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&before=${before}&per_page=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        {
          error:
            res.status === 429
              ? "Strava is rate limiting right now. Try again in a few minutes."
              : `Strava returned ${res.status}.`,
          detail: detail.slice(0, 200),
        },
        { status: 502 }
      );
    }

    const fetched = (await res.json()) as any[];

    // Only what actually falls on the chosen IST day
    const onDay = (Array.isArray(fetched) ? fetched : []).filter((a) => {
      if (a.manual) return false;
      const t = new Date(a.start_date).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    });

    // ── What we hold for that day ────────────────────────────────
    const { data: existing } = await supabaseAdmin
      .from("activities")
      .select("id, strava_id, is_valid, is_valid_locked, derived_type")
      .eq("user_id", user_id)
      .gte("start_date", dayStart.toISOString())
      .lt("start_date", dayEnd.toISOString());

    type Held = {
      id: number;
      strava_id: number;
      is_valid: boolean;
      is_valid_locked: boolean;
      derived_type: string | null;
    };

    const existingMap = new Map<string, Held>(
      (existing ?? []).map((a: any) => [String(a.strava_id), a as Held])
    );

    // ── Upsert ───────────────────────────────────────────────────
    const rows = onDay
      .filter((a) => !existingMap.get(String(a.id))?.is_valid_locked)
      .map((a) => {
        const prev = existingMap.get(String(a.id));

        const paceMinPerKm =
          a.moving_time > 0 && a.distance > 0
            ? a.moving_time / 60 / (a.distance / 1000)
            : 0;

        let derived = a.type;
        if ((a.type === "Run" || a.type === "TrailRun") && paceMinPerKm >= 8.5) {
          derived = "Reclassified-Walk";
        }

        return {
          user_id,
          strava_id: a.id,
          name: a.name,
          type: a.type,
          // A rename or a trim can change the classification, so this is
          // recomputed rather than carried over.
          derived_type: derived,
          distance: a.distance,
          moving_time: a.moving_time,
          elapsed_time: a.elapsed_time ?? null,
          max_speed: a.max_speed ?? null,
          average_speed: a.average_speed ?? null,
          strava_flagged: a.flagged ?? false,
          trainer: a.trainer ?? false,
          device_name: a.device_name ?? null,
          start_date: a.start_date,
          strava_url: `https://www.strava.com/activities/${a.id}`,
          season: seasonForDate(new Date(a.start_date)),
          is_valid: prev ? prev.is_valid : true,
          is_valid_locked: prev?.is_valid_locked ?? false,
        };
      });

    if (rows.length) {
      const { error } = await supabaseAdmin
        .from("activities")
        .upsert(rows, { onConflict: "strava_id" });
      if (error) throw error;
    }

    // ── Remove what's gone from Strava ───────────────────────────
    // Safe here in a way it isn't during an automatic sync: the window
    // is one fixed day, the fetch covered it with margin, and you asked
    // for this deliberately.
    const liveIds = new Set(onDay.map((a) => String(a.id)));

    const gone = (existing ?? [])
      .filter(
        (a: any) => !a.is_valid_locked && !liveIds.has(String(a.strava_id))
      )
      .map((a: any) => a.strava_id);

    let deleted = 0;
    if (gone.length) {
      const { error } = await supabaseAdmin
        .from("activities")
        .delete()
        .in("strava_id", gone)
        .eq("user_id", user_id);
      if (!error) deleted = gone.length;
    }

    const locked = (existing ?? []).filter((a: any) => a.is_valid_locked).length;

    return NextResponse.json({
      success: true,
      person: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
      date,
      fetchedFromStrava: onDay.length,
      updated: rows.length,
      deleted,
      skippedLocked: locked,
      activities: onDay.map((a) => ({
        name: a.name,
        type: a.type,
        km: +(Number(a.distance || 0) / 1000).toFixed(2),
        mins: Math.round((a.moving_time || 0) / 60),
        start: a.start_date,
      })),
    });
  } catch (err: any) {
    console.error("Admin refresh-day error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
