import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const challengeStart = new Date("2025-10-01T00:00:00+05:30");

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  if (!user_id)
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("activities")
    .select("type, distance, start_date")
    .eq("user_id", user_id)
    .eq("is_valid", true)
    .gte("start_date", challengeStart.toISOString());

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data?.length) {
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
    });
  }

  const totalActivities = data.length;
  const totalKm = data.reduce((sum, a) => sum + (a.distance || 0), 0) / 1000;

  const walks = data.filter((a) => a.type === "Walk");
  const runs = data.filter((a) => a.type === "Run");
  const rides = data.filter((a) => a.type === "Ride");

  const walkKm = walks.reduce((s, a) => s + (a.distance || 0), 0) / 1000;
  const runKm = runs.reduce((s, a) => s + (a.distance || 0), 0) / 1000;
  const cycleKm = rides.reduce((s, a) => s + (a.distance || 0), 0) / 1000;

  const longestWalk = walks.length
    ? Math.max(...walks.map((a) => a.distance || 0)) / 1000
    : null;
  const longestRun = runs.length
    ? Math.max(...runs.map((a) => a.distance || 0)) / 1000
    : null;
  const longestCycle = rides.length
    ? Math.max(...rides.map((a) => a.distance || 0)) / 1000
    : null;

  const activeDays = new Set(data.map((a) => a.start_date.split("T")[0])).size;

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
  });
}
