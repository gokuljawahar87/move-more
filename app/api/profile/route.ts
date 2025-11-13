// app/api/profile/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const user_id = cookieStore.get("user_id")?.value;

    if (!user_id) {
      return NextResponse.json({ user_id: null });
    }

    // Check employee_master first
    const { data: emp, error: empErr } = await supabaseAdmin
      .from("employee_master")
      .select("user_id")
      .eq("user_id", user_id)
      .maybeSingle();

    if (empErr || !emp) {
      console.warn("❗ Not in employee_master:", user_id);
      return NextResponse.json({ user_id, not_employee: true });
    }

    // Now fetch profile
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id, first_name, last_name, team, strava_connected")
      .eq("user_id", user_id)
      .single();

    if (error) {
      console.warn("Profile not found:", error.message);
      return NextResponse.json({ user_id, not_employee: false, no_profile: true });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Profile API error:", err);
    return NextResponse.json(
      { error: err.message, user_id: null },
      { status: 500 }
    );
  }
}
