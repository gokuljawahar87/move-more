// app/api/admin/announce/route.ts
//
// Post an announcement, or retire one. Everyone sees it once, as a
// popup, the next time they open the app.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdmin } from "@/lib/adminAuth";
import { SEASON } from "@/lib/season";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data } = await supabaseAdmin
    .from("announcements")
    .select("id, kicker, title, body, active, created_at")
    .eq("season", SEASON.number)
    .order("created_at", { ascending: false });

  // How many have seen each one, so you can tell whether it landed
  const { data: seen } = await supabaseAdmin
    .from("popup_seen")
    .select("key")
    .eq("season", SEASON.number)
    .eq("kind", "announcement");

  const counts = new Map<string, number>();
  for (const s of seen ?? []) {
    counts.set(String(s.key), (counts.get(String(s.key)) ?? 0) + 1);
  }

  return NextResponse.json({
    announcements: (data ?? []).map((a: any) => ({
      ...a,
      seenBy: counts.get(String(a.id)) ?? 0,
    })),
  });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const { kicker, title, body } = await req.json();
    if (!title || !body) {
      return NextResponse.json(
        { error: "A title and a message are both needed." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("announcements").insert({
      season: SEASON.number,
      kicker: kicker || "Announcement",
      title,
      body,
      active: true,
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** DELETE — retire an announcement so it stops appearing. */
export async function DELETE(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    const { error } = await supabaseAdmin
      .from("announcements")
      .update({ active: false })
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
