import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  try {
    const cookieStore = cookies();
    const user_id = cookieStore.get("user_id")?.value;

    if (!user_id) {
      return NextResponse.json({ error: "No user session found" }, { status: 401 });
    }

    // Fetch profile from Supabase
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, email, team, strava_connected")
      .eq("user_id", user_id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Profile fetch error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
