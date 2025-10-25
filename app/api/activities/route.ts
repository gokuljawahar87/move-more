import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Challenge start (1 Oct 2025 00:00 IST)
const CHALLENGE_START = new Date("2025-10-01T00:00:00+05:30");
// Work-hour exclusion active from 16 Oct 2025 00:00 IST
const EXCLUDE_START = new Date("2025-10-16T00:00:00+05:30");

// Work-hours (IST)
const WORK_START = { hour: 7, minute: 30 };
const WORK_END = { hour: 15, minute: 45 };

// Holidays (YYYY-MM-DD)
const HOLIDAYS = ["2025-10-20", "2025-10-21"];

// 🧩 Helper: check overlap between activity and office hours (excludes weekends & holidays)
function overlapsWorkingHours(startUTC: Date, durationSec: number): boolean {
  const istStart = new Date(startUTC.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const istEnd = new Date(istStart.getTime() + durationSec * 1000);

  if (istStart < EXCLUDE_START) return false; // before exclusion window
  const day = istStart.getDay();
  if (day === 0 || day === 6) return false;   // weekend
  const isoDate = istStart.toISOString().split("T")[0];
  if (HOLIDAYS.includes(isoDate)) return false; // holiday

  const workStart = new Date(istStart);
  workStart.setHours(WORK_START.hour, WORK_START.minute, 0, 0);
  const workEnd = new Date(istStart);
  workEnd.setHours(WORK_END.hour, WORK_END.minute, 0, 0);

  return istStart <= workEnd && istEnd >= workStart; // any overlap
}

export async function GET() {
  try {
    const now = new Date();

    // 🧩 Fetch profiles with nested valid activities
    let query = supabaseAdmin
  .from("profiles")
  .select(`
    user_id,
    first_name,
    last_name,
    team,
    activities (
      id,
      user_id,
      name,
      type,
      derived_type,
      distance,
      moving_time,
      start_date,
      strava_url,
      is_valid
    )
  `)
  .eq("activities.is_valid", true);

    // ✅ Only include activities after challenge start
    if (now >= CHALLENGE_START) {
      query = query.gte("activities.start_date", CHALLENGE_START.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Error fetching activities:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json([]); // Always return an array for frontend safety
    }

    // 🧩 Flatten nested activities + attach profile info
    const flat = data.flatMap((p: any) =>
      (p.activities || []).map((a: any) => ({
        ...a,
        profiles: {
          first_name: p.first_name,
          last_name: p.last_name,
          team: p.team,
        },
      }))
    );

    // ✅ Sort locally (since Supabase can’t sort nested data)
    flat.sort(
      (a, b) =>
        new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );

    // 🧮 Apply exclusion logic (work hours, weekends, holidays)
    const filtered = flat.filter((act) => {
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

    console.log(
      `✅ Activities fetched: ${formatted.length} (flattened ${flat.length}, raw ${data.length})`
    );

    // ✅ Always return an array — never an object
    return NextResponse.json(formatted ?? []);
  } catch (err: any) {
    console.error("❌ Unexpected error in /api/activities:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch activities" },
      { status: 500 }
    );
  }
}
