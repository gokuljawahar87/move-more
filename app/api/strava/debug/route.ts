// app/api/strava/debug/route.ts
// 🔍 TEMPORARY diagnostic route — delete before the new event goes live.
//
// Usage:  /api/strava/debug?user_id=U262861&secret=YOUR_DEBUG_SECRET
//
// Tells you, step by step, whether Strava developer access still works:
//   1. Are the env vars present?
//   2. Does the stored refresh_token still exchange for an access_token?
//   3. Does /athlete respond (i.e. is the app still authorised)?
//   4. How many activities exist in the last 60 days?
// No tokens are ever returned in the response.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const steps: any[] = [];
  const log = (step: string, ok: boolean, detail: any = null) =>
    steps.push({ step, ok, detail });

  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");
    const secret = searchParams.get("secret");

    // 🔒 Simple guard so this isn't world-readable
    if (process.env.DEBUG_SECRET && secret !== process.env.DEBUG_SECRET) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // ── 1. Environment ────────────────────────────────────────────────
    const env = {
      STRAVA_CLIENT_ID: !!process.env.STRAVA_CLIENT_ID,
      STRAVA_CLIENT_SECRET: !!process.env.STRAVA_CLIENT_SECRET,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL ?? null,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
    const envOk = env.STRAVA_CLIENT_ID && env.STRAVA_CLIENT_SECRET;
    log("env_vars", envOk, env);
    if (!envOk) {
      return NextResponse.json(
        { ok: false, verdict: "Strava env vars missing in Vercel", steps },
        { status: 500 }
      );
    }

    if (!user_id) {
      return NextResponse.json(
        { ok: false, verdict: "Pass ?user_id=<employee id>", steps },
        { status: 400 }
      );
    }

    // ── 2. Stored tokens ──────────────────────────────────────────────
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select(
        "user_id, first_name, strava_connected, strava_access_token, strava_refresh_token, strava_token_expires_at"
      )
      .eq("user_id", user_id)
      .maybeSingle();

    if (profErr || !profile) {
      log("load_profile", false, profErr?.message ?? "not found");
      return NextResponse.json(
        { ok: false, verdict: "No such profile in Supabase", steps },
        { status: 404 }
      );
    }

    const nowSec = Math.floor(Date.now() / 1000);
    log("load_profile", true, {
      name: profile.first_name,
      strava_connected: profile.strava_connected,
      has_refresh_token: !!profile.strava_refresh_token,
      token_expires_at: profile.strava_token_expires_at,
      token_expired: profile.strava_token_expires_at
        ? profile.strava_token_expires_at < nowSec
        : null,
    });

    if (!profile.strava_refresh_token) {
      return NextResponse.json(
        {
          ok: false,
          verdict: "User has no refresh_token — they must reconnect Strava",
          steps,
        },
        { status: 400 }
      );
    }

    // ── 3. Token exchange ─────────────────────────────────────────────
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

    const tokenBody = await tokenRes.text();

    if (!tokenRes.ok) {
      log("token_refresh", false, {
        status: tokenRes.status,
        body: tokenBody.slice(0, 500),
      });
      return NextResponse.json(
        {
          ok: false,
          verdict:
            tokenRes.status === 401
              ? "Strava rejected the refresh token — app credentials changed, or the user revoked access. Reconnect required."
              : `Strava token endpoint returned ${tokenRes.status}`,
          steps,
        },
        { status: 200 }
      );
    }

    const tokenData = JSON.parse(tokenBody);
    const accessToken = tokenData.access_token;
    log("token_refresh", true, {
      expires_at: tokenData.expires_at,
      scope_returned: tokenData.scope ?? "(not returned by Strava)",
    });

    // Persist the rotated tokens so this test doesn't waste them
    await supabaseAdmin
      .from("profiles")
      .update({
        strava_access_token: tokenData.access_token,
        strava_refresh_token: tokenData.refresh_token,
        strava_token_expires_at: tokenData.expires_at,
      })
      .eq("user_id", user_id);

    // ── 4. Athlete endpoint ───────────────────────────────────────────
    const athleteRes = await fetch("https://www.strava.com/api/v3/athlete", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const athleteBody = await athleteRes.text();

    if (!athleteRes.ok) {
      log("athlete_call", false, {
        status: athleteRes.status,
        body: athleteBody.slice(0, 500),
        rate_limit_usage: athleteRes.headers.get("x-ratelimit-usage"),
      });
      return NextResponse.json(
        {
          ok: false,
          verdict:
            athleteRes.status === 429
              ? "Rate limited by Strava — wait 15 minutes"
              : "Access token works for refresh but /athlete failed — check app scopes",
          steps,
        },
        { status: 200 }
      );
    }

    const athlete = JSON.parse(athleteBody);
    log("athlete_call", true, {
      strava_id: athlete.id,
      username: athlete.username ?? null,
      rate_limit_usage: athleteRes.headers.get("x-ratelimit-usage"),
      rate_limit_limit: athleteRes.headers.get("x-ratelimit-limit"),
    });

    // ── 5. Recent activities ──────────────────────────────────────────
    const after = Math.floor(Date.now() / 1000) - 60 * 24 * 60 * 60; // 60 days
    const actRes = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=200&page=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const actBody = await actRes.text();

    if (!actRes.ok) {
      log("activities_call", false, {
        status: actRes.status,
        body: actBody.slice(0, 500),
      });
      return NextResponse.json(
        {
          ok: false,
          verdict:
            "activity:read_all scope may be missing — user needs to reconnect and approve activity access",
          steps,
        },
        { status: 200 }
      );
    }

    const acts = JSON.parse(actBody);
    log("activities_call", true, {
      count_last_60_days: Array.isArray(acts) ? acts.length : 0,
      sample: Array.isArray(acts)
        ? acts.slice(0, 5).map((a: any) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            start_date: a.start_date,
            distance_km: +(Number(a.distance || 0) / 1000).toFixed(2),
            manual: a.manual,
          }))
        : [],
    });

    // ── 6. What's already in Supabase ─────────────────────────────────
    const { count } = await supabaseAdmin
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id);

    log("supabase_activity_count", true, { rows_stored: count ?? 0 });

    return NextResponse.json({
      ok: true,
      verdict:
        "✅ Strava developer access is working. Token refresh, /athlete and /activities all responded.",
      steps,
    });
  } catch (err: any) {
    log("unexpected_error", false, err.message);
    return NextResponse.json({ ok: false, steps }, { status: 500 });
  }
}
