// app/api/sync-status/route.ts
//
// When the master Strava sync last ran. The refresh route writes this
// row on every successful run, so a stale value here is a useful early
// warning that the scheduled job has stopped firing.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("sync_metadata")
      .select("last_refreshed_at")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      lastRefreshedAt: data?.last_refreshed_at ?? null,
    });
  } catch (err: any) {
    console.error("Sync status error:", err);
    return NextResponse.json({ lastRefreshedAt: null });
  }
}
