// app/api/profile/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SEASON } from "@/lib/season";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const user_id = cookieStore.get("user_id")?.value;

    if (!user_id) {
      return NextResponse.json({ user_id: null });
    }

    // Must be on this season's roster
    const { data: emp, error: empErr } = await supabaseAdmin
      .from("employee_master")
      .select("user_id, team")
      .eq("user_id", user_id)
      .maybeSingle();

    if (empErr || !emp) {
      return NextResponse.json({ user_id, not_employee: true });
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "user_id, first_name, last_name, team, strava_connected, season"
      )
      .eq("user_id", user_id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ user_id, not_employee: false, no_profile: true });
    }

    // ── Season gate ──────────────────────────────────────────────
    // A Season 1 profile is not a Season 2 registration. Treating it
    // as one is what would carry last year's team across.
    if (data.season !== SEASON.number) {
      return NextResponse.json({
        user_id,
        not_employee: false,
        no_profile: true,
        previous_season: data.season,
        first_name: data.first_name,
        last_name: data.last_name,
      });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Profile API error:", err);
    return NextResponse.json({ error: err.message, user_id: null }, { status: 500 });
  }
}
