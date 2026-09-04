// app/api/popups/route.ts
//
// Two kinds of popup, shown one at a time:
//
//   announcement — written by the organisers, shown to everyone
//   milestone    — somebody crossed a threshold, and everyone sees it
//
// Milestones are PUBLIC RECOGNITION, not a private pat on the back. When
// a person crosses 25 km walked, the whole team is told.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SEASON, activeSeason, displayWindowStart } from "@/lib/season";
import { overlapsOfficeHours } from "@/lib/streak";
import { DailyPoints, disciplineOf } from "@/lib/points";
import { earnedMilestones } from "@/lib/milestones";

export const dynamic = "force-dynamic";

/** How often the milestone scan is allowed to run. */
const SCAN_INTERVAL_MS = 3 * 60 * 1000;

async function currentUser(): Promise<string | null> {
  const store = await cookies();
  return store.get("user_id")?.value ?? null;
}

/**
 * Look for milestones nobody has recorded yet and log them as events.
 *
 * Throttled: this totals every participant's season, so running it on
 * every app open would be wasteful. Once every few minutes is ample —
 * recognition arriving a couple of minutes late costs nothing.
 */
async function scanForNewMilestones() {
  const { data: scanRow } = await supabaseAdmin
    .from("milestone_scan")
    .select("last_scan_at")
    .eq("id", 1)
    .maybeSingle();

  const last = scanRow?.last_scan_at
    ? new Date(scanRow.last_scan_at).getTime()
    : 0;

  if (Date.now() - last < SCAN_INTERVAL_MS) return;

  // Claim the slot first, so two simultaneous requests don't both scan
  await supabaseAdmin
    .from("milestone_scan")
    .upsert({ id: 1, last_scan_at: new Date().toISOString() });

  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select(
      `
      user_id,
      first_name,
      last_name,
      team,
      activities (
        type,
        derived_type,
        distance,
        moving_time,
        start_date,
        is_valid,
        on_leave_day
      )
    `
    )
    .eq("season", SEASON.number)
    .eq("activities.is_valid", true)
    .eq("activities.season", activeSeason())
    .gte("activities.start_date", displayWindowStart().toISOString());

  if (error || !profiles?.length) return;

  // What's already been recognised
  const { data: existing } = await supabaseAdmin
    .from("milestone_events")
    .select("user_id, milestone_key")
    .eq("season", SEASON.number);

  const known = new Set(
    (existing ?? []).map((e: any) => `${e.user_id}:${e.milestone_key}`)
  );

  const newEvents: any[] = [];

  for (const p of profiles as any[]) {
    const acts = Array.isArray(p.activities) ? p.activities : [];
    if (!acts.length) continue;

    // Same filters the leaderboard uses, so a milestone can never be
    // reached on activity that doesn't actually score.
    const counted = acts.filter((a: any) => {
      if (!a?.is_valid || !a.start_date) return false;
      const start = new Date(a.start_date);
      if (a.on_leave_day) return true;
      return !overlapsOfficeHours(start, a.moving_time || 0);
    });

    if (!counted.length) continue;

    const acc = new DailyPoints();
    for (const a of counted) {
      acc.add(
        a.start_date,
        disciplineOf(a.derived_type || a.type),
        Number(a.distance || 0) / 1000
      );
    }

    // Distance only — streaks and points no longer have milestones, so
    // there's no reason to compute them here.
    const totals = {
      run: acc.km.run,
      walk: acc.km.walk,
      cycle: acc.km.cycle,
    };

    const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();

    for (const ms of earnedMilestones(totals)) {
      if (known.has(`${p.user_id}:${ms.id}`)) continue;
      newEvents.push({
        season: SEASON.number,
        user_id: p.user_id,
        name,
        team: p.team ?? null,
        milestone_key: ms.id,
        title: ms.title,
        kicker: ms.kicker,
        achieved_at: new Date().toISOString(),
      });
    }
  }

  if (newEvents.length > 0) {
    await supabaseAdmin
      .from("milestone_events")
      .upsert(newEvents, { onConflict: "season,user_id,milestone_key" });
    console.log(`🏅 Recorded ${newEvents.length} new milestone(s)`);
  }
}

