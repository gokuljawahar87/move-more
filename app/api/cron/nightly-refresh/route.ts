import { NextResponse } from "next/server";
import { refreshAllConnectedUsers } from "@/lib/refreshAll";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await refreshAllConnectedUsers();

    await supabase.from("sync_metadata").upsert({
      id: 1,
      last_refreshed_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, source: "cron", ...stats });
  } catch (err: any) {
    console.error("Cron refresh error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
