import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("activities")
      .select(
        `
        id,
        name,
        type,
        distance,
        moving_time,
        start_date,
        strava_url,
        is_valid,
        profiles (
          first_name,
          last_name,
          team
        )
      `
      )
      .eq("is_valid", false)
      .order("start_date", { ascending: false });

    if (error) {
      console.error("❌ Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error("❌ API failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