export async function GET() {
  try {
    const user_id = await currentUser();
    if (!user_id) return NextResponse.json({ popup: null });

    await scanForNewMilestones();

    const { data: seenRows, error: seenError } = await supabaseAdmin
      .from("popup_seen")
      .select("kind, key")
      .eq("user_id", user_id)
      .eq("season", SEASON.number);

    // If the tables were never created this is where it shows. The route
    // used to swallow it and report "nothing", which is impossible to
    // tell apart from working correctly.
    if (seenError) {
      console.error("Popups: popup_seen unavailable —", seenError.message);
      return NextResponse.json({ popup: null, error: "popup_seen_missing" });
    }

    const seen = new Set(
      (seenRows ?? []).map((r: any) => `${r.kind}:${r.key}`)
    );

    // ── 1. Announcements ─────────────────────────────────────────
    const nowIso = new Date().toISOString();
    const { data: anns } = await supabaseAdmin
      .from("announcements")
      .select("id, kicker, title, body")
      .eq("season", SEASON.number)
      .eq("active", true)
      .lte("starts_at", nowIso)
      .order("created_at", { ascending: true });

    const liveAnn = (anns ?? []).find(
      (a: any) => !seen.has(`announcement:${a.id}`)
    );

    if (liveAnn) {
      return NextResponse.json({
        popup: {
          kind: "announcement",
          key: String(liveAnn.id),
          kicker: liveAnn.kicker ?? "Announcement",
          title: liveAnn.title,
          body: liveAnn.body,
        },
      });
    }

    // ── 2. Somebody's milestone ──────────────────────────────────
    const { data: events } = await supabaseAdmin
      .from("milestone_events")
      .select("id, user_id, name, team, title, kicker, milestone_key, achieved_at")
      .eq("season", SEASON.number)
      .order("achieved_at", { ascending: false })
      .limit(50);

    const unseen = (events ?? []).filter(
      (e: any) => !seen.has(`milestone:${e.id}`)
    );

    if (unseen.length === 0) {
      return NextResponse.json({ popup: null, queued: 0 });
    }

    // Oldest first, so recognition arrives in the order it was earned.
    // Nothing is auto-filed any more: an earlier version showed the
    // newest and silently marked the rest as seen, which meant three
    // people out of four were never recognised at all.
    const ordered = [...unseen].reverse();

    // A ceiling, so someone returning after a week isn't buried.
    const MAX_PER_SESSION = 4;
    const batch = ordered.slice(0, MAX_PER_SESSION);

    const shape = (e: any) => {
      const mine = e.user_id === user_id;
      // milestone_key is "walk-25", "streak-10" and so on. The client
      // uses the discipline to pick the badge icon and colour.
      const [metric, threshold] = String(e.milestone_key ?? "").split("-");

      return {
        kind: "milestone" as const,
        key: String(e.id),
        metric: metric || "points",
        threshold: Number(threshold) || 0,
        kicker: mine ? e.kicker : "Give them a cheer",
        title: e.title,
        body: mine
          ? "You've reached it. Nicely done."
          : `${e.name} just got there${e.team ? ` for ${e.team}` : ""}.`,
        who: mine ? null : e.name,
        mine,
      };
    };

    return NextResponse.json({
      popup: shape(batch[0]),
      // The rest are sent with it, so dismissing one shows the next
      // without another round trip.
      queue: batch.slice(1).map(shape),
      remaining: Math.max(0, ordered.length - batch.length),
    });

  } catch (err: any) {
    console.error("Popups error:", err);
    // A popup is never important enough to break the app over
    return NextResponse.json({ popup: null });
  }
}

/** POST — mark a popup as seen. Body: { kind, key } */
export async function POST(req: Request) {
  try {
    const user_id = await currentUser();
    if (!user_id) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { kind, key } = await req.json();
    if (!kind || !key) {
      return NextResponse.json({ error: "Missing kind or key" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("popup_seen").upsert(
      {
        user_id,
        season: SEASON.number,
        kind: String(kind),
        key: String(key),
        seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,season,kind,key" }
    );

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Popup dismiss error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
