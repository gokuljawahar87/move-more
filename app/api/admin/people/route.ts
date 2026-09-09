// app/api/admin/people/route.ts
//
// Everyone registered this season, with the numbers that matter when
// you're looking someone up. Feeds the refresh picker and the roster.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdmin } from "@/lib/adminAuth";
import { SEASON, activeSeason, displayWindowStart, overlapsNightHours } from "@/lib/season";
import { DailyPoints, disciplineOf } from "@/lib/points";
import { computeStreaks, overlapsOfficeHours } from "@/lib/streak";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const { data: rows, error } = await supabaseAdmin
      .from("profiles")
      .select(
        `user_id, first_name, last_name, team, strava_connected,
         activities ( type, derived_type, distance, moving_time,
                      start_date, is_valid, on_leave_day )`
      )
      .eq("season", SEASON.number)
      .eq("activities.season", activeSeason())
      .gte("activities.start_date", displayWindowStart().toISOString());

    if (error) throw error;

    const people = (rows ?? []).map((p: any) => {
      const acts = Array.isArray(p.activities) ? p.activities : [];

      // Same filters as the leaderboard, so these numbers match what
      // the person sees in the app.
      const counted = acts.filter((a: any) => {
        if (!a?.is_valid || !a.start_date) return false;
        const start = new Date(a.start_date);
        if (overlapsNightHours(start, a.moving_time || 0)) return false;
        if (a.on_leave_day) return true;
        return !overlapsOfficeHours(start, a.moving_time || 0);
      });

      const acc = new DailyPoints();
      for (const a of counted) {
        acc.add(
          a.start_date,
          disciplineOf(a.derived_type || a.type),
          Number(a.distance || 0) / 1000
        );
      }

      const last = acts
        .map((a: any) => a.start_date)
        .sort()
        .slice(-1)[0] ?? null;

      return {
        user_id: p.user_id,
        name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.user_id,
        team: p.team ?? null,
        connected: !!p.strava_connected,
        activities: acts.length,
        counted: counted.length,
        points: Math.round(acc.points),
        km: +(acc.km.run + acc.km.walk + acc.km.cycle).toFixed(1),
        streak: computeStreaks(counted).currentStreak,
        lastActivity: last,
      };
    });

    people.sort((a, b) => b.points - a.points);

    return NextResponse.json({ people });
  } catch (err: any) {
    console.error("Admin people error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
