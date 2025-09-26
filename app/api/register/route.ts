// app/api/register/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, first_name, last_name } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: "Missing user_id" },
        { status: 400 }
      );
    }

    // ✅ Look up team from employee_master
    const { data: empData, error: empError } = await supabaseAdmin
      .from("employee_master")
      .select("team")
      .eq("user_id", user_id)
      .single();

    if (empError) {
      console.warn("Team not found in employee_master:", empError.message);
    }

    const team = empData?.team ?? null;

    // ✅ Insert or update profile in Supabase
    const { error } = await supabaseAdmin.from("profiles").upsert(
      {
        user_id,
        first_name,
        last_name,
        team, // pulled from employee_master
      },
      { onConflict: "user_id" }
    );

    if (error) throw error;

    // ✅ Prepare response
    const res = NextResponse.json({ success: true });

    // ✅ Attach cookie (persistent session)
    res.cookies.set("user_id", user_id, {
      httpOnly: true,
      sameSite: "lax", // best for first-party apps
      secure: process.env.NODE_ENV === "production", // required for HTTPS
      path: "/",
      maxAge: 60 * 60 * 24 * 90, // 90 days
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
