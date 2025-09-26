// app/api/restore-session/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    // ✅ Fetch profile from Supabase
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id, first_name, last_name, team")
      .eq("user_id", user_id)
      .single();

    if (error) {
      console.warn("Profile not found while restoring:", error.message);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // ✅ Re-set cookie
    const res = NextResponse.json(data || { user_id });
    res.cookies.set("user_id", user_id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 90, // 90 days
    });

    return res;
  } catch (err: any) {
    console.error("Restore-session API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
