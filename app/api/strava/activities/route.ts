// app/api/strava/activities/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseClient";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("activities")
      .select(
        `
        id, name, type, distance, moving_time, start_date, strava_url,
        profiles ( id, first_name, last_name, team )
      `
      )
      .order("start_date", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error("Activities API error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
