// app/api/weight/add/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * Weight is personal health data, so the user_id comes from the session
 * cookie rather than the request body. The previous version trusted
 * whatever user_id was posted, which meant anyone could write — or with
 * the matching GET, read — someone else's log.
 */
async function currentUser(): Promise<string | null> {
  const store = await cookies();
  return store.get("user_id")?.value ?? null;
}

export async function POST(req: Request) {
  try {
    const user_id = await currentUser();
    if (!user_id) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { date, weight } = await req.json();

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const kg = Number(weight);
    if (!Number.isFinite(kg) || kg <= 0) {
      return NextResponse.json({ error: "Enter a weight" }, { status: 400 });
    }

    // A sanity range, not a judgement — it catches a misplaced decimal
    // point or a value entered in the wrong unit.
    if (kg < 25 || kg > 300) {
      return NextResponse.json(
        { error: "That doesn't look right. Enter your weight in kilograms." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("weight_logs").upsert(
      {
        user_id,
        date,
        weight: Math.round(kg * 10) / 10,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" }
    );

    if (error) throw error;

    return NextResponse.json({ success: true, date, weight: kg });
  } catch (err: any) {
    console.error("Weight add error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** DELETE — remove one day's entry. Body: { date } */
export async function DELETE(req: Request) {
  try {
    const user_id = await currentUser();
    if (!user_id) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { date } = await req.json();
    if (!date) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("weight_logs")
      .delete()
      .eq("user_id", user_id)
      .eq("date", date);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Weight delete error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
