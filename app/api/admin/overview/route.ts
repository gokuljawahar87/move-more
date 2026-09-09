// app/api/admin/overview/route.ts
//
// The dashboard: the handful of numbers that say whether the season is
// healthy, plus the lists of people who need chasing.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdmin } from "@/lib/adminAuth";
import { SEASON, activeSeason, displayWindowStart } from "@/lib/season";
import { istDayKey } from "@/lib/streak";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const today = istDayKey(new Date());
    const from = displayWindowStart().toISOString();

    const [roster, registered, connected, accepted, actCount, todayActs, sync, champs, leave] =
      await Promise.all([
        supabaseAdmin.from("employee_master").select("user_id", { count: "exact", head: true }),
        supabaseAdmin
          .from("profiles")
          .select("user_id", { count: "exact", head: true })
          .eq("season", SEASON.number),
        supabaseAdmin
          .from("profiles")
          .select("user_id", { count: "exact", head: true })
          .eq("season", SEASON.number)
          .eq("strava_connected", true),
        supabaseAdmin
          .from("terms_acceptances")
          .select("user_id", { count: "exact", head: true })
          .eq("season", SEASON.number),
        supabaseAdmin
          .from("activities")
          .select("id", { count: "exact", head: true })
          .eq("season", activeSeason())
          .gte("start_date", from),
        supabaseAdmin
          .from("activities")
          .select("user_id")
          .eq("season", activeSeason())
          .gte("start_date", `${today}T00:00:00+05:30`),
        supabaseAdmin
          .from("sync_metadata")
          .select("last_refreshed_at")
          .eq("id", 1)
          .maybeSingle(),
        supabaseAdmin.from("weekly_champions").select("week").eq("season", SEASON.number),
        supabaseAdmin
          .from("leave_days")
          .select("user_id", { count: "exact", head: true })
          .eq("season", activeSeason()),
      ]);

    // ── Who needs chasing ────────────────────────────────────────
    const { data: rosterRows } = await supabaseAdmin
      .from("employee_master")
      .select("user_id, first_name, last_name, team");

    const { data: profileRows } = await supabaseAdmin
      .from("profiles")
      .select("user_id, first_name, last_name, team, strava_connected")
      .eq("season", SEASON.number);

    const nameOf = (r: any) =>
      `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || r.user_id;

    const registeredIds = new Set((profileRows ?? []).map((p: any) => p.user_id));

    const notRegistered = (rosterRows ?? [])
      .filter((r: any) => !registeredIds.has(r.user_id))
      .map((r: any) => ({ user_id: r.user_id, name: nameOf(r), team: r.team ?? null }));

    const notConnected = (profileRows ?? [])
      .filter((p: any) => !p.strava_connected)
      .map((p: any) => ({ user_id: p.user_id, name: nameOf(p), team: p.team ?? null }));

    const { data: everActive } = await supabaseAdmin
      .from("activities")
      .select("user_id")
      .eq("season", activeSeason())
      .gte("start_date", from);

    const activeIds = new Set((everActive ?? []).map((a: any) => a.user_id));

    const neverActive = (profileRows ?? [])
      .filter((p: any) => p.strava_connected && !activeIds.has(p.user_id))
      .map((p: any) => ({ user_id: p.user_id, name: nameOf(p), team: p.team ?? null }));

    const lastSync = sync.data?.last_refreshed_at ?? null;

    return NextResponse.json({
      today,
      roster: roster.count ?? 0,
      registered: registered.count ?? 0,
      connected: connected.count ?? 0,
      termsAccepted: accepted.count ?? 0,
      totalActivities: actCount.count ?? 0,
      activeToday: new Set((todayActs.data ?? []).map((a: any) => a.user_id)).size,
      leaveDeclared: leave.count ?? 0,
      weeksSettled: new Set((champs.data ?? []).map((c: any) => c.week)).size,
      lastSync,
      syncAgeMins: lastSync
        ? Math.round((Date.now() - new Date(lastSync).getTime()) / 60000)
        : null,
      notRegistered,
      notConnected,
      neverActive,
    });
  } catch (err: any) {
    console.error("Admin overview error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
