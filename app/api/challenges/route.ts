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
    const rangeStart = new Date(`${firstDay}T00:00:00+05:30`);
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
    };

    const allEntries: BoardEntry[] = (rows ?? [])
      .map((p: any): BoardEntry => ({
        user_id: p.user_id,
        name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
        team: p.team ?? null,
        gender: genderOf.get(p.user_id) ?? "M",
        points: evaluateRange(days, p.activities ?? []).total,
      }))
      .filter((p: BoardEntry) => p.points > 0)
      .sort((a: BoardEntry, b: BoardEntry) => b.points - a.points);

    const boardMen = allEntries.filter((p: BoardEntry) => p.gender === "M");
    const boardWomen = allEntries.filter((p: BoardEntry) => p.gender === "F");

    // Kept for the champion boxes, which crown one winner per week
    const board = allEntries;

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

    const champMap = new Map<string, ChampRow>(
      (champs ?? []).map((c: any) => [
        `${c.week}:${c.gender}`,
        c as ChampRow,
      ])
    );

    const slotFor = (w: number, g: "F" | "M") => {
      const stored = champMap.get(`${w}:${g}`);
      if (stored) {
        return {
          status: "settled",
          name: stored.name ?? null,
          team: stored.team ?? null,
          points: stored.points ?? 0,
        };
      }
      if (w === currentWeek) {
        const leader = (g === "F" ? boardWomen : boardMen)[0];
        return {
          status: "live",
          name: leader?.name ?? null,
          team: leader?.team ?? null,
          points: leader?.points ?? 0,
        };
      }
      if (w < currentWeek) {
        return { status: "unrecorded", name: null, team: null, points: 0 };
      }
      return { status: "upcoming", name: null, team: null, points: 0 };
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
      leaderboardMen: boardMen.slice(0, 25),
      leaderboardWomen: boardWomen.slice(0, 25),
      myGender: meId ? genderOf.get(meId) ?? "M" : null,
      // The visible weekly board is combined, so rank is against everyone
      myRank: meId
        ? board.findIndex((b: BoardEntry) => b.user_id === meId) + 1 || null
        : null,
      myPoints: meId
        ? board.find((b: BoardEntry) => b.user_id === meId)?.points ?? 0
        : 0,
      champions: boxes,
    });
  } catch (err: any) {
    console.error("Challenges API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
