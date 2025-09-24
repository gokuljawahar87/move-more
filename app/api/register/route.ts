import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // ✅ fixed import
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { user_id, first_name, last_name, email } = await req.json();

    if (!user_id || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1) Lookup employee_master for team
    const { data: emp, error: empError } = await supabaseAdmin
      .from("employee_master")
      .select("team")
      .eq("user_id", user_id)
      .single();

    if (empError) {
      console.error("Error fetching team:", empError.message);
      return NextResponse.json(
        { error: "Error fetching team from employee_master" },
        { status: 500 }
      );
    }

    const team = emp?.team || null;

    // 2) Insert profile into `profiles`
    const { error: insertError } = await supabaseAdmin.from("profiles").upsert(
      {
        user_id,
        first_name,
        last_name,
        email,
        team,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id" } // ✅ ensures we don’t create duplicates
    );

    if (insertError) {
      console.error("Insert error:", insertError.message);
      return NextResponse.json(
        { error: "Error saving profile" },
        { status: 500 }
      );
    }

    // 3) Save user_id into cookie (for session persistence)
    cookies().set("user_id", user_id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return NextResponse.json({ message: "Registration successful" }, { status: 200 });
  } catch (err) {
    console.error("Unexpected register error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
