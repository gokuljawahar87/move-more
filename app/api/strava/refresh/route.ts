import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const cookieStore = cookies();
  const user_id = cookieStore.get("user_id")?.value;

  if (!user_id) {
    return NextResponse.json({ error: "No user session found" }, { status: 401 });
  }

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("refresh_token")
    .eq("user_id", user_id)
    .single();

  if (!profile?.refresh_token) {
    return NextResponse.json({ error: "No refresh token found" }, { status: 404 });
  }

  try {
    const refreshResponse = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: profile.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const refreshData = await refreshResponse.json();

    if (!refreshResponse.ok) {
      console.error("Refresh token error:", refreshData);
      return NextResponse.json({ error: "Failed to refresh token" }, { status: 500 });
    }

    await supabase.from("profiles").update({
      access_token: refreshData.access_token,
      refresh_token: refreshData.refresh_token,
      token_expires_at: refreshData.expires_at,
    }).eq("user_id", user_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected refresh error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
