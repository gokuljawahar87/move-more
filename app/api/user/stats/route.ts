// app/api/user/stats/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SEASON, activeSeason, SYNC_FLOOR, displayWindowStart } from "@/lib/season";
import { computeStreaks, istDayKey } from "@/lib/streak";
import { DailyPoints, disciplineOf, DAILY_POINT_CAP } from "@/lib/points";
import { mondayOf, addDays } from "@/lib/challenges";

// -------------------------------
// 🔹 Same constants & logic as Team Performance
// -------------------------------
// Exclusion applies from the start of the sync window, not a fixed
// October 2025 date.
const EXCLUDE_START = SYNC_FLOOR;
const WORK_START = { hour: 7, minute: 30 };
const WORK_END = { hour: 15, minute: 45 };
// Holidays now come from lib/season.ts
const HOLIDAYS: string[] = (SEASON as any).holidays ?? [];

// 🕒 Check if overlaps office hours (7:30–15:45 IST)
function overlapsWorkingHours(startUTC: Date, durationSec: number): boolean {
  const istStart = new Date(startUTC.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const istEnd = new Date(istStart.getTime() + durationSec * 1000);

  // Before 16 Oct → no exclusion
  if (istStart < EXCLUDE_START) return false;

  // Skip weekends
  const day = istStart.getDay();
  if (day === 0 || day === 6) return false;

  // Skip holidays
  const isoDate = istStart.toISOString().split("T")[0];
  if (HOLIDAYS.includes(isoDate)) return false;

  const workStart = new Date(istStart);
  workStart.setHours(WORK_START.hour, WORK_START.minute, 0, 0);
  const workEnd = new Date(istStart);
  workEnd.setHours(WORK_END.hour, WORK_END.minute, 0, 0);

  // Exclude if overlap
  return istStart <= workEnd && istEnd >= workStart;
}

// -------------------------------
// 🔹 Main API
// -------------------------------
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");
    if (!user_id) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    // 1️⃣ Fetch all profiles + valid activities
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select(`
        user_id,
        first_name,
        last_name,
        team,
        activities (
          id,
          name,
          type,
          derived_type,
          distance,
          moving_time,
          start_date,
          is_valid,
          on_leave_day
        )
      `)
      .eq("activities.is_valid", true)
      // Only the season currently on display: trial data before Sep 1,
      // Season 2 after. Season 1 is never shown.
      .eq("activities.season", activeSeason())
      // Date floor as well as the season tag: the season column has a
      // DEFAULT of 2, so a row written without it set explicitly would
      // otherwise surface regardless of when it happened.
      .gte("activities.start_date", displayWindowStart().toISOString())
      // Only members registered for this season — without this the
      // participant count still included last season's 95 people.
      .eq("season", SEASON.number);
      // NOTE: the old `.gte("activities.start_date", CHALLENGE_START)`
      // filter is gone. CHALLENGE_START now resolves to the season start
      // (1 Sep), which is in the future during the trial — so it was
      // excluding every activity and zeroing everyone's stats. The
      // season column already scopes the data correctly.

    if (error) {
      console.error("❌ Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!profiles?.length) {
      return NextResponse.json({
        totalActivities: 0,
        totalKm: 0,
        walkKm: 0,
        runKm: 0,
        cycleKm: 0,
        activeDays: 0,
        longestWalk: null,
        longestRun: null,
        longestCycle: null,
        totalPoints: 0,
        teamRank: null,
        overallRank: null,
        totalParticipants: 0,
        thisWeekKm: 0,
        lastWeekKm: 0,
        cappedAway: 0,
        daysAtCap: 0,
        dailyCap: DAILY_POINT_CAP,
        currentStreak: 0,
        maxStreak: 0,
        todayDone: false,
      });
    }

    // 2️⃣ Compute points for everyone (same as Team Performance)
    const allUsers: {
      user_id: string;
      name: string;
      team: string | null;
      run: number;
      walk: number;
      cycle: number;
      points: number;
    }[] = [];

    let myCapInfo = { cappedAway: 0, daysAtCap: 0, dailyCap: DAILY_POINT_CAP };

    for (const profile of profiles) {
      if (!Array.isArray(profile.activities)) continue;

      // Points capped at 175 per person per day; distance uncapped.
      const acc = new DailyPoints();

      for (const a of profile.activities) {
        if (!a?.is_valid || !a.start_date) continue;
        const startUTC = new Date(a.start_date);
        // A declared leave day lifts the office-hours exclusion.
        if (!a.on_leave_day && overlapsWorkingHours(startUTC, a.moving_time || 0)) continue;

        acc.add(
          a.start_date,
          disciplineOf(a.derived_type || a.type),
          Number(a.distance || 0) / 1000
        );
      }

      const { run, walk, cycle } = acc.km;
      const points = acc.points;

      // For the signed-in user, keep what the cap trimmed so the app
      // can show it rather than silently losing their points.
      if (profile.user_id === user_id) {
        myCapInfo = {
          cappedAway: acc.cappedAway,
          daysAtCap: acc.daysAtCap,
          dailyCap: DAILY_POINT_CAP,
        };
      }

      allUsers.push({
        user_id: profile.user_id,
        name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
        team: profile.team,
        run,
        walk,
        cycle,
        points,
      });
    }

    // 3️⃣ Sort overall for global rank
    const sortedAll = allUsers.slice().sort((a, b) => b.points - a.points);
    const totalParticipants = sortedAll.length;
    const overallRank = sortedAll.findIndex((u) => u.user_id === user_id) + 1;

    // 4️⃣ Team rank
    const userTeam = allUsers.find((u) => u.user_id === user_id)?.team;
    let teamRank: number | null = null;
    if (userTeam) {
      const teamMembers = allUsers.filter((u) => u.team === userTeam);
      teamMembers.sort((a, b) => b.points - a.points);
      teamRank = teamMembers.findIndex((u) => u.user_id === user_id) + 1;
    }

    // 5️⃣ Find user totals
    const me = allUsers.find((u) => u.user_id === user_id);
    const totalPoints = me?.points ?? 0;
    const totalKm = (me?.run ?? 0) + (me?.walk ?? 0) + (me?.cycle ?? 0);
    const runKm = me?.run ?? 0;
    const walkKm = me?.walk ?? 0;
    const cycleKm = me?.cycle ?? 0;

    // 6️⃣ Individual details for sidebar (only user’s valid + included activities)
    const myProfile = profiles.find((p) => p.user_id === user_id);
    const myActs =
      myProfile?.activities?.filter(
        (a) =>
          a?.is_valid &&
          (a.on_leave_day ||
            !overlapsWorkingHours(new Date(a.start_date), a.moving_time || 0))
      ) || [];

    const totalActivities = myActs.length;
    const activeDays = new Set(
      myActs.map((a) => new Date(a.start_date).toISOString().split("T")[0])
    ).size;

    const longestWalk =
      myActs.filter((a) => a.derived_type === "Reclassified-Walk" || a.type === "Walk").length > 0
        ? Math.max(
            ...myActs
              .filter((a) => a.derived_type === "Reclassified-Walk" || a.type === "Walk")
              .map((a) => a.distance || 0)
          ) / 1000
        : null;
    const longestRun =
      myActs.filter((a) => a.type === "Run" || a.type === "TrailRun").length > 0
        ? Math.max(
            ...myActs
              .filter((a) => a.type === "Run" || a.type === "TrailRun")
              .map((a) => a.distance || 0)
          ) / 1000
        : null;
    const longestCycle =
      myActs.filter((a) => a.type === "Ride" || a.type === "VirtualRide").length > 0
        ? Math.max(
            ...myActs
              .filter((a) => a.type === "Ride" || a.type === "VirtualRide")
              .map((a) => a.distance || 0)
          ) / 1000
        : null;

    // ── Weekly distance totals ───────────────────────────────────
    // Simple totals, not averages: "last week I did 100 km, so this
    // week I need 101". One number to beat, fixed all week.
    const kmByDay = new Map<string, number>();
    for (const a of myActs) {
      if (a?.is_valid === false || !a?.start_date) continue;
      const key = istDayKey(new Date(a.start_date));
      kmByDay.set(key, (kmByDay.get(key) ?? 0) + (Number(a.distance) || 0) / 1000);
    }

    const totalBetween = (from: string, toInclusive: string) =>
      [...kmByDay.entries()]
        .filter(([d]) => d >= from && d <= toInclusive)
        .reduce((sum, [, v]) => sum + v, 0);

    const todayKey = istDayKey(new Date());
    const thisMonday = mondayOf(todayKey);
    const lastMonday = addDays(thisMonday, -7);

    const thisWeekKm = totalBetween(thisMonday, todayKey);
    const lastWeekKm = totalBetween(lastMonday, addDays(thisMonday, -1));

    // 🔥 Streaks — a streak day needs ONE activity of 30+ minutes moving
    // time, outside office hours. See lib/streak.ts for the rules.
    const streaks = computeStreaks(myActs);

    // ✅ Return aligned with Team Performance
    return NextResponse.json({
      totalActivities,
      totalKm,
      walkKm,
      runKm,
      cycleKm,
      activeDays,
      longestWalk,
      longestRun,
      longestCycle,
      totalPoints,
      teamRank,
      overallRank,
      totalParticipants,
      thisWeekKm,
      lastWeekKm,
      ...myCapInfo,
      currentStreak: streaks.currentStreak,
      maxStreak: streaks.maxStreak,
      todayDone: streaks.todayDone,
    });
  } catch (err: any) {
    console.error("❌ Error in /api/user/stats:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
