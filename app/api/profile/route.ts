import { NextResponse } from "next/server";
import supabase from "@/utils/supabaseClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", user_id)
      .single();

    if (error || !data) {
      console.error("❌ Supabase fetch error:", error);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error("❌ /api/profile error:", err.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
