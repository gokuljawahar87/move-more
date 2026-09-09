// app/api/admin/review/route.ts
//
// The review queue, and the verdicts you pass on it.
//
// Nothing is decided automatically. The score sorts the list; you
// decide. A verdict sets is_valid_locked, so a later sync can't
// silently undo it.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdmin } from "@/lib/adminAuth";
import { SEASON, activeSeason, displayWindowStart } from "@/lib/season";
import { buildQueue, findOverlaps, LIMITS } from "@/lib/suspicion";

export const dynamic = "force-dynamic";

/** GET — the queue. ?status=pending|cleared|voided&min=20 */
export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "pending";
    const minScore = Number(searchParams.get("min") ?? 25);

    const { data: acts, error } = await supabaseAdmin
      .from("activities")
      .select(
        `id, strava_id, user_id, name, type, derived_type, distance,
         moving_time, elapsed_time, max_speed, average_speed,
         strava_flagged, trainer, device_name, start_date,
         is_valid, is_valid_locked, on_leave_day,
         profiles ( first_name, last_name, team )`
      )
      .eq("season", activeSeason())
      .gte("start_date", displayWindowStart().toISOString())
      .order("start_date", { ascending: false })
      .limit(3000);

    if (error) throw error;

    const withNames = (acts ?? []).map((a: any) => ({
      ...a,
      person: a.profiles
        ? `${a.profiles.first_name ?? ""} ${a.profiles.last_name ?? ""}`.trim()
        : a.user_id,
      team: a.profiles?.team ?? null,
    }));

    // Reviewed already, or still waiting on a verdict
    const filtered = withNames.filter((a: any) => {
      if (status === "cleared") return a.is_valid_locked && a.is_valid;
      if (status === "voided") return a.is_valid_locked && !a.is_valid;
      return !a.is_valid_locked; // pending
    });

    const queue = buildQueue(filtered, minScore);

    // Overlapping pairs are a property of two activities, not one, so
    // they're surfaced separately rather than scored into the queue.
    const overlaps = findOverlaps(filtered as any).map((o) => ({
      minutes: o.minutes,
      a: { id: o.a.id, name: o.a.name, start_date: o.a.start_date },
      b: { id: o.b.id, name: o.b.name, start_date: o.b.start_date },
      person: (o.a as any).person,
      user_id: o.a.user_id,
    }));

    return NextResponse.json({
      queue: queue.slice(0, 200),
      total: queue.length,
      overlaps: overlaps.slice(0, 50),
      scanned: filtered.length,
      limits: LIMITS,
    });
  } catch (err: any) {
    console.error("Admin review error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST — pass a verdict.
 * Body: { id, verdict: "void" | "clear" | "reset", note? }
 */
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const { id, verdict, note } = await req.json();
    if (!id || !verdict) {
      return NextResponse.json({ error: "Missing id or verdict" }, { status: 400 });
    }

    // Locking matters: without it the next sync would overwrite the
    // verdict with whatever Strava says, and the activity would quietly
    // come back.
    const patch: Record<string, any> = {
      review_note: note ?? null,
      reviewed_at: new Date().toISOString(),
    };

    if (verdict === "void") {
      patch.is_valid = false;
      patch.is_valid_locked = true;
      patch.review_status = "rejected";
    } else if (verdict === "clear") {
      patch.is_valid = true;
      patch.is_valid_locked = true;
      patch.review_status = "cleared";
    } else if (verdict === "reset") {
      patch.is_valid = true;
      patch.is_valid_locked = false;
      patch.review_status = "unreviewed";
      patch.reviewed_at = null;
    } else {
      return NextResponse.json({ error: "Unknown verdict" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("activities")
      .update(patch)
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, id, verdict });
  } catch (err: any) {
    console.error("Admin verdict error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
