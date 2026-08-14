// app/api/leave/route.ts
//
// Personal leave days. Declaring one lifts the office-hours exclusion
// for that date, and the activity feed shows an "On leave" tag so the
// declaration is visible to everyone.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SEASON, activeSeason } from "@/lib/season";
import { istDayKey } from "@/lib/streak";

export const dynamic = "force-dynamic";

// Same-day declarations only cover activities that START after the
// declaration was made — otherwise someone could run at 10am and mark
// leave at 4pm. Set to false to allow same-day blanket coverage.
const REQUIRE_DECLARE_BEFORE_ACTIVITY = true;

async function currentUser(): Promise<string | null> {
  const store = await cookies();
  return store.get("user_id")?.value ?? null;
}

/** Recompute on_leave_day for one user's activities on one IST date. */
async function syncFlagsForDate(
  user_id: string,
  leave_date: string,
  declaredAt: Date | null
) {
  // An IST day runs 18:30 UTC the previous day → 18:30 UTC that day
  const dayStartUTC = new Date(`${leave_date}T00:00:00+05:30`);
  const dayEndUTC = new Date(dayStartUTC.getTime() + 24 * 60 * 60 * 1000);

  const { data: acts } = await supabaseAdmin
    .from("activities")
    .select("id, start_date")
    .eq("user_id", user_id)
    .gte("start_date", dayStartUTC.toISOString())
    .lt("start_date", dayEndUTC.toISOString());

  if (!acts?.length) return 0;

  const covered = acts.filter((a) => {
    if (!declaredAt) return false; // withdrawing
    if (!REQUIRE_DECLARE_BEFORE_ACTIVITY) return true;
    return new Date(a.start_date) >= declaredAt;
  });

  const coveredIds = new Set(covered.map((a) => a.id));

  // Set the flag on covered activities, clear it on the rest
  const toSet = acts.filter((a) => coveredIds.has(a.id)).map((a) => a.id);
  const toClear = acts.filter((a) => !coveredIds.has(a.id)).map((a) => a.id);

  if (toSet.length) {
    await supabaseAdmin
      .from("activities")
      .update({ on_leave_day: true })
      .in("id", toSet);
  }
  if (toClear.length) {
    await supabaseAdmin
      .from("activities")
      .update({ on_leave_day: false })
      .in("id", toClear);
  }

  return toSet.length;
}

/** GET — this user's declared leave days for the current season */
export async function GET() {
  try {
    const user_id = await currentUser();
    if (!user_id) return NextResponse.json({ days: [] });

    const { data, error } = await supabaseAdmin
      .from("leave_days")
      .select("leave_date, created_at")
      .eq("user_id", user_id)
      .eq("season", activeSeason())
      .order("leave_date", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      days: (data ?? []).map((d) => d.leave_date),
      today: istDayKey(new Date()),
    });
  } catch (err: any) {
    console.error("Leave GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** POST — declare a leave day. Body: { leave_date: "YYYY-MM-DD" } */
export async function POST(req: Request) {
  try {
    const user_id = await currentUser();
    if (!user_id) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { leave_date } = await req.json();
    if (!leave_date || !/^\d{4}-\d{2}-\d{2}$/.test(leave_date)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    // ── Today or future only ─────────────────────────────────────
    // Declaring a past date would let anyone retro-legitimise an
    // activity they have already done.
    const today = istDayKey(new Date());
    if (leave_date < today) {
      return NextResponse.json(
        {
          error:
            "Leave can only be marked for today or a future date. Mark it before you head out.",
        },
        { status: 400 }
      );
    }

    // Must fall inside the season
    const seasonEnd = istDayKey(SEASON.end);
    if (leave_date > seasonEnd) {
      return NextResponse.json(
        { error: "That date is outside the season." },
        { status: 400 }
      );
    }

    const declaredAt = new Date();

    const { error } = await supabaseAdmin.from("leave_days").upsert(
      {
        user_id,
        leave_date,
        season: activeSeason(),
        created_at: declaredAt.toISOString(),
      },
      { onConflict: "user_id,leave_date" }
    );

    if (error) throw error;

    const covered = await syncFlagsForDate(user_id, leave_date, declaredAt);

    return NextResponse.json({ success: true, leave_date, covered });
  } catch (err: any) {
    console.error("Leave POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** DELETE — withdraw a declaration. Body: { leave_date } */
export async function DELETE(req: Request) {
  try {
    const user_id = await currentUser();
    if (!user_id) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { leave_date } = await req.json();
    if (!leave_date) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("leave_days")
      .delete()
      .eq("user_id", user_id)
      .eq("leave_date", leave_date);

    if (error) throw error;

    await syncFlagsForDate(user_id, leave_date, null);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Leave DELETE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
