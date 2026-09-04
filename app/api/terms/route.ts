// app/api/terms/route.ts
import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SEASON } from "@/lib/season";
import { TERMS_VERSION } from "@/lib/terms";

export const dynamic = "force-dynamic";

async function currentUser(): Promise<string | null> {
  const store = await cookies();
  return store.get("user_id")?.value ?? null;
}

/** GET — has the signed-in person accepted the current terms? */
export async function GET() {
  try {
    const user_id = await currentUser();
    if (!user_id) {
      return NextResponse.json({ accepted: false, version: TERMS_VERSION });
    }

    const { data, error } = await supabaseAdmin
      .from("terms_acceptances")
      .select("accepted_at, version")
      .eq("user_id", user_id)
      .eq("season", SEASON.number)
      .eq("version", TERMS_VERSION)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      accepted: !!data,
      acceptedAt: data?.accepted_at ?? null,
      version: TERMS_VERSION,
    });
  } catch (err: any) {
    console.error("Terms GET error:", err);
    // Fail open rather than locking everyone out of the app if this
    // table or query has a problem mid-season.
    return NextResponse.json({ accepted: true, version: TERMS_VERSION });
  }
}

/** POST — record acceptance. */
export async function POST() {
  try {
    const user_id = await currentUser();
    if (!user_id) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const h = await headers();

    // The name is denormalised onto the record on purpose: it should
    // show who agreed at the time, even if the profile changes later.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name")
      .eq("user_id", user_id)
      .maybeSingle();

    const fullName = profile
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
      : null;

    const { error } = await supabaseAdmin.from("terms_acceptances").upsert(
      {
        user_id,
        season: SEASON.number,
        version: TERMS_VERSION,
        accepted_at: new Date().toISOString(),
        user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
        full_name: fullName,
      },
      { onConflict: "user_id,season,version" }
    );

    if (error) throw error;

    return NextResponse.json({ success: true, version: TERMS_VERSION });
  } catch (err: any) {
    console.error("Terms POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
