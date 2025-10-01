import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// ✅ POST → toggle or switch reaction
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

    const { activity_id, reaction_type, user_id } = body;
    if (!activity_id || !reaction_type || !user_id) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // 1. Check if user already reacted on this activity
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("activity_reactions")
      .select("id, reaction_type")
      .eq("activity_id", activity_id)
      .eq("user_id", user_id)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Reaction fetch error:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (existing) {
      if (existing.reaction_type === reaction_type) {
        // ✅ Same reaction clicked again → remove (toggle off)
        await supabaseAdmin.from("activity_reactions").delete().eq("id", existing.id);
        return NextResponse.json({ ok: true, action: "removed" });
      } else {
        // ✅ Different reaction → update existing
        const { error: updateError } = await supabaseAdmin
          .from("activity_reactions")
          .update({ reaction_type })
          .eq("id", existing.id);

        if (updateError) {
          console.error("Reaction update error:", updateError);
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }
        return NextResponse.json({ ok: true, action: "updated" });
      }
    }

    // ✅ No reaction yet → insert new
    const { error: insertError } = await supabaseAdmin
      .from("activity_reactions")
      .insert([{ activity_id, user_id, reaction_type }]);

    if (insertError) {
      console.error("Reaction insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, action: "inserted" });
  } catch (err: any) {
    console.error("Reaction POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ GET → return aggregated counts
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const activity_id = searchParams.get("activity_id");

    let query = supabaseAdmin
      .from("activity_reactions")
      .select("activity_id, reaction_type");

    if (activity_id) {
      query = query.eq("activity_id", activity_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching reactions:", error);
      return NextResponse.json([]);
    }

    // ✅ Aggregate manually
    const reactionMap: Record<string, { like: number; love: number; fire: number }> = {};

    (data ?? []).forEach((r) => {
      if (!reactionMap[r.activity_id]) {
        reactionMap[r.activity_id] = { like: 0, love: 0, fire: 0 };
      }
      reactionMap[r.activity_id][r.reaction_type] += 1;
    });

    // Flatten to array
    const result = Object.entries(reactionMap).flatMap(([activity_id, counts]) =>
      Object.entries(counts).map(([reaction_type, count]) => ({
        activity_id,
        reaction_type,
        count,
      }))
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Reaction GET error:", err);
    return NextResponse.json([]);
  }
}
