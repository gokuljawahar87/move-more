// app/api/challenges/route.ts
//
// Returns everything the Challenge page needs in one call:
//   - the selected day's challenges, with completion for this user
//   - the weekly leaderboard (resets every week)
//   - the 8 champion boxes
//
// Challenge points are deliberately separate from the season
// leaderboard and never feed into it.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SEASON, activeSeason } from "@/lib/season";
import { istDayKey } from "@/lib/streak";
import { isPacesetter } from "@/lib/divisions";
import {
  challengesForDate,
  evaluateRange,
  seasonWeek,
  TOTAL_WEEKS,
  weekDays,
  CLEAN_SWEEP_POINTS,
} from "@/lib/challenges";

export const dynamic = "force-dynamic";

/**
 * The 7 IST day keys of a season week, Monday to Sunday.
 * Uses the shared helpers so the API and lib/challenges.ts can't disagree
 * about which days belong to which week.
 */


/**
 * Settle any finished week that hasn't been recorded yet.
 *
 * Runs on read and is idempotent — the unique constraint on
 * (season, week, gender, user_id) means a repeat insert updates rather
 * than duplicates, and the existence check below means it normally
 * does nothing at all.
 *
 * There's a deliberate delay: a week isn't settled until 8am Monday
 * IST. Sunday evening's activities often don't reach us until the
 * 7:30am sync, and crowning someone at one minute past midnight would
 * sometimes crown the wrong person.
 *
 * That leaves only half an hour of margin after the morning sync. If
 * the cron is ever late or fails, a week could settle on incomplete
 * data — so if the sync becomes unreliable, widen this again.
 */
const SETTLE_DELAY_HOURS = 8;

