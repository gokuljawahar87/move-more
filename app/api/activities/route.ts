import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Challenge start (1 Oct 2025, 00:00 IST)
const challengeStart = new Date("2025-10-01T00:00:00+05:30");
// Office hour exclusion start date (16 Oct 2025, 00:00 IST)
const exclusionStart = new Date("2025-10-16T00:00:00+05:30");

// 🕒 Work hours in IST
const WORK_START = { hour: 7, minute: 30 };
const WORK_END = { hour: 15, minute: 45 };

// 🏖️ Holidays (YYYY-MM-DD)
const HOLIDAYS = ["2025-10-20", "2025-10-21"];

// 🧩 Helper: Check overlap between activity and office hours (excludes weekends & holidays)
function overlapsWorkingHours(startUTC: Date, durationSec: number): boolean {
  const istStart = new Date(startUTC.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const istEnd = new Date(istStart.getTime() + durationSec * 1000);

  // Skip exclusion if before Oct 16
  if (istStart < exclusionStart) return false;

  // Weekend check (0 = Sunday, 6 = Saturday)
  const day = istStart.getDay();
  if (day === 0 || day === 6) return false;

  // Holiday check
  const isoDate = istStart.toISOString().split("T")[0];
  if (HOLIDAYS.includes(isoDate)) return false;

  // Define work window for that day
  const workStart = new Date(istStart);
  workStart.setHours(WORK_START.hour, WORK_START.minute, 0, 0);

  const workEnd = new Date(istStart);
  workEnd.setHours(WORK_END.hour, WORK_END.minute, 0, 0);

  // 🚫 Exclude if overlaps the work window at all
  const overlaps = istStart <= workEnd && istEnd >= workStart;
  return overlaps;
}

export async function GET() {
  try {
    const now = new Date();

    // 🧩 Fetch activities joined with profiles
    let query = supabaseAdmin
      .from("activities")
      .select(
        `
        id,
        name,
        type,
        derived_type,
        distance,
        moving_time,
        start_date,
        strava_url,
        user_id,
        is_valid,
        profiles (
          first_name,
          last_name,
          team
        )
      `
      )
      .eq("is_valid", true)
      .order("start_date", { ascending: false });

    // ✅ Only include activities after challenge start
    if (now >= challengeStart) {
      query = query.gte("start_date", challengeStart.toISOString());
    }

    const { data, error } = await query;
    if (error) {
      console.error("❌ Error fetching activities:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data?.length) return NextResponse.json([]);

    // 🧮 Apply exclusion logic (work hours, weekends, holidays)
    const filtered = data.filter((act) => {
      if (!act.start_date) return false;
      const startUTC = new Date(act.start_date);
      return !overlapsWorkingHours(startUTC, act.moving_time || 0);
    });

    // 🧠 Use derived_type if present
    const formatted = filtered.map((act) => ({
      id: act.id,
      name: act.name,
      type: act.derived_type || act.type,
      derived_type: act.derived_type,
      distance: act.distance,
      moving_time: act.moving_time,
      start_date: act.start_date,
      strava_url: act.strava_url,
      user_id: act.user_id,
      profiles: act.profiles,
    }));

    console.log(`✅ Activities fetched: ${formatted.length} (filtered from ${data.length})`);

    return NextResponse.json(formatted);
  } catch (err: any) {
    console.error("❌ Unexpected error in /api/activities:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch activities" },
      { status: 500 }
    );
  }
}