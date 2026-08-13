// app/api/register/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SEASON } from "@/lib/season";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, first_name, last_name, email } = body;

    if (!user_id) {
      return NextResponse.json({ error: "Missing employee ID" }, { status: 400 });
    }

    // Normalise — employee IDs get typed with stray spaces and mixed case
    const id = String(user_id).trim().toUpperCase();

    // ── Roster check ─────────────────────────────────────────────
    // Season 1 accepted any ID at all. Now the ID must exist in
    // employee_master, so only people on this year's roster can enter.
    const { data: emp, error: empError } = await supabaseAdmin
      .from("employee_master")
      .select("user_id, team")
      .eq("user_id", id)
      .maybeSingle();

    if (empError) {
      console.error("employee_master lookup failed:", empError.message);
      return NextResponse.json(
        { error: "Could not verify employee ID. Try again." },
        { status: 500 }
      );
    }

    if (!emp) {
      return NextResponse.json(
        {
          error:
            "That employee ID isn't on the Season 2 roster. Check the ID, or contact the organiser.",
        },
        { status: 403 }
      );
    }

    const team = emp.team?.trim() ?? null;

    // ── Has this person already registered this season? ──────────
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("season, strava_connected")
      .eq("user_id", id)
      .maybeSingle();

    const returningFromLastSeason = !!existing && existing.season !== SEASON.number;

    // ── Upsert ───────────────────────────────────────────────────
    const record: Record<string, any> = {
      user_id: id,
      first_name: first_name?.trim() ?? null,
      last_name: last_name?.trim() ?? null,
      email: email?.trim() ?? null,
      team, // always refreshed from the roster
      season: SEASON.number,
      registered_at: new Date().toISOString(),
    };

    // Returning from Season 1: clear the old tokens so they reconnect.
    // Their activity history is untouched — only the tokens reset.
    if (returningFromLastSeason) {
      record.strava_access_token = null;
      record.strava_refresh_token = null;
      record.strava_token_expires_at = null;
      record.strava_connected = false;
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .upsert(record, { onConflict: "user_id" });

    if (error) throw error;

    const res = NextResponse.json({
      success: true,
      team,
      // The UI uses this to send returning users straight to Strava
      needs_strava: returningFromLastSeason || !existing?.strava_connected,
    });

    res.cookies.set("user_id", id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });

    return res;
  } catch (err: any) {
    console.error("Register API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