async function settleFinishedWeeks(currentWeek: number) {
  if (currentWeek <= 1) return;

  const { data: already } = await supabaseAdmin
    .from("weekly_champions")
    .select("week")
    .eq("season", SEASON.number);

  const settled = new Set((already ?? []).map((r: any) => r.week));

  for (let w = 1; w < currentWeek; w++) {
    if (settled.has(w)) continue;

    const days = weekDays(w);
    if (!days.length) continue;

    // Has the grace period passed?
    const endedAt = new Date(
      `${days[days.length - 1]}T23:59:59+05:30`
    ).getTime();
    if (Date.now() < endedAt + SETTLE_DELAY_HOURS * 60 * 60 * 1000) continue;

    const from = new Date(`${days[0]}T00:00:00+05:30`);
    from.setDate(from.getDate() - 7); // history for Better Than Before
    const to = new Date(`${days[days.length - 1]}T23:59:59+05:30`);

    const { data: rows } = await supabaseAdmin
      .from("profiles")
      .select(
        `
        user_id, first_name, last_name, team,
        activities (
          type, derived_type, distance, moving_time,
          start_date, is_valid, on_leave_day
        )
      `
      )
      .eq("season", SEASON.number)
      .gte("activities.start_date", from.toISOString())
      .lte("activities.start_date", to.toISOString());

    if (!rows?.length) continue;

    const { data: genderRows } = await supabaseAdmin
      .from("employee_master")
      .select("user_id, gender");

    const genderOf = new Map<string, "F" | "M">();
    for (const g of genderRows ?? []) {
      const v = String(g.gender ?? "").trim().toUpperCase();
      genderOf.set(g.user_id, v.startsWith("F") ? "F" : "M");
    }

    const entries = (rows as any[])
      .filter((p) => !isPacesetter(p.user_id)) // champions come from the Open board
      .map((p) => ({
        user_id: p.user_id,
        name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
        team: p.team ?? null,
        gender: genderOf.get(p.user_id) ?? "M",
        points: evaluateRange(days, p.activities ?? []).total,
      }))
      .filter((p) => p.points > 0);

    const winners: any[] = [];

    for (const g of ["F", "M"] as const) {
      const pool = entries
        .filter((p) => p.gender === g)
        .sort((a, b) => b.points - a.points);

      if (!pool.length) continue;

      // Everyone level at the top shares the week
      const top = pool[0].points;
      for (const p of pool.filter((x) => x.points === top)) {
        winners.push({
          season: SEASON.number,
          week: w,
          gender: g,
          user_id: p.user_id,
          name: p.name,
          team: p.team,
          points: p.points,
          settled_at: new Date().toISOString(),
        });
      }
    }

    if (winners.length) {
      await supabaseAdmin
        .from("weekly_champions")
        .upsert(winners, { onConflict: "season,week,gender,user_id" });
      console.log(`🏆 Week ${w} settled — ${winners.length} champion(s)`);
    }
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const store = await cookies();
    const meId = store.get("user_id")?.value ?? null;

    const now = new Date();
    const todayKey = istDayKey(now);
    const currentWeek = Math.max(1, Math.min(TOTAL_WEEKS, seasonWeek(now) || 1));

    const week = Math.max(
      1,
      Math.min(TOTAL_WEEKS, parseInt(searchParams.get("week") || "", 10) || currentWeek)
    );
    // Record any finished week that hasn't been settled yet
    await settleFinishedWeeks(currentWeek);

    const days = weekDays(week);

    // A week can be short: the season opens on a Tuesday, so week 1 is
    // six days. Indexing days[6] there gives undefined, and building a
    // Date from it throws "Invalid time value" — which is what took the
    // whole Challenge page down.
    if (!days.length) {
      return NextResponse.json({
        week,
        currentWeek,
        totalWeeks: TOTAL_WEEKS,
        days: [],
        today: todayKey,
        selectedDay: null,
        notStarted: true,
        seasonStart: istDayKey(SEASON.start),
        schedule: [],
        leaderboard: [],
        pacesetters: [],
        leaderboardMen: [],
        leaderboardWomen: [],
        me: null,
        champions: [],
        cleanSweepPoints: CLEAN_SWEEP_POINTS,
      });
    }

    const requestedDay = searchParams.get("day");
    const day =
      requestedDay && days.includes(requestedDay)
        ? requestedDay
        : days.includes(todayKey)
        ? todayKey
        : days[0];

    // ── Everyone's activities for this week ──────────────────────
    const firstDay = days[0];
    const lastDay = days[days.length - 1];
    // Reach back a further 7 days. "Better Than Before" compares this
    // week's distance against last week's, so without the previous
    // week loaded it sees no history — and used to read that as
    // "nothing to beat" and award the points to everyone.
    const rangeStart = new Date(
      new Date(`${firstDay}T00:00:00+05:30`).getTime() - 7 * 24 * 60 * 60 * 1000
    );
    const rangeEnd = new Date(`${lastDay}T23:59:59+05:30`);

    const { data: rows, error } = await supabaseAdmin
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
      .gte("activities.start_date", rangeStart.toISOString())
      .lte("activities.start_date", rangeEnd.toISOString());

    if (error) throw error;

    // ── Gender, for the split boards ─────────────────────────────
    // Held in employee_master, same as the women's podium on the main
    // leaderboard uses.
    const { data: genderRows } = await supabaseAdmin
      .from("employee_master")
      .select("user_id, gender");

    const genderOf = new Map<string, "F" | "M">();
    for (const g of genderRows ?? []) {
      const v = String(g.gender ?? "").trim().toUpperCase();
      // Anything not clearly female goes to the open board, so nobody
      // disappears if a row is blank or spelled unexpectedly.
      genderOf.set(g.user_id, v.startsWith("F") ? "F" : "M");
    }

    // ── Weekly leaderboards ──────────────────────────────────────
    // Split into two, so the women's competition isn't decided by who
    // happens to run fastest overall.
    type BoardEntry = {
      user_id: string;
      name: string;
      team: string | null;
      gender: "F" | "M";
      points: number;
      /** When this week's total was reached, for breaking ties */
      reachedAt: number;
    };

    /**
     * The moment a person's weekly total was actually reached.
     *
     * A challenge is judged against a whole day's activity, so there's
     * no timestamp stored anywhere that says when it completed. This
     * finds it: the day's activities are replayed one at a time, and the
     * first time a challenge flips to complete, the end of the activity
     * that did it is taken as the moment.
     *
     * The value returned is the LATEST such moment in the week — the
     * point at which their total stopped rising.
     */
    function reachedAtFor(activities: any[]): number {
      if (!activities.length) return Number.MAX_SAFE_INTEGER;

      const endOf = (a: any) =>
        new Date(a.start_date).getTime() +
        (Number(a.moving_time) || 0) * 1000;

      let latest = 0;

      for (const day of days) {
        const dayActs = activities
          .filter((a: any) => istDayKey(new Date(a.start_date)) === day)
          .sort(
            (a: any, b: any) =>
              new Date(a.start_date).getTime() -
              new Date(b.start_date).getTime()
          );

        if (!dayActs.length) continue;

        // Everything from other days, so beat-avg still sees its history
        const otherDays = activities.filter(
          (a: any) => istDayKey(new Date(a.start_date)) !== day
        );

        const alreadyDone = new Set<string>();

        for (let i = 1; i <= dayActs.length; i++) {
          const upTo = [...otherDays, ...dayActs.slice(0, i)];
          const { results, cleanSweep } = evaluateRange([day], upTo).days[0];

          for (const r of results) {
            if (r.completed && !alreadyDone.has(r.id)) {
              alreadyDone.add(r.id);
              latest = Math.max(latest, endOf(dayActs[i - 1]));
            }
          }

          // The sweep bonus lands with the last challenge of the day
          if (cleanSweep && !alreadyDone.has("__sweep")) {
            alreadyDone.add("__sweep");
            latest = Math.max(latest, endOf(dayActs[i - 1]));
          }
        }
      }

      return latest > 0 ? latest : Number.MAX_SAFE_INTEGER;
    }

    const allEntries: BoardEntry[] = (rows ?? [])
      .map((p: any): BoardEntry => ({
        user_id: p.user_id,
        name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
        team: p.team ?? null,
        gender: genderOf.get(p.user_id) ?? "M",
        points: evaluateRange(days, p.activities ?? []).total,
        reachedAt: reachedAtFor(p.activities ?? []),
      }))
      .filter((p: BoardEntry) => p.points > 0)
      // Level on points goes to whoever reached the total first.
      .sort(
        (a: BoardEntry, b: BoardEntry) =>
          b.points - a.points || a.reachedAt - b.reachedAt
      );

    // Regular runners play as normal but are ranked separately, and are
    // not eligible for the weekly champion slots.
    const pacesetters = allEntries.filter((p: BoardEntry) =>
      isPacesetter(p.user_id)
    );
    const openBoard = allEntries.filter(
      (p: BoardEntry) => !isPacesetter(p.user_id)
    );

    const boardMen = openBoard.filter((p: BoardEntry) => p.gender === "M");
    const boardWomen = openBoard.filter((p: BoardEntry) => p.gender === "F");

    // Kept for the champion boxes, which crown one winner per week
    const board = openBoard;

    const myRow = meId ? (rows ?? []).find((p: any) => p.user_id === meId) : null;
    const myActs = myRow?.activities ?? [];

    // ── The selected day for this user ───────────────────────────
    // Better Than Before compares against the previous 7 days, so the
    // day evaluation needs that history, not just today's activities.
    const dayEval = evaluateRange([day], myActs).days[0];

    // Weekly progress: goals completed out of goals available so far
    let goalsDone = 0;
    let goalsTotal = 0;
    for (const d of days) {
      const list = challengesForDate(d);
      goalsTotal += list.length;
      if (d <= todayKey) {
        goalsDone += evaluateRange([d], myActs).days[0].results.filter((r) => r.completed).length;
      }
    }

    // ── Champion boxes ───────────────────────────────────────────
    // Two per week now: one woman, one man. Finished weeks come from
    // stored results so a late sync can't rewrite history; the current
    // week shows a provisional leader from each board.
    const { data: champs } = await supabaseAdmin
      .from("weekly_champions")
      .select("week, gender, user_id, name, team, points")
      .eq("season", SEASON.number);

    type ChampRow = {
      week: number;
      gender: string;
      name: string | null;
      team: string | null;
      points: number | null;
    };

    // A week can have several joint champions, so group rather than map
    // one row per slot — the previous version kept only the last row
    // read and silently dropped anyone tied with them.
    const champsBySlot = new Map<string, ChampRow[]>();
    for (const c of (champs ?? []) as ChampRow[]) {
      const k = `${c.week}:${c.gender}`;
      champsBySlot.set(k, [...(champsBySlot.get(k) ?? []), c]);
    }

    const slotFor = (w: number, g: "F" | "M") => {
      const stored = champsBySlot.get(`${w}:${g}`);

      if (stored?.length) {
        return {
          status: "settled",
          names: stored.map((c) => c.name ?? "Champion"),
          team: stored[0].team ?? null,
          points: stored[0].points ?? 0,
        };
      }

      if (w === currentWeek) {
        const pool = g === "F" ? boardWomen : boardMen;
        const top = pool[0]?.points ?? 0;
        // Everyone level at the top, not just whoever sorts first
        const tied = pool.filter((p: BoardEntry) => p.points === top);

        return {
          status: "live",
          names: tied.map((p: BoardEntry) => p.name),
          team: tied.length === 1 ? tied[0].team : null,
          points: top,
        };
      }

      if (w < currentWeek) {
        return { status: "unrecorded", names: [], team: null, points: 0 };
      }
      return { status: "upcoming", names: [], team: null, points: 0 };
    };

    const boxes = Array.from({ length: TOTAL_WEEKS }, (_, i) => ({
      week: i + 1,
      women: slotFor(i + 1, "F"),
      men: slotFor(i + 1, "M"),
    }));


    return NextResponse.json({
      week,
      currentWeek,
      totalWeeks: TOTAL_WEEKS,
      days,
      today: todayKey,
      selectedDay: day,
      challenges: dayEval.results.map((r) => ({
        id: r.id,
        title: r.title,
        blurb: r.blurb,
        difficulty: r.difficulty,
        points: r.points,
        icon: r.icon,
        completed: r.completed,
      })),
      cleanSweep: dayEval.cleanSweep,
      cleanSweepPoints: CLEAN_SWEEP_POINTS,
      earnedToday: dayEval.earned,
      goalsDone,
      goalsTotal,
      leaderboard: board.slice(0, 25),
      pacesetters: pacesetters.slice(0, 25),
      isPacesetter: meId ? isPacesetter(meId) : false,
      leaderboardMen: boardMen.slice(0, 25),
      leaderboardWomen: boardWomen.slice(0, 25),
      myGender: meId ? genderOf.get(meId) ?? "M" : null,
      // The visible weekly board is combined, so rank is against everyone
      // Ranked within your own column
      myRank: meId
        ? (isPacesetter(meId) ? pacesetters : board).findIndex(
            (b: BoardEntry) => b.user_id === meId
          ) + 1 || null
        : null,
      // Look this up across EVERYONE, not just the Open column — a
      // Pacesetter isn't in `board`, so their own total came back as 0.
      myPoints: meId
        ? allEntries.find((b: BoardEntry) => b.user_id === meId)?.points ?? 0
        : 0,
      champions: boxes,
    });
  } catch (err: any) {
    console.error("Challenges API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
