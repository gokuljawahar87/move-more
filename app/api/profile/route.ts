// app/api/profile/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    // ✅ Await cookies() in Next.js 15
    const cookieStore = await cookies();
    const user_id = cookieStore.get("user_id")?.value;

    if (!user_id) {
      return NextResponse.json(
        { error: "No user session found" },
        { status: 401 }
      );
    }

    // ✅ Fetch profile from Supabase
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id, first_name, last_name, team")
      .eq("user_id", user_id)
      .single();

    if (error) throw error;

    return NextResponse.json(data || {});
  } catch (err: any) {
    console.error("Profile API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
