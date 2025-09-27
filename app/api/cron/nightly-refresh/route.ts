// app/api/cron/nightly-refresh/route.ts
import { NextResponse } from "next/server";
import { refreshAllConnectedUsers } from "@/lib/refreshAll";

export const dynamic = "force-dynamic"; // ensure it runs each time

export async function GET() {
  try {
    const stats = await refreshAllConnectedUsers();
    return NextResponse.json({ ok: true, source: "cron", ...stats });
  } catch (err: any) {
    console.error("Cron refresh error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
