import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const { user_id } = await req.json();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("access_token")
      .eq("user_id", user_id)
      .single();

    if (error || !profile?.access_token) {
      return NextResponse.json({ error: "No access token found" }, { status: 400 });
    }

    return NextResponse.json({ access_token: profile.access_token });
  } catch (err) {
    console.error("Get token error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
