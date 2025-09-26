// app/api/profile/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    // ✅ Get user_id from cookie
    const cookieStore = await cookies();
    const user_id = cookieStore.get("user_id")?.value;

    if (!user_id) {
      // Return consistent shape instead of hard 401
      return NextResponse.json({ user_id: null });
    }

    // ✅ Fetch profile from Supabase (now includes strava_connected)
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id, first_name, last_name, team, strava_connected")
      .eq("user_id", user_id)
      .single();

    if (error) {
      console.warn("Profile not found in Supabase:", error.message);
      return NextResponse.json({ user_id: null });
    }

    return NextResponse.json(data || { user_id: null });
  } catch (err: any) {
    console.error("Profile API error:", err);
    return NextResponse.json({ error: err.message, user_id: null }, { status: 500 });
  }
}
