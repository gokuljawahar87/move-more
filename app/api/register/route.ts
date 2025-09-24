// app/api/register/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, first_name, last_name, team } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: "Missing user_id" },
        { status: 400 }
      );
    }

    // ✅ Insert or update profile in Supabase
    const { error } = await supabaseAdmin.from("profiles").upsert(
      {
        user_id,
        first_name,
        last_name,
        team,
      },
      { onConflict: "user_id" }
    );

    if (error) throw error;

    // ✅ Prepare response
    const res = NextResponse.json({ success: true });

    // ✅ Attach cookie (session persistence)
    res.cookies.set("user_id", user_id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch (err: any) {
    console.error("Register API error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
