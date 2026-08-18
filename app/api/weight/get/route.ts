// app/api/weight/get/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * Returns the signed-in person's own weight log — nobody else's.
 *
 * The user_id deliberately comes from the cookie, not a query
 * parameter. Weight is personal health data and is never shown on any
 * leaderboard or team view.
 */
export async function GET() {
  try {
    const store = await cookies();
    const user_id = store.get("user_id")?.value;

    if (!user_id) {
      return NextResponse.json({ entries: [] });
    }

    const { data, error } = await supabaseAdmin
      .from("weight_logs")
      .select("date, weight")
      .eq("user_id", user_id)
      .order("date", { ascending: true });

    if (error) throw error;

    const entries = (data ?? []).map((r: any) => ({
      date: r.date,
      weight: Number(r.weight),
    }));

    const first = entries[0]?.weight ?? null;
    const latest = entries[entries.length - 1]?.weight ?? null;

    return NextResponse.json({
      entries,
      first,
      latest,
      change: first != null && latest != null ? latest - first : null,
    });
  } catch (err: any) {
    console.error("Weight get error:", err);
    return NextResponse.json({ error: err.message, entries: [] }, { status: 500 });
  }
}
