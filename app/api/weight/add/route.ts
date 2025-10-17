import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, date, weight } = body;

    if (!user_id || !date || !weight) {
      return NextResponse.json(
        { error: "Missing required fields: user_id, date, or weight" },
        { status: 400 }
      );
    }

    const payload = {
      user_id,
      date,
      weight,
      updated_at: new Date().toISOString(),
    };

    // ✅ FIXED: onConflict must be a comma-separated string, not an array
    const { error } = await supabaseAdmin
      .from("weight_logs")
      .upsert(payload, { onConflict: "user_id,date" });

    if (error) {
      console.error("❌ Error inserting weight log:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ Weight logged for ${user_id} on ${date}: ${weight} kg`);

    return NextResponse.json({
      success: true,
      message: "Weight log added successfully",
    });
  } catch (err: any) {
    console.error("❌ Unexpected error in /api/weight/add:", err);
    return NextResponse.json(
      { error: err.message || "Failed to add weight log" },
      { status: 500 }
    );
  }
}
